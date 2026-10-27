# deal-collector

[오늘특가](https://deal-or-land-pages.pages.dev)용 핫딜 수집기. GitHub Actions가 10분마다 커뮤니티 **공식 RSS**를 받아 오늘특가 워커로 넘깁니다.

| 사이트 | 주소 | 비고 |
|---|---|---|
| 뽐뿌 | `rss.php?id=ppomppu` | 이미지 없음 |
| 루리웹 핫딜 | `market/board/1020/rss` | 썸네일 포함 |

## 원칙
- robots.txt가 허용하는 공식 피드만, 피드당 1회 요청, 오늘특가임을 밝히는 User-Agent
- 차단·로그인·CAPTCHA는 우회하지 않음 — 막히면 그 사이트는 빠짐
- 글 원문·이미지는 저장하지 않음(제목·링크·글 시각·사이트 썸네일 주소만)

## 설정
- 저장소 Secrets: `INGEST_TOKEN` (워커 비밀과 같은 값)
- 로컬 시험: `DRY_RUN=1 node collect.mjs`
