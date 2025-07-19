import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { containerVariants, itemVariants } from "../animations/pageAnimations";
import { generateAISummaryStream, APINewsArticle } from "../services/api";
import { getArticleLink } from "../services/api";
import CompanyPeriodReportButton from "../components/reports/CompanyPeriodReportButton";
import EntitySidebar from "../components/category/EntitySidebar";
import NewsTimeline from "../components/category/NewsTimeline";
import AISummarySidebar from "../components/category/AISummarySidebar";
import { Entity, CategoryInfo } from "../types";

// 기사 참조 정보 인터페이스 추가
interface ArticleReference {
  ref_id: string;
  title: string;
  provider: string;
  byline: string;
  published_at: string;
  url?: string;
  relevance_score: number;
}

// 확장된 AI 요약 응답 인터페이스 (로컬에서 사용)
interface ExtendedAISummaryResponse {
  title: string;
  summary: string;
  type: string;
  key_points?: string[];
  key_quotes?: Array<{
    source: string;
    quote: string;
  }>;
  key_data?: Array<{
    metric: string;
    value: string;
    context: string;
  }>;
  articles_analyzed: number;
  generated_at: string;
  model_used: string;
  article_references?: ArticleReference[];
}

// 컴포넌트용 NewsArticle 타입 (NewsTimeline 컴포넌트와 호환)
interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  provider: string;
  provider_code?: string;
  url: string;
  category: string;
  byline: string;
  images: string[];
  images_caption?: string;
  published_at?: string;
}

interface TimelineItem {
  date: string;
  articles: NewsArticle[];
  count: number;
}

// API 응답을 컴포넌트용 타입으로 변환하는 헬퍼 함수
const convertAPINewsArticle = (apiArticle: APINewsArticle): NewsArticle => ({
  id: apiArticle.id,
  title: apiArticle.title,
  summary: apiArticle.summary,
  content: apiArticle.content,
  provider: apiArticle.provider,
  provider_code: apiArticle.provider_code,
  url: apiArticle.url,
  category: Array.isArray(apiArticle.category)
    ? apiArticle.category.join(", ")
    : apiArticle.category,
  byline: apiArticle.byline,
  images: apiArticle.images,
  images_caption: apiArticle.images_caption,
  published_at: apiArticle.published_at,
});

