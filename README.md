# deal-collector

[오늘특가](https://deal-or-land-pages.pages.dev)용 핫딜 수집기. GitHub Actions가 10분마다 커뮤니티 **공식 RSS**를 받아 오늘특가 워커로 넘깁니다.

| 사이트 | 주소 | 비고 |
|---|---|---|
| 뽐뿌 (뽐뿌·해외뽐뿌·알리뽐뿌) | `rss.php?id=ppomppu`, `ppomppu4`, `ppomppu8` | 공식 RSS, 이미지 없음 (목록 HTML은 403) |
| 루리웹 핫딜 | `market/board/1020/rss` | 공식 RSS, 썸네일 포함 |
| 클리앙 알뜰구매 | `service/board/jirum` 목록 1쪽 | HTML (robots: 쿼리 없는 주소만 허용), 썸네일 포함 |
| 딜바다 국내딜 | `bbs/board.php?bo_table=deal_domestic` 목록 1쪽 | HTML (RSS는 사이트가 막음), 썸네일 포함 |

제외(2026-10-27 확인): 퀘이사존·아카라이브·zod(차단 화면 403), 쿨엔조이(응답 없음), 어미새(RSS 잠김·썸네일 경로 robots 금지), 펨코(robots 금지)

HTML 사이트는 화면이 바뀌면 글 0건 경고가 뜸 → 파서(`parseClien`, `parseDealbada`)만 고치면 됨.

## 원칙
- robots.txt가 허용하는 공식 피드만, 피드당 1회 요청, 오늘특가임을 밝히는 User-Agent
- 차단·로그인·CAPTCHA는 우회하지 않음 — 막히면 그 사이트는 빠짐
- 글 원문·이미지는 저장하지 않음(제목·링크·글 시각·사이트 썸네일 주소만)

## 설정
- 저장소 Secrets: `INGEST_TOKEN` (워커 비밀과 같은 값)
- 로컬 시험: `DRY_RUN=1 node collect.mjs`
