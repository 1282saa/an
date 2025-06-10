import requests
import urllib.parse

# 너의 고귀한 클라이언트 정보
client_id = "BRBkD_TaH9_cWnTRNDo0"
client_secret = "nBQbi0IM30"

# 검색어
query = "인공지능"
encText = urllib.parse.quote(query)
url = f"https://openapi.naver.com/v1/search/news.json?query={encText}&display=5&sort=date"

# HTTP 헤더 (ID랑 시크릿 넣기)
headers = {
    "X-Naver-Client-Id": client_id,
    "X-Naver-Client-Secret": client_secret
}

# 요청 보내기
response = requests.get(url, headers=headers)

# 응답 확인
if response.status_code == 200:
    items = response.json().get('items', [])
    for i, item in enumerate(items, start=1):
        print(f"[{i}] {item['title']}")
        print(f"  - 링크: {item['link']}")
        print(f"  - 발행일: {item['pubDate']}")
        print()
else:
    print("요청 실패. HTTP 상태 코드:", response.status_code)
