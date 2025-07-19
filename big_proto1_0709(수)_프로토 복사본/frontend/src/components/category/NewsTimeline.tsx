import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import { itemVariants } from "../../animations/pageAnimations";
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

interface TimelineItem {
  date: string;
  articles: NewsArticle[];
  count: number;
}

interface NewsTimelineProps {
  timeline: TimelineItem[];
  isLoading: boolean;
  error: string | null;
  activeTab: "seoul" | "all";
  selectedArticles: Map<string, NewsArticle>;
  onToggleArticleSelection: (article: NewsArticle) => void;
  onViewArticleDetail: (article: NewsArticle) => void;
}

const NewsTimeline: React.FC<NewsTimelineProps> = ({
  timeline,
  isLoading,
  error,
  activeTab,
  selectedArticles,
  onToggleArticleSelection,
  onViewArticleDetail,
}) => {
  return (
    <motion.div variants={itemVariants}>
      <h2 className="text-2xl font-bold mb-6">뉴스 타임라인</h2>

      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {activeTab === "seoul"
            ? "서울경제에 관련 기사가 없습니다."
            : "관련 기사가 없습니다."}
        </div>
      ) : (
        <div className="space-y-8">
          {timeline.map((timelineItem) => (
            <div key={timelineItem.date}>
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-32 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {new Date(timelineItem.date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700 ml-4" />
                <div className="ml-4 text-sm text-gray-500">
                  {timelineItem.count}건
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {timelineItem.articles.map((article) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className={`group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border ${
                      selectedArticles.has(article.id)
                        ? "border-primary-300 dark:border-primary-600 ring-2 ring-primary-100 dark:ring-primary-900"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {/* 선택 체크박스 - 서울경제 탭에서만 표시 */}
                    {activeTab === "seoul" && (
                      <div className="absolute top-3 left-3 z-10">
                        <input
                          type="checkbox"
                          checked={selectedArticles.has(article.id)}
                          onChange={() => onToggleArticleSelection(article)}
                          disabled={
                            !selectedArticles.has(article.id) &&
                            selectedArticles.size >= 5
                          }
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </div>
                    )}

                    {/* 기사 내용 */}
                    <div
                      className={`cursor-pointer ${
                        activeTab === "seoul" ? "p-4 pl-12" : "p-4"
                      }`}
                      onClick={() => onViewArticleDetail(article)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-2 line-clamp-2">
                          {article.title}
                        </h4>
                        <p className={`text-sm text-gray-600 dark:text-gray-400 mb-3 ${
                          activeTab === "seoul" ? "line-clamp-6" : "line-clamp-2"
                        }`}>
                          {activeTab === "seoul" && article.content ? article.content : article.summary}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            {activeTab === "all" && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {article.provider}
                              </span>
                            )}
                            {/* 기자 이름 제거 */}
                          </div>
                          <span>{article.category}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default NewsTimeline;
