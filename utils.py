import streamlit as st
import requests
import json
import matplotlib.pyplot as plt
import time

# 한글 폰트 설정 함수
def setup_korean_font():
    """matplotlib에서 한글 폰트를 설정합니다."""
    try:
        # 다양한 한글 폰트 옵션 시도
        font_options = ['NanumGothic', 'AppleGothic', 'Gulim', 'Batang', 'Dotum', 'Arial Unicode MS']
        
        # 폰트 가용성 확인 및 설정
        font_found = False
        for font in font_options:
            try:
                plt.rcParams['font.family'] = font
                # 간단한 텍스트로 폰트 테스트
                fig, ax = plt.subplots(figsize=(1, 1))
                ax.text(0.5, 0.5, '테스트')
                fig.tight_layout()
                plt.close(fig)  # 테스트 후 닫기
                font_found = True
                st.write(f"Using font: {font}") # Debugging: 폰트 확인
                break
            except Exception:
                continue
                
        if not font_found:
            # 폰트 없을 경우 기본 설정 사용 및 경고
            plt.rcParams['font.family'] = 'DejaVu Sans' # Fallback font
            plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 표시 문제 해결
            st.warning("사용 가능한 한글 폰트를 찾지 못했습니다. 기본 폰트(DejaVu Sans)를 사용합니다. 차트에 한글이 깨질 수 있습니다.")
            
    except Exception as e:
        # 폰트 설정 실패 시 기본 설정으로 진행
        st.warning(f"폰트 설정 중 문제가 발생했습니다: {str(e)}. 기본 폰트를 사용합니다.")

# API 요청 함수
def make_api_request(api_key, endpoint_url, data, debug=False):
    """API 요청을 수행하는 함수"""
    if not endpoint_url:
        st.error(f"API 엔드포인트 URL이 유효하지 않습니다.")
        return None
    
    # API 키 추가
    data["access_key"] = api_key
    
    if debug:
        st.write(f"요청 URL: {endpoint_url}")
        # 민감 정보 마스킹 후 출력
        masked_data = data.copy()
        if 'access_key' in masked_data:
            masked_data['access_key'] = '********'
        st.write(f"요청 데이터: {json.dumps(masked_data, indent=2, ensure_ascii=False)}")

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(endpoint_url, json=data, timeout=60) # 타임아웃 증가

            if debug:
                st.write(f"시도 {attempt + 1}: 응답 상태 코드: {response.status_code}")
                # 응답 내용 미리보기는 신중히 사용 (민감 정보 포함 가능성)
                # st.write(f"응답 내용 미리보기: {response.text[:200]}...")
                # st.write(f"응답 헤더: {dict(response.headers)}")

            response.raise_for_status() # HTTP 오류 발생 시 예외 발생

            result = response.json()

            if debug:
                st.write(f"응답 결과 코드: {result.get('result')}")

            if result.get("result") != 0:
                st.error(f"API 응답 오류 (코드: {result.get('result')}): {result.get('reason', result.get('message', '알 수 없는 오류'))}") # 'reason' 필드도 확인
                return None

            return result.get("return_object")

        except requests.exceptions.Timeout:
            st.warning(f"API 요청 시간 초과 (시도 {attempt + 1}/{max_retries}). 잠시 후 다시 시도합니다.")
            if attempt == max_retries - 1:
                st.error("API 요청 시간 초과. 서버 응답이 느리거나 네트워크 문제가 있을 수 있습니다.")
                return None
            time.sleep(2) # 재시도 전 잠시 대기
        except requests.exceptions.RequestException as e:
            st.error(f"API 요청 중 오류 발생: {str(e)}")
            return None
        except json.JSONDecodeError:
            st.error("응답을 JSON으로 파싱할 수 없습니다.")
            if debug:
                st.code(response.text)
            return None
        except Exception as e:
            st.error(f"예상치 못한 오류 발생: {str(e)}")
            return None
    return None # 모든 재시도 실패 시 