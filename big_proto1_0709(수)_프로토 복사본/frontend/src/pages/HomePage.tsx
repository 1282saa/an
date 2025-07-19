import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLatestNews } from "../services/api";
import { LatestNewsResponse } from "../types";
import { containerVariants } from "../animations/pageAnimations";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ChatInterface from "../components/chat/ChatInterface";
import ConciergeInterface from "../components/concierge/ConciergeInterface";
import Tab from "../components/home/Tab";
import NewsCard from "../components/home/NewsCard";
import IssueCard from "../components/home/IssueCard";
import KeywordTag from "../components/home/KeywordTag";

/**
 * 모던하고 세련된 홈페이지 컴포넌트
 */
const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("홈");
  const [latestNewsData, setLatestNewsData] =
    useState<LatestNewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 대화형 검색 상태
  const [showChatInterface, setShowChatInterface] = useState(false);

  useEffect(() => {
    const fetchLatestNews = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getLatestNews();
        setLatestNewsData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
        );
        // 개발 중 더미 데이터 사용 (이슈 랭킹 구조)
        setLatestNewsData({
          today_issues: [
            {
              rank: 1,
              title: "반도체 수출 증가",
              count: 42,
              related_news: ["cluster_001", "cluster_002"],
            },
            {
              rank: 2,
              title: "AI 스타트업 투자",
              count: 38,
              related_news: ["cluster_003", "cluster_004"],
            },
            {
              rank: 3,
              title: "디지털 금융 혁신",
              count: 25,
              related_news: ["cluster_005"],
            },
            {
              rank: 4,
              title: "탄소중립 정책",
              count: 20,
              related_news: ["cluster_006"],
            },
            {
              rank: 5,
              title: "K-콘텐츠 해외진출",
              count: 18,
              related_news: ["cluster_007"],
            },
          ],
          popular_keywords: [
            { rank: 1, keyword: "생성 AI", count: 1250, trend: "up" },
            { rank: 2, keyword: "ESG 경영", count: 980, trend: "up" },
            { rank: 3, keyword: "메타버스", count: 850, trend: "stable" },
            { rank: 4, keyword: "탄소중립", count: 720, trend: "up" },
            { rank: 5, keyword: "디지털전환", count: 680, trend: "stable" },
            { rank: 6, keyword: "비대면 금융", count: 550, trend: "down" },
            { rank: 7, keyword: "자동차 전동화", count: 480, trend: "up" },
          ],
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLatestNews();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      );
    }

    if (!latestNewsData) {
      return <ErrorMessage message={error} />;
    }

    switch (activeTab) {
      case "홈":
        return (
          <motion.div
            key="home-concierge"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="h-[calc(100vh-280px)]"
          >
            {/* AI 컨시어지 채팅창만 표시 */}
            <div className="h-full">
              <ConciergeInterface />
            </div>
          </motion.div>
        );
      case "최신 뉴스":
        return (
          <motion.div
            key="latest-news"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6 min-h-[calc(100vh-280px)]"
          >
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                  서울경제 헤드라인
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                서울경제신문의 최신 헤드라인 뉴스를 실시간으로 확인하세요
              </p>
            </div>

            {/* iframe 컨테이너 - 다크모드 영향 최소화 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <iframe
                src="https://www.sedaily.com/News/HeadLine"
                title="서울경제 헤드라인 뉴스"
                className="w-full h-[700px] border-0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  <a
                    href="https://www.sedaily.com/News/HeadLine"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 hover:text-blue-600 transition-colors font-medium"
                  >
                    <span>서울경제신문에서 더 많은 뉴스 보기</span>
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
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        );
      case "주요 이슈":
        return (
          <motion.div
            key="issues"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8 min-h-[calc(100vh-280px)]"
          >
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                  이슈 랭킹
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                오늘 가장 주목받는 이슈들을 점수 순으로 보여드립니다
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestNewsData?.today_issues?.length > 0 ? (
                latestNewsData.today_issues.map((item, index) => (
                  <motion.div
                    key={item.topic_id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <IssueCard item={item} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <svg
                      className="w-16 h-16 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                    오늘의 주요 이슈를 불러오고 있습니다...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        exit="hidden"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl h-full"
      >
        {/* 간소화된 헤더 섹션 */}
        <div className="text-center mb-8 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              AI Nova
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              빅카인즈 기반 스마트 뉴스 분석 플랫폼
            </p>
          </motion.div>
        </div>

        {/* 탭 네비게이션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {["홈", "최신 뉴스", "주요 이슈"].map((tab) => (
              <Tab
                key={tab}
                label={tab}
                isActive={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>
        </motion.div>

        {/* 대화형 검색 인터페이스 */}
        <AnimatePresence>
          {showChatInterface && (
            <ChatInterface onClose={() => setShowChatInterface(false)} />
          )}
        </AnimatePresence>

        {/* 탭 컨텐츠 */}
        <div>
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;
