# deal-collector

[오늘특가](https://deal-or-land-pages.pages.dev)용 핫딜 수집기. GitHub Actions가 10분마다 커뮤니티 **공식 RSS**를 받아 오늘특가 워커로 넘깁니다.

| 사이트 | 주소 | 비고 |
|---|---|---|
| 뽐뿌 (뽐뿌·해외뽐뿌·알리뽐뿌) | `rss.php?id=ppomppu`, `ppomppu4`, `ppomppu8` | 공식 RSS, 이미지 없음 (목록 HTML은 403) |
| 루리웹 핫딜 | `market/board/1020/rss` | 공식 RSS, 썸네일 포함 |
| 클리앙 알뜰구매 | `service/board/jirum` 목록 1쪽 | HTML (robots: 쿼리 없는 주소만 허용), 썸네일 포함 |
| 딜바다 국내딜 | `bbs/board.php?bo_table=deal_domestic` 목록 1쪽 | HTML (RSS는 사이트가 막음), 썸네일 포함 |

제외(2026-10-27 확인): 퀘이사존·아카라이브·zod(차단 화면 403), 쿨엔조이(응답 없음), 어미새(RSS 잠김·썸네일 경로 robots 금지), 펨코(robots 금지)

썸네일 채우기(2026-11-20): 워커 딜 목록(`/?head=1`)에서 이미지 없는 **어미새** 글을 실행당 최대 8건 열어 대표 이미지를 찾아 `imgOnly` 항목으로 넘김(① 글 속 첫 쇼핑몰 링크의 og:image ② 글 og:image). robots.txt 확인, 이 저장소 User-Agent 그대로. 워커는 새 딜을 만들지 않고 이미 있는 같은 글에만 붙임. 대상 사이트는 `THUMB_HOSTS`.

제목 이미지 검색(R1, 2026-11-20): 글에서 이미지를 못 얻는 딜(뽐뿌·펨코 등)은 정리한 제목으로 카카오(Daum) 이미지 검색 API를 불러 쇼핑몰 문서 결과를 먼저 골라 `imgOnly`(`imgFrom: search`)로 넘김. 실행당 최대 20건, 딜마다 시도 구간(뽐뿌·펨코 0~40분, 그 밖 20~60분)을 둬 같은 딜을 반복 검색하지 않음. 저장소 Secrets `KAKAO_REST_KEY`가 없으면 건너뜀.

HTML 사이트는 화면이 바뀌면 글 0건 경고가 뜸 → 파서(`parseClien`, `parseDealbada`)만 고치면 됨.

## 원칙
- robots.txt가 허용하는 공식 피드만, 피드당 1회 요청, 오늘특가임을 밝히는 User-Agent
- 차단·로그인·CAPTCHA는 우회하지 않음 — 막히면 그 사이트는 빠짐
- 글 원문·이미지는 저장하지 않음(제목·링크·글 시각·사이트 썸네일 주소만)

## 설정
- 저장소 Secrets: `INGEST_TOKEN` (워커 비밀과 같은 값), `KAKAO_REST_KEY` (카카오 REST API 키 — 제목 이미지 검색, 없으면 그 단계만 건너뜀)
- 로컬 시험: `DRY_RUN=1 node collect.mjs`
