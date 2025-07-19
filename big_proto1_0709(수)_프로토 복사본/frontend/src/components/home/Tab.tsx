import React from "react";
import { motion } from "framer-motion";
import { TabProps } from "../../types";

const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    aria-controls={`tabpanel-${label.replace(/\s+/g, "-").toLowerCase()}`}
    className={`px-4 py-2 font-medium transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
      isActive
        ? "text-white bg-blue-600"
        : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700"
    }`}
  >
    {label}
  </button>
);

export default Tab;
