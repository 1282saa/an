import React from "react";
import { motion } from "framer-motion";
import ThinkingProgress from "../ai/ThinkingProgress";
import { getArticleLink } from "../../services/api";

// 타입 정의
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

interface ArticleReference {
  ref_id: string;
  title: string;
  provider: string;
  byline: string;
  published_at: string;
  url?: string;
  relevance_score: number;
}

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

interface AISummarySidebarProps {
  showSidebar: boolean;
  sidebarWidth: number;
  selectedArticles: Map<string, NewsArticle>;
  summaryResult: ExtendedAISummaryResponse | null;
  isGeneratingSummary: boolean;
  streamingStep: string;
  streamingProgress: number;
  streamingContent: string;
  articleReferences: ArticleReference[];
  onReset: () => void;
  onGenerateSummary: () => void;
  onRemoveArticle: (articleId: string) => void;
  onToggleSidebar: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

const AISummarySidebar: React.FC<AISummarySidebarProps> = ({
  showSidebar,
  sidebarWidth,
  selectedArticles,
  summaryResult,
  isGeneratingSummary,
  streamingStep,
  streamingProgress,
  streamingContent,
  articleReferences,
  onReset,
  onGenerateSummary,
  onRemoveArticle,
  onToggleSidebar,
  onMouseDown,
  isResizing,
}) => {
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

  if (!showSidebar) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.3 }}
      className="fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-50 flex"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* 크기 조절 핸들 */}
      <div
        className={`w-1 bg-gray-300 dark:bg-gray-600 hover:bg-primary-400 dark:hover:bg-primary-600 cursor-col-resize transition-colors ${
          isResizing ? "bg-primary-500" : ""
        }`}
        onMouseDown={onMouseDown}
        style={{ cursor: "col-resize" }}
      />

      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">AI 요약 분석</h2>
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="h-full overflow-y-auto">
          <div
            className="pl-8 pr-6 py-6 space-y-6"
            style={{
              fontSize:
                sidebarWidth > 500
                  ? "16px"
                  : sidebarWidth > 400
                  ? "14px"
                  : "12px",
            }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {summaryResult ? "통합 인사이트 보고서" : "AI 요약 분석"}
              </h2>
              <div className="flex items-center gap-2">
                {(selectedArticles.size > 0 || summaryResult) && (
                  <button
                    onClick={onReset}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="전체 초기화"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedArticles.size > 0
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-500">
                  {selectedArticles.size}/5
                </span>
              </div>
            </div>

            {!summaryResult && !isGeneratingSummary && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold mb-2">선택된 기사</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedArticles.size > 0 ? (
                      Array.from(selectedArticles.values()).map(
                        (article, index) => (
                          <div
                            key={article.id}
                            className="group p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0 mr-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                  {article.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {article.provider} · {article.byline}
                                </p>
                              </div>
                              <button
                                onClick={() => onRemoveArticle(article.id)}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
                                title="선택 해제"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-6">
                        분석할 기사를 선택해주세요
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={onGenerateSummary}
                    disabled={selectedArticles.size === 0}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      selectedArticles.size > 0
                        ? "bg-primary-500 hover:bg-primary-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
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
                    AI 요약 생성하기
                  </motion.button>
                </div>
              </>
            )}

            {isGeneratingSummary && (
              <div className="py-6 space-y-6">
                {/* ThinkingProgress 컴포넌트 사용 */}
                <ThinkingProgress
                  step={streamingStep}
                  progress={streamingProgress}
                  type="thinking"
                  isGenerating={isGeneratingSummary}
                />

                {/* 실시간 스트리밍 텍스트 출력 */}
                {streamingContent && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      실시간 생성 내용:
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                        {streamingContent}
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-2 h-4 bg-primary-500 ml-1"
                        />
                      </pre>
                    </div>
                  </div>
                )}

                {/* 기사 참조 정보 (실시간 업데이트) */}
                {articleReferences.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      참조 기사 ({articleReferences.length}개):
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {articleReferences.map((ref, index) => (
                        <div
                          key={ref.ref_id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                        >
                          <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                            [{ref.ref_id}] {ref.title}
                          </p>
                          <p className="text-gray-500 mt-1">
                            {ref.provider} · {ref.byline}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {summaryResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {summaryResult.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {renderTextWithReferences(summaryResult.summary)}
                  </p>
                </div>

                {summaryResult.key_points &&
                  summaryResult.key_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">핵심 포인트</h4>
                      <ul className="space-y-2">
                        {summaryResult.key_points.map(
                          (point: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary-500 mr-2">•</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {renderTextWithReferences(point)}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {summaryResult.key_quotes &&
                  summaryResult.key_quotes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">주요 인용</h4>
                      <div className="space-y-3">
                        {summaryResult.key_quotes.map(
                          (
                            quote: { source: string; quote: string },
                            index: number
                          ) => (
                            <blockquote
                              key={index}
                              className="border-l-4 border-primary-300 dark:border-primary-600 pl-4 italic"
                            >
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                "{renderTextWithReferences(quote.quote)}"
                              </p>
                              <cite className="text-sm text-gray-500 not-italic">
                                — {quote.source}
                              </cite>
                            </blockquote>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {summaryResult.key_data &&
                  summaryResult.key_data.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">주요 수치</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {summaryResult.key_data.map(
                          (
                            data: {
                              metric: string;
                              value: string;
                              context: string;
                            },
                            index: number
                          ) => (
                            <div
                              key={index}
                              className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {data.metric}
                              </p>
                              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                {data.value}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {data.context}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* 기사 참조 섹션 */}
                {summaryResult.article_references &&
                  summaryResult.article_references.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">참조 기사</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {summaryResult.article_references.map(
                          (ref: ArticleReference, index: number) => (
                            <motion.div
                              key={ref.ref_id}
                              id={`ref-${ref.ref_id}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 mr-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-mono bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                                      {ref.ref_id}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      관련도:{" "}
                                      {Math.round(ref.relevance_score * 100)}%
                                    </span>
                                  </div>
                                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                                    {ref.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      {ref.provider}
                                    </span>
                                    <span>· {ref.byline}</span>
                                    <span>
                                      ·{" "}
                                      {new Date(
                                        ref.published_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() =>
                                    window.open(getArticleLink(ref), "_blank")
                                  }
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
                                  title="기사 원문 보기"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </motion.div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    {summaryResult.articles_analyzed}개 기사 분석 완료 ·{" "}
                    {new Date(summaryResult.generated_at).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AISummarySidebar;
