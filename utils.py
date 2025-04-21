import streamlit as st
import requests
import json
import matplotlib.pyplot as plt
import time
import platform
import os # 폰트 경로 확인에 필요

# 한글 폰트 설정 함수
def setup_korean_font():
    """Matplotlib에서 한국어 폰트를 설정합니다."""
    try:
        import platform
        import matplotlib.pyplot as plt
        import matplotlib.font_manager as fm

        system_name = platform.system()
        font_name = None

        if system_name == "Darwin":  # Mac OS
            # AppleGothic이 있는지 확인
            if "AppleGothic" in [f.name for f in fm.fontManager.ttflist]:
                font_name = "AppleGothic"
            else:
                print("경고: AppleGothic 폰트를 찾을 수 없습니다. 다른 폰트를 시도합니다.")
                # 다른 사용 가능한 한글 폰트 시도 (예: 'Malgun Gothic' - 설치 필요)
                # if "Malgun Gothic" in [f.name for f in fm.fontManager.ttflist]:
                #     font_name = "Malgun Gothic"

        elif system_name == "Windows":  # Windows
            font_name = "Malgun Gothic" # 기본값

        else:  # Linux 등 기타
             # NanumGothic 확인 로직 유지 (또는 다른 Linux용 폰트)
             # ... (기존 Linux 폰트 확인 로직) ...
             if fm.findfont("NanumGothic", fontext="ttf"):
                 font_name = "NanumGothic"
             else:
                 print("경고: NanumGothic 폰트를 찾을 수 없습니다. 폰트 설치가 필요할 수 있습니다.")


        if font_name:
            plt.rc('font', family=font_name)
            plt.rcParams['axes.unicode_minus'] = False # 마이너스 기호
            print(f"Matplotlib 한국어 폰트 설정 완료: {font_name}")
        else:
            print("경고: 적절한 한글 폰트를 찾지 못했습니다. 차트의 한글이 깨질 수 있습니다.")
            # 시스템 기본 폰트 사용 시도 (선택적)
            # plt.rcParams['font.family'] = 'sans-serif'
            # plt.rcParams['axes.unicode_minus'] = False

    except ImportError:
        print("오류: Matplotlib 또는 관련 모듈이 설치되지 않았습니다.")
    except Exception as e:
        print(f"폰트 설정 중 예상치 못한 오류 발생: {e}")

# API 요청 함수
def make_api_request(api_key, endpoint, data, method='post', debug=False):
    """API 요청을 보내고 응답을 반환하는 함수"""
    headers = {
        'Authorization': api_key,
        'Content-Type': 'application/json'
    }
    try:
        if debug:
            st.write(f"-- API Request ({endpoint}) --")
            st.json(data)
        
        if method.lower() == 'post':
            # 타임아웃 시간을 180초(3분)으로 늘림
            response = requests.post(endpoint, headers=headers, json=data, timeout=180) 
        elif method.lower() == 'get':
             # 타임아웃 시간을 180초(3분)으로 늘림
             response = requests.get(endpoint, headers=headers, params=data, timeout=180)
        else:
            st.error(f"지원하지 않는 메소드: {method}")
            return None

        response.raise_for_status() # 오류 발생 시 예외 발생
        result = response.json()
        
        if debug:
            st.write("-- API Response --")
            try:
                st.json(result)
            except Exception as e:
                st.warning(f"API 응답을 JSON으로 표시하는 중 오류: {e}")
                st.text(str(result)[:1000] + "...")
                
        return result

    except requests.exceptions.Timeout:
        st.error(f"API 요청 시간 초과 ({endpoint}). 설정된 시간: 180초") # 메시지에 타임아웃 시간 명시
        return None
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