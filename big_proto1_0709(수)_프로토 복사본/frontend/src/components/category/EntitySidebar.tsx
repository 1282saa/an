import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";
import { itemVariants } from "../../animations/pageAnimations";
import { Entity, CategoryInfo } from "../../types";

interface EntitySidebarProps {
  categoryKey: string;
  categoryInfo: CategoryInfo | null;
  entities: Entity[];
  selectedEntity: Entity | null;
  isLoadingEntities: boolean;
  searchQuery: string;
  filteredEntities: Entity[];
  onEntitySelect: (entity: Entity) => void;
  onSearchChange: (query: string) => void;
}

// 카테고리 메타데이터
const CATEGORY_META: { [key: string]: { icon: string; description: string } } =
  {
    domestic_stock: { icon: "🏢", description: "국내 상장 기업 주식" },
    foreign_stock: { icon: "🌎", description: "미국 등 해외 상장 기업 주식" },
    commodity: { icon: "🏭", description: "원자재 및 상품" },
    forex_bond: { icon: "💱", description: "외환 및 채권 관련" },
    real_estate: { icon: "🏘️", description: "부동산 관련" },
    crypto: { icon: "🪙", description: "암호화폐 및 가상자산" },
  };

const EntitySidebar: React.FC<EntitySidebarProps> = ({
  categoryKey,
  categoryInfo,
  entities,
  selectedEntity,
  isLoadingEntities,
  searchQuery,
  filteredEntities,
  onEntitySelect,
  onSearchChange,
}) => {
  const navigate = useNavigate();

  return (
    <motion.aside
      variants={itemVariants}
      className="w-80 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex flex-col"
    >
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate("/watchlist")}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          카테고리 목록으로
        </button>

        <div className="flex items-center gap-3">
          <div className="text-3xl">
            {CATEGORY_META[categoryKey]?.icon || "📊"}
          </div>
          <div>
            <h2 className="text-xl font-bold">{categoryInfo?.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {CATEGORY_META[categoryKey]?.description}
            </p>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="종목 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 엔티티 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingEntities ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="p-2">
            {filteredEntities.map((entity) => (
              <motion.button
                key={entity.id}
                onClick={() => onEntitySelect(entity)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                  selectedEntity?.id === entity.id
                    ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                whileHover={{ x: 4 }}
              >
                <div className="font-medium">{entity.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {entity.code}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default EntitySidebar;
