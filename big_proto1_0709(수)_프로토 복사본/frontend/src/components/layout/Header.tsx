import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

interface HeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

/**
 * 현대적이고 세련된 상단 네비게이션 헤더 컴포넌트
 */
const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  const location = useLocation();

  // 현재 경로에 따라 네비게이션 링크 활성화
  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", label: "홈", icon: "🏠" },
    { path: "/watchlist", label: "관심 종목", icon: "📊" },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* 로고 영역 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                AI
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  NOVA
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  AI 뉴스 플랫폼
                </div>
              </div>
            </Link>
          </div>

          {/* 네비게이션 링크 */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isActive(item.path)
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          {/* 다크모드 토글 & 모바일 메뉴 */}
          <div className="flex items-center space-x-2">
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={`${
                theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
              }`}
            >
              {theme === "dark" ? (
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* 모바일 메뉴 버튼 */}
            <button className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
