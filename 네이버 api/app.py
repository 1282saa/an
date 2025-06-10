import requests
import urllib.parse
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import re
from collections import defaultdict
import os

app = Flask(__name__)

# 네이버 API 클라이언트 정보 (환경 변수에서 가져오거나 기본값 사용)
client_id = os.environ.get('NAVER_CLIENT_ID', "BRBkD_TaH9_cWnTRNDo0")
client_secret = os.environ.get('NAVER_CLIENT_SECRET', "nBQbi0IM30")

# 카테고리 정의
CATEGORIES = {
    "all": "전체",
    "economy": "경제",
    "politics": "정치",
    "society": "사회",
    "it": "IT/과학",
    "world": "국제",
    "sports": "스포츠",
    "entertainment": "연예"
}

@app.route('/', methods=['GET', 'POST'])
def index():
    selected_category = request.args.get('category', 'all')
    query = request.form.get('query', '')
    
    if not query and selected_category != 'all':
        # 카테고리가 선택된 경우 해당 카테고리 이름으로 검색
        query = CATEGORIES[selected_category]
    
    results = []
    if query:
        results = search_news(query, sort='date')  # 최신순으로 정렬
    
    # 타임라인 형식으로 결과 그룹화
    timeline_results = group_by_date(results)
    
    return render_template('index.html', 
                          results=results, 
                          timeline_results=timeline_results,
                          query=query,
                          categories=CATEGORIES,
                          selected_category=selected_category)

@app.route('/api/category/<category>', methods=['GET'])
def category_news(category):
    if category not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    
    query = CATEGORIES[category] if category != 'all' else '뉴스'
    results = search_news(query, sort='date')
    return jsonify(results)

def search_news(query, display=20, start=1, sort='sim'):
    encText = urllib.parse.quote(query)
    url = f"https://openapi.naver.com/v1/search/news.json?query={encText}&display={display}&start={start}&sort={sort}"
    
    # HTTP 헤더
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret
    }
    
    # 요청 보내기
    response = requests.get(url, headers=headers)
    
    # 응답 처리
    if response.status_code == 200:
        items = response.json().get('items', [])
        
        # HTML 태그 제거 및 날짜 포맷 변경
        for item in items:
            item['title'] = clean_html_tags(item['title'])
            item['description'] = clean_html_tags(item['description'])
            # 날짜 형식 변환 (예: "Mon, 26 Sep 2016 07:50:00 +0900" -> "2016-09-26")
            try:
                pub_date = datetime.strptime(item['pubDate'], "%a, %d %b %Y %H:%M:%S %z")
                item['formatted_date'] = pub_date.strftime("%Y-%m-%d")
                item['formatted_time'] = pub_date.strftime("%H:%M")
            except:
                item['formatted_date'] = item['pubDate']
                item['formatted_time'] = ""
        
        return items
    else:
        print(f"요청 실패. HTTP 상태 코드: {response.status_code}")
        return []

def clean_html_tags(text):
    """HTML 태그를 제거하되 <b> 태그는 강조 표시로 유지"""
    # <b> 태그를 임시 마커로 변경
    text = text.replace('<b>', '**BOLD_START**').replace('</b>', '**BOLD_END**')
    # 나머지 HTML 태그 제거
    text = re.sub('<[^<]+?>', '', text)
    # 강조 표시 복원
    text = text.replace('**BOLD_START**', '<b>').replace('**BOLD_END**', '</b>')
    return text

def group_by_date(news_items):
    """뉴스 항목을 날짜별로 그룹화"""
    grouped = defaultdict(list)
    for item in news_items:
        date = item.get('formatted_date', '날짜 없음')
        grouped[date].append(item)
    
    # 날짜별로 정렬된 결과 반환
    return dict(sorted(grouped.items(), key=lambda x: x[0], reverse=True))

if __name__ == '__main__':
    app.run(debug=True) 