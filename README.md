# airblockfz.com — 정적 웹사이트

Air Block L.L.C-FZ 회사 사이트. Google Play / App Store 제출에 필요한 **개인정보처리방침·이용약관·지원** 페이지 포함. 한국어/영어 토글(우상단 버튼, 기본 한국어).

## 페이지
- `index.html` — 회사 소개 + 12개 앱 쇼케이스
- `privacy.html` — 개인정보처리방침 (Play/App Store 등록 시 이 URL 입력)
- `terms.html` — 이용약관
- `support.html` — 지원/문의 (info@airblockfz.com)
- `assets/style.css`, `assets/app.js` — 공통 스타일 + 언어토글

## 로컬 미리보기
```
cd airblockfz-website && python3 -m http.server 8080
# http://localhost:8080
```

## airblockfz.com 배포 (HTTPS 필수 — Play가 https 개인정보처리방침 URL 요구)
정적 사이트라 아무 호스팅에나 올리면 됩니다. 권장(무료·HTTPS 자동):
- **Cloudflare Pages / Netlify / GitHub Pages** 중 하나에 이 폴더 업로드 → 커스텀 도메인 `airblockfz.com` 연결
- Namecheap DNS에서 호스팅이 안내하는 CNAME/A 레코드 추가 (Zoho MX 레코드는 건드리지 말 것)

배포 후 Play Console 각 앱 → 스토어 등록정보 → **개인정보처리방침 URL**:
`https://airblockfz.com/privacy.html`

## 주의
- 회사 정보·라이선스 번호(2649228.01)는 라이선스와 일치하게 유지.
- 앱을 추가/제거하면 `index.html` 앱 카드와 `privacy.html` 앱 목록도 갱신.