const CategoryDetailPage: React.FC = () => {
  const { categoryKey } = useParams<{ categoryKey: string }>();
  const navigate = useNavigate();

  // 상태 관리
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"seoul" | "all">("all");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<
    Map<string, NewsArticle>
  >(new Map());
  const [summaryResult, setSummaryResult] =
    useState<ExtendedAISummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummarySidebar, setShowSummarySidebar] = useState(false);

  // 스트리밍 관련 상태
  const [streamingStep, setStreamingStep] = useState<string>("");
  const [streamingProgress, setStreamingProgress] = useState<number>(0);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [articleReferences, setArticleReferences] = useState<
    ArticleReference[]
  >([]);

  // 사이드바 크기 조절 관련 상태
  const [sidebarWidth, setSidebarWidth] = useState(384); // 기본 w-96 (384px)
  const [isResizing, setIsResizing] = useState(false);

  // 초기화 함수
  const handleReset = () => {
    setSelectedArticles(new Map());
    setSummaryResult(null);
    setStreamingContent("");
    setArticleReferences([]);
    setIsGeneratingSummary(false);
  };

  // 카테고리 정보 및 엔티티 목록 불러오기
  useEffect(() => {
    if (categoryKey) {
      fetchCategoryData();
    }
  }, [categoryKey]);

  // 선택된 엔티티의 뉴스 불러오기
  useEffect(() => {
    if (selectedEntity) {
      fetchEntityNews();
    }
  }, [selectedEntity, activeTab]);

  const fetchCategoryData = async () => {
    setIsLoadingEntities(true);
    setError(null);

    try {
      // 카테고리 정보 가져오기
      const categoriesRes = await fetch("/api/entity/categories");
      const categoriesData = await categoriesRes.json();
      const category = categoriesData.categories.find(
        (c: any) => c.key === categoryKey
      );

      if (category) {
        setCategoryInfo({
          key: category.key,
          name: category.name,
          count: category.count,
        });
      }

      // 엔티티 목록 가져오기
      const response = await fetch(`/api/entity/category/${categoryKey}`);
      if (!response.ok)
        throw new Error("엔티티 목록을 불러오는데 실패했습니다");

      const data = await response.json();
      setEntities(data.entities);

      // 첫 번째 엔티티 자동 선택
      if (data.entities.length > 0) {
        setSelectedEntity(data.entities[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoadingEntities(false);
    }
  };

  const fetchEntityNews = async () => {
    if (!selectedEntity || !categoryKey) return;

    setIsLoadingNews(true);
    setError(null);

    try {
      const provider = activeTab === "seoul" ? ["서울경제"] : undefined;
      const params = new URLSearchParams({
        category: categoryKey,
        exclude_prism: "false",
        ...(provider && { provider: provider.join(",") }),
      });

      const url = `/api/entity/news/${selectedEntity.id}?${params}`;
      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `뉴스를 불러오는데 실패했습니다 (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      // API 응답을 컴포넌트용 타입으로 변환
      const convertedTimeline =
        data.timeline?.map((timelineItem: any) => ({
          ...timelineItem,
          articles: timelineItem.articles.map((article: APINewsArticle) =>
            convertAPINewsArticle(article)
          ),
        })) || [];

      setTimeline(convertedTimeline);
    } catch (err) {
      console.error("fetchEntityNews error:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoadingNews(false);
    }
  };

  // 엔티티 검색 필터링
  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.variants.some((v) =>
        v.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // 뉴스 상세 보기
  const viewArticleDetail = (article: NewsArticle) => {
    // 전체 언론사 탭에서는 저작권 준수를 위해 외부 링크로 이동
    if (activeTab === "all") {
      window.open(getArticleLink(article), "_blank");
    } else {
      // 서울경제 탭에서는 내부 페이지로 이동
      navigate(`/news/${article.id}`);
    }
  };

  // 기사 선택/해제
  const toggleArticleSelection = (article: NewsArticle) => {
    const newSelected = new Map(selectedArticles);

    if (newSelected.has(article.id)) {
      newSelected.delete(article.id);
    } else if (newSelected.size < 5) {
      newSelected.set(article.id, article);
    }

    setSelectedArticles(newSelected);
  };

  // 기사 선택 해제 (AI 사이드바에서 사용)
  const removeArticleFromSelection = (articleId: string) => {
    const newSelected = new Map(selectedArticles);
    newSelected.delete(articleId);
    setSelectedArticles(newSelected);
  };

  // AI 요약 생성 - 스트리밍 버전
  const handleGenerateSummary = async () => {
    console.log("handleGenerateSummary 호출됨", selectedArticles.size);

    if (selectedArticles.size === 0) {
      console.warn("선택된 기사가 없습니다");
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryResult(null);
    setStreamingStep("");
    setStreamingProgress(0);
    setStreamingContent("");
    setArticleReferences([]);

    // 사이드바가 닫혀있으면 열기
    if (!showSummarySidebar) {
      setShowSummarySidebar(true);
    }

    try {
      console.log("API 호출 시작:", Array.from(selectedArticles.keys()));

      await generateAISummaryStream(
        { news_ids: Array.from(selectedArticles.keys()) },
        // onProgress
        (data) => {
          console.log("Progress:", data);
          setStreamingStep(data.step);
          setStreamingProgress(data.progress);
        },
        // onChunk
        (chunk) => {
          console.log("Chunk received:", chunk);
          setStreamingContent((prev) => prev + chunk);
        },
        // onComplete
        (result) => {
          console.log("Complete:", result);
          setSummaryResult(result);
          setArticleReferences(result.article_references || []);
          setIsGeneratingSummary(false);
        },
        // onError
        (error) => {
          console.error("Stream error:", error);
          setError(error);
          setIsGeneratingSummary(false);
        }
      );
    } catch (err) {
      console.error("Catch error:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
      setIsGeneratingSummary(false);
    }
  };

  // 요약 텍스트에서 기사 참조를 링크로 변환
  const renderTextWithReferences = (text: string) => {
    if (!articleReferences.length) return text;

    // [ref1], [ref2] 등의 패턴을 찾아서 클릭 가능한 링크로 변환
    const refPattern = /\[ref(\d+)\]/g;
    const parts = text.split(refPattern);

    return parts.map((part, index) => {
      // 숫자인 경우 (ref 번호)
      if (index % 2 === 1) {
        const refNumber = parseInt(part);
        const ref = articleReferences.find(
          (r) => r.ref_id === `ref${refNumber}`
        );

        if (ref) {
          return (
            <button
              key={index}
              onClick={() => {
                // 기사 참조 섹션으로 스크롤
                const element = document.getElementById(`ref-${ref.ref_id}`);
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // 하이라이트 효과
                  element.classList.add(
                    "ring-2",
                    "ring-primary-300",
                    "ring-opacity-75"
                  );
                  setTimeout(() => {
                    element.classList.remove(
                      "ring-2",
                      "ring-primary-300",
                      "ring-opacity-75"
                    );
                  }, 2000);
                }
              }}
              className="inline-flex items-center px-2 py-1 mx-1 text-xs font-mono bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
              title={`${ref.title} (${ref.provider})`}
            >
              [ref{refNumber}]
            </button>
          );
        }
        return `[ref${refNumber}]`;
      }

      // 일반 텍스트
      return part;
    });
  };

  // 사이드바 크기 조절 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300; // 최소 너비
    const maxWidth = 800; // 최대 너비

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // 마우스 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* EntitySidebar 컴포넌트 사용 */}
      <EntitySidebar
        categoryKey={categoryKey || ""}
        categoryInfo={categoryInfo}
        entities={entities}
        selectedEntity={selectedEntity}
        isLoadingEntities={isLoadingEntities}
        searchQuery={searchQuery}
        filteredEntities={filteredEntities}
        onEntitySelect={setSelectedEntity}
        onSearchChange={setSearchQuery}
      />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-hidden">
        {selectedEntity ? (
          <div className="h-full flex flex-col">
            {/* 상단 헤더 */}
            <motion.div
              variants={itemVariants}
              className="p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold truncate">
                      {selectedEntity.name}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span>{selectedEntity.code}</span>
                      <span>·</span>
                      <span>{selectedEntity.category_name}</span>
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="ml-2 text-primary-600 hover:text-primary-700 whitespace-nowrap"
                      >
                        {showDetails ? "접기" : "상세정보"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* 기간별 레포트 생성 버튼 */}
                  <div className="relative">
                    <CompanyPeriodReportButton
                      companyName={selectedEntity.name}
                      companyCode={selectedEntity.code}
                    />
                  </div>

                  {/* AI 요약 토글 버튼 - 서울경제 탭에서만 표시 */}
                  {activeTab === "seoul" && (
                    <motion.button
                      onClick={() => setShowSummarySidebar((prev) => !prev)}
                      disabled={selectedArticles.size === 0}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                        selectedArticles.size > 0
                          ? "bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                      }`}
                      whileHover={
                        selectedArticles.size > 0 ? { scale: 1.02 } : {}
                      }
                      whileTap={
                        selectedArticles.size > 0 ? { scale: 0.98 } : {}
                      }
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <span className="hidden sm:inline">
                        {selectedArticles.size > 0
                          ? `${selectedArticles.size}개 기사 요약`
                          : "기사를 선택하세요"}
                      </span>
                    </motion.button>
                  )}
                </div>
              </div>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    검색 동의어:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntity.variants.map((variant, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                      >
                        {variant}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 탭 선택 */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "all"
                      ? "bg-primary-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  전체 언론사
                </button>
                <button
                  onClick={() => setActiveTab("seoul")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "seoul"
                      ? "bg-primary-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  서울경제
                </button>
              </div>

              {/* 선택된 기사 고정 표시 */}
              {selectedArticles.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  variants={itemVariants}
                  className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                      선택된 기사 ({selectedArticles.size}/5)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                      >
                        전체 초기화
                      </button>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={selectedArticles.size === 0}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedArticles.size > 0
                            ? "bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        요약 생성
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 max-h-32 overflow-y-auto">
                    {Array.from(selectedArticles.values()).map(
                      (article, index) => (
                        <div
                          key={article.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded text-sm"
                        >
                          <span className="truncate mr-2">{article.title}</span>
                          <button
                            onClick={() =>
                              removeArticleFromSelection(article.id)
                            }
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* 뉴스 타임라인 */}
            <div className="flex-1 overflow-y-auto p-6">
              <NewsTimeline
                timeline={timeline}
                isLoading={isLoadingNews}
                error={error}
                activeTab={activeTab}
                selectedArticles={selectedArticles}
                onToggleArticleSelection={toggleArticleSelection}
                onViewArticleDetail={viewArticleDetail}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">종목을 선택해주세요</p>
          </div>
        )}
      </main>

      {/* AI 요약 사이드바 */}
      <AnimatePresence>
        <AISummarySidebar
          showSidebar={showSummarySidebar}
          sidebarWidth={sidebarWidth}
          selectedArticles={selectedArticles}
          summaryResult={summaryResult}
          isGeneratingSummary={isGeneratingSummary}
          streamingStep={streamingStep}
          streamingProgress={streamingProgress}
          streamingContent={streamingContent}
          articleReferences={articleReferences}
          onReset={handleReset}
          onGenerateSummary={handleGenerateSummary}
          onRemoveArticle={removeArticleFromSelection}
          onToggleSidebar={() => setShowSummarySidebar(false)}
          onMouseDown={handleMouseDown}
          isResizing={isResizing}
        />
      </AnimatePresence>
    </motion.div>
  );
};

export default CategoryDetailPage;
