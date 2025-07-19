import React from "react";
import { motion } from "framer-motion";
import { PopularKeyword } from "../../types";
import { itemVariants } from "../../animations/pageAnimations";

interface KeywordTagProps {
  item: PopularKeyword;
}

const KeywordTag: React.FC<KeywordTagProps> = ({ item }) => {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return (
          <svg
            className="w-4 h-4 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "down":
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "stable":
        return (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "up":
        return "from-emerald-500/10 to-green-500/10 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300";
      case "down":
        return "from-red-500/10 to-rose-500/10 border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-300";
      case "stable":
        return "from-gray-500/10 to-slate-500/10 border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300";
      default:
        return "from-blue-500/10 to-purple-500/10 border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300";
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        scale: 1.05,
        y: -2,
        transition: { type: "spring", stiffness: 400, damping: 10 },
      }}
      whileTap={{ scale: 0.95 }}
      className={`group relative inline-flex items-center space-x-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm bg-gradient-to-r ${getTrendColor(
        item.trend
      )} border hover:shadow-lg hover:shadow-blue-500/10`}
    >
      {/* 배경 그라디언트 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* 랭킹 */}
      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg">
        #{item.rank}
      </div>

      {/* 키워드 정보 */}
      <div className="relative z-10 flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-lg">{item.keyword}</span>
          {getTrendIcon(item.trend)}
        </div>
        <div className="flex items-center space-x-2 text-sm opacity-75">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{item.count?.toLocaleString()}회 언급</span>
        </div>
      </div>

      {/* 호버 효과 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
};

export default KeywordTag;
