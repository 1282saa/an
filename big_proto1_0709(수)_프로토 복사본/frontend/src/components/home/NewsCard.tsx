import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getNewsDetail, getArticleLink } from "../../services/api";
import { itemVariants } from "../../animations/pageAnimations";
import { NewsItem } from "../../types";

interface NewsCardProps {
  item: NewsItem;
}

const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (item.id) {
      // 카드 클릭 시 상세 페이지로 이동
      navigate(`/news/${item.id}`);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        y: -4,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700"
      onClick={handleCardClick}
    >
      {/* 그라데이션 보더 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
            {item.provider}
          </span>
          <time className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {item.date}
          </time>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full font-medium">
            #{item.category}
          </span>
          <div className="flex items-center gap-2">
            {/* 상세 페이지 보기 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id) {
                  navigate(`/news/${item.id}`);
                }
              }}
              className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              요약 보기
            </button>
            
            {/* 원문 보기 버튼 */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (!item.id) return;

                try {
                  // 뉴스 상세 정보 조회하여 외부 링크 가져오기
                  const newsDetail = await getNewsDetail(item.id);
                  if (newsDetail.success && newsDetail.news) {
                    const externalLink = getArticleLink(newsDetail.news);
                    // 외부 링크로 이동
                    window.open(externalLink, "_blank", "noopener,noreferrer");
                  } else {
                    // 상세 정보를 가져올 수 없으면 내부 페이지로 이동
                    navigate(`/news/${item.id}`);
                  }
                } catch (error) {
                  console.error("뉴스 상세 정보 조회 실패:", error);
                  // 오류 발생 시 내부 페이지로 이동
                  navigate(`/news/${item.id}`);
                }
              }}
              className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              전체 보기
              <svg
                className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
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
        </div>
      </div>
    </motion.div>
  );
};

export default NewsCard;
