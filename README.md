# 서울경제 뉴스 이슈 분석 시스템

빅카인즈 API를 활용하여 서울경제신문의 주요 이슈를 분석하고 시각화하는 Streamlit 기반 웹 애플리케이션입니다.

![애플리케이션 미리보기](https://via.placeholder.com/800x400?text=서울경제+뉴스+이슈+분석+시스템)

## 주요 기능

### 📊 대시보드 뷰

- 선택된 날짜의 주요 이슈를 카드 형태로 표시
- 이슈별 제목, 관련 기사 수, 요약 정보 제공
- 각 이슈 카드에서 상세 분석 페이지로 이동 가능

### 🔍 상세 분석

- 선택한 이슈에 대한 심층 분석
  - **이슈 분석 탭**: 관련 기사, 키워드 분석, 시간별 추이 차트 제공
  - **과거 데이터 비교 탭**: 선택한 기간(1주 전, 1달 전 등)의 관련 기사 비교

### 🛠 사용자 설정

- 기준 날짜 선택 (오늘, 어제, 직접 선택)
- 타임라인 분석 기간 설정 (7-90일)
- 디버그 모드 제공

## 기술 스택

- **백엔드**: Python
- **프론트엔드**: Streamlit
- **데이터 처리**: Pandas
- **데이터 시각화**: Matplotlib, Seaborn
- **API**: 빅카인즈 API (서울경제신문 데이터)

## 프로젝트 구조

```
.
├── app.py              # 메인 애플리케이션 파일
├── dashboard.py        # 대시보드 UI 및 로직
├── detail_page.py      # 상세 페이지 UI 및 로직
├── config.py           # API 키 및 엔드포인트 설정
├── utils.py            # 유틸리티 함수 (API 요청, 폰트 설정 등)
├── requirements.txt    # 필요한 Python 패키지 목록
├── .env                # API 키 저장 파일 (git에 포함하지 않음)
└── README.md           # 프로젝트 설명서
```

## 설치 및 설정

### 사전 요구사항

- Python 3.8 이상
- 빅카인즈 API 키 (https://www.bigkinds.or.kr/ 에서 발급)

### 설치 방법

1. 저장소 클론

```bash
git clone https://github.com/your-username/news-analysis-system.git
cd news-analysis-system
```

2. 가상 환경 생성 및 활성화 (선택 사항)

```bash
python -m venv venv
source venv/bin/activate  # Windows의 경우: venv\Scripts\activate
```

3. 필요한 패키지 설치

```bash
pip install -r requirements.txt
```

4. API 키 설정

`.env` 파일을 생성하고 다음과 같이 API 키를 설정합니다.

```
BIGKINDS_KEY=your_api_key_here
```

또는 Streamlit Cloud 배포 시 Secrets 메뉴에서 다음과 같이 설정합니다.

```toml
# .streamlit/secrets.toml
BIGKINDS_KEY = "your_api_key_here"
```

## 실행 방법

### 로컬 환경

```bash
streamlit run app.py
```

웹 브라우저가 자동으로 열리고 `http://localhost:8501`에서 애플리케이션을 확인할 수 있습니다.

### Streamlit Cloud 배포

1. 깃허브에 코드 푸시
2. Streamlit Cloud(https://streamlit.io/cloud)에서 새 앱 배포
3. 저장소 URL 입력 및 `app.py` 지정
4. Settings → Secrets 메뉴에서 API 키 설정

## 사용 가이드

### 1. 기준 날짜 설정

- 사이드바에서 "오늘", "어제" 또는 직접 날짜 선택
- 타임라인 분석 기간 (7-90일) 설정

### 2. 대시보드 탐색

- 주요 이슈 카드 확인
- "자세히 보기" 버튼 클릭하여 상세 분석으로 이동

### 3. 이슈 분석

- "이슈 분석" 탭에서 "데이터 분석 시작" 버튼 클릭
- 관련 기사, 키워드 분석, 시간별 추이 확인

### 4. 과거 데이터 비교

- "과거 데이터 비교" 탭에서 비교할 기간 선택
- 각 기간별 관련 기사 확인

## 향후 개선 사항

- [ ] 이슈 간 연관성 분석 기능 추가
- [ ] 감성 분석을 통한 이슈별 여론 동향 파악
- [ ] 키워드 네트워크 시각화 개선
- [ ] 사용자 정의 검색 기능 강화
- [ ] 모바일 환경 최적화

## 기여 방법

1. 이 저장소를 포크합니다.
2. 기능 개발 또는 버그 수정을 위한 브랜치를 생성합니다.
3. 변경 사항을 커밋합니다.
4. 브랜치를 원격 저장소로 푸시합니다.
5. Pull Request를 제출합니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## 문의

프로젝트에 관한 질문이나 제안이 있으시면 이슈를 등록하거나 이메일로 연락해 주세요: your-email@example.com
