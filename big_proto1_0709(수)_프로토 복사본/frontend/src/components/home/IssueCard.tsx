import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IssueTopic } from "../../types";
import { itemVariants } from "../../animations/pageAnimations";

interface IssueCardProps {
  item: IssueTopic;
}

const IssueCard: React.FC<IssueCardProps> = ({ item }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-400 to-orange-500";
    if (rank === 2) return "from-gray-300 to-gray-500";
    if (rank === 3) return "from-amber-600 to-yellow-700";
    return "from-blue-500 to-purple-600";
  };

  return (
    <motion.div
      variants={itemVariants}
      className="group relative backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-white/20 dark:border-gray-700/30"
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* 배경 그라디언트 효과 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* 랭킹 배지 */}
      <div
        className={`absolute top-4 left-4 w-14 h-14 bg-gradient-to-br ${getRankColor(
          item.rank
        )} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
      >
        <span className="relative z-10">{item.rank}</span>
        {item.rank <= 3 && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 pt-24 p-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
              {item.title || item.topic_name}
            </h3>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {item.count}건의 기사
              </span>
              <motion.div
                className="text-blue-600 dark:text-blue-400"
                animate={{ rotate: showDetails ? 180 : 0 }}
                transition={{ duration: 0.3 }}
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>최근 24시간 동안 수집됨</span>
            </div>
          </div>

          {/* 상세 정보 토글 버튼 */}
          <button className="w-full mt-4 inline-flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors bg-blue-50/50 dark:bg-blue-900/20 rounded-xl py-3 hover:bg-blue-100/50 dark:hover:bg-blue-800/30">
            <span>{showDetails ? "간단히 보기" : "언론사별 상세보기"}</span>
          </button>
        </div>

        {/* 언론사별 breakdown (토글) */}
        <AnimatePresence>
          {showDetails &&
            item.provider_breakdown &&
            item.provider_breakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50"
              >
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg mr-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  언론사별 보도 현황
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 dark:scrollbar-thumb-blue-800 scrollbar-track-transparent">
                  {item.provider_breakdown?.map(
                    (provider: any, index: number) => (
                      <motion.div
                        key={provider.provider_code}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative p-4 bg-gradient-to-r from-white/60 to-blue-50/60 dark:from-gray-800/60 dark:to-blue-900/20 rounded-xl border border-white/30 dark:border-gray-600/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {provider.provider}
                          </span>
                          <div className="flex items-center space-x-3">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {provider.count}건
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {Math.round((provider.count / item.count) * 100)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(
                                (provider.count /
                                  Math.max(
                                    ...(item.provider_breakdown?.map(
                                      (p: any) => p.count
                                    ) || [1])
                                  )) *
                                  100,
                                100
                              )}%`,
                            }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    )
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default IssueCard;
