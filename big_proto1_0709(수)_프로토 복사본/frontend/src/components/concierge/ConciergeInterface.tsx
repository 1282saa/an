import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ConciergeInterface: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      type: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>
  >([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 400) + "px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [query]);

  // 메시지 전송
  const handleSubmit = async () => {
    if (!query.trim() || isProcessing) return;

    const newMessage = {
      id: Date.now().toString(),
      type: "user" as const,
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setQuery("");
    setIsProcessing(true);

    // 시뮬레이션: 실제 API 호출로 대체
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant" as const,
        content: "AI가 분석한 결과를 여기에 표시합니다...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            // 초기 상태 - 환영 카드
            <div className="flex flex-col items-center justify-center py-24 mt-12">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-2xl w-full transition-colors duration-200">
                {/* 아이콘 */}
                <div className="flex justify-center mb-6">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-8 w-8 text-blue-600 dark:text-blue-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                      />
                    </svg>
                  </div>
                </div>

                {/* 제목 */}
                <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-4">
                  AI 뉴스 컨시어지
                </h2>

                {/* 설명 */}
                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                  궁금한 뉴스나 이슈에 대해 질문하면 AI가 관련 정보를 분석해서
                  답변해 드립니다.
                </p>

                {/* 안내 박스들 */}
                <div className="space-y-4">
                  <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mr-3 mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-5 w-5 text-blue-500 dark:text-blue-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">시작하는 방법:</span> 아래
                        입력창에 궁금한 뉴스나 이슈를 입력하고 전송 버튼을
                        클릭하세요
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mr-3 mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-5 w-5 text-blue-500 dark:text-blue-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">AI 분석:</span> 빅카인즈
                        데이터를 기반으로 관련 뉴스를 찾아 종합적인 답변을
                        제공합니다
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 대화 메시지들
            <div className="space-y-6">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-lg ${
                      message.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.type === "user"
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-3xl p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        AI가 분석 중입니다...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 하단 입력 영역 */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 relative transition-colors duration-200 focus:outline-none"
            style={{
              minHeight: "128px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* 텍스트 입력 영역 */}
            <div className="flex-1 relative focus:outline-none flex items-center">
              <textarea
                ref={textareaRef}
                placeholder="궁금한 뉴스나 이슈를 입력하세요..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pr-14 pl-2 border-0 focus:outline-none resize-none transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={1}
                style={{
                  minHeight: "32px",
                  maxHeight: "400px",
                  lineHeight: 1.4,
                  paddingTop: "4px",
                  paddingBottom: "4px",
                  overflowY: "hidden",
                  whiteSpace: "pre-wrap",
                  fontSize: "16px",
                  fontWeight: 400,
                  outline: "none",
                  boxShadow: "none",
                }}
              />

              {/* 전송 버튼 */}
              <div className="absolute right-3 flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isProcessing}
                  className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="메시지 전송"
                  style={{ width: "32px", height: "32px" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 하단 정보 바 */}
            <div className="flex items-center justify-between">
              {/* 왼쪽: 글자수와 모델 정보 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{query.length}자</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-xs">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Claude 3.5 Sonnet
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-3 w-3 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 상태 정보 */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>실시간 분석</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConciergeInterface;
