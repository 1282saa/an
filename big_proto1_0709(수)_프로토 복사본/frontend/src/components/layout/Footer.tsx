import React from "react";

/**
 * 모던하고 세련된 페이지 하단 푸터 컴포넌트
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                NOVA
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} AI NOVA. 모든 권리 보유.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end space-y-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              뉴스 기반 인공지능 서비스
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              빅카인즈 데이터 기반 스마트 분석
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
