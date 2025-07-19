/**
 * 이미지 관련 유틸리티 함수들
 */

/**
 * BigKinds 이미지 경로를 실제 이미지 URL로 변환하는 함수
 * @param rawPath 원본 이미지 경로 (BigKinds에서 제공)
 * @returns 실제 이미지 URL 또는 null
 */
export const getImageUrl = (rawPath: string | undefined): string | null => {
  if (!rawPath) {
    return null;
  }

  try {
    // 전체 경로 가져오기 (이스케이프된 문자 처리)
    // 예: "/02100311/2025/06/08/02100311.20250608161705001.01.jpg\n/02100311/2025/06/08/02100311.20250608161705001.02.jpg"

    // 1. 개행 문자를 실제 줄바꿈으로 변환
    const unescaped = rawPath.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n");

    // 2. 줄바꿈 또는 콤마로 분리하여 첫 번째 경로 추출
    const pathParts = unescaped.split(/[\n,]+/);
    let firstPath = pathParts[0]?.trim() || "";

    // 3. 추출된 경로 검증
    if (!firstPath || firstPath === "" || firstPath === "/") {
      // 전체 문자열이 유효한 경로인지 확인
      const fullPathMatch = rawPath.match(
        /\/\d+\/\d{4}\/\d{2}\/\d{2}\/[\w\.]+\.(jpg|png|gif|jpeg)/i
      );
      if (fullPathMatch) {
        firstPath = fullPathMatch[0];
      } else {
        return null;
      }
    }

    // 이미지 경로가 이미 전체 URL인 경우
    if (firstPath.startsWith("http://") || firstPath.startsWith("https://")) {
      return `/api/proxy/image?url=${encodeURIComponent(firstPath)}`;
    }

    // 경로 정규화 (슬래시로 시작하는지 확인)
    const normalizedPath = firstPath.startsWith("/")
      ? firstPath
      : `/${firstPath}`;

    // BigKinds 이미지 서버 기본 URL
    const baseUrl = "https://www.bigkinds.or.kr/resources/images";

    // 최종 URL 생성
    const fullImageUrl = `${baseUrl}${normalizedPath}`;

    // 프록시 URL 반환
    return `/api/proxy/image?url=${encodeURIComponent(fullImageUrl)}`;
  } catch (error) {
    console.error("이미지 URL 생성 중 오류 발생:", error);
    return null;
  }
};

/**
 * 기사에 유효한 이미지가 있는지 확인하는 함수
 * @param article 뉴스 기사 객체
 * @returns 유효한 이미지가 있으면 true
 */
export const hasValidImage = (article: { images?: string[] }): boolean => {
  return !!(
    article.images &&
    article.images.length > 0 &&
    article.images[0] &&
    article.images[0].trim() !== ""
  );
};

/**
 * 이미지 로딩 오류 시 기본 이미지 URL을 반환하는 함수
 * @returns 기본 이미지 URL
 */
export const getDefaultImageUrl = (): string => {
  return "/images/default-news-image.svg";
};

/**
 * 이미지 미리로딩을 위한 함수
 * @param url 이미지 URL
 * @returns Promise<boolean> - 로딩 성공 여부
 */
export const preloadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};
