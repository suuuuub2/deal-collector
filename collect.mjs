// 오늘특가 수집기 — 커뮤니티 공식 RSS를 받아 워커 /api/ingest로 넘긴다.
// 원칙: robots.txt 허용 + 공식 피드만, 피드당 1회 요청, 브라우저인 척하지 않음, 막히면 우회하지 않음.
// 실행: INGEST_TOKEN=... node collect.mjs   (DRY_RUN=1 이면 보내지 않고 출력만)
const INGEST_URL = process.env.INGEST_URL || "https://deal-scraper-worker.kmhkm486.workers.dev/api/ingest";
const UA = "Mozilla/5.0 (compatible; OneulTeukga/1.0; +https://deal-or-land-pages.pages.dev)";

const FEEDS = [
  { name: "ppomppu", source: "뽐뿌", url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu" },
  { name: "ruliweb", source: "루리웹", url: "https://bbs.ruliweb.com/market/board/1020/rss" }
];

const decode = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, "&");
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]).trim() : "";
};

function parseRss(xml, feed) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map((it) => {
    const desc = tag(it, "description");
    const img = (desc.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "";
    const posted = new Date(tag(it, "pubDate"));
    return {
      title: tag(it, "title").replace(/\s+/g, " "),
      link: tag(it, "link"),
      source: feed.source,
      img,
      postedAt: isNaN(posted.getTime()) ? "" : posted.toISOString()
    };
  }).filter((d) => d.title && d.link);
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const deals = parseRss(text, feed);
  if (deals.length === 0) throw new Error(`글 0건 (응답 앞부분: ${text.slice(0, 120).replace(/\s+/g, " ")})`);
  return deals;
}

const all = [];
const failed = [];
for (const feed of FEEDS) {
  try {
    const deals = await fetchFeed(feed);
    console.log(`[collect] ${feed.name} ok items=${deals.length} img=${deals.filter((d) => d.img).length}`);
    all.push(...deals);
  } catch (e) {
    failed.push(feed.name);
    console.log(`::warning title=${feed.name} 수집 실패::${String(e.message || e)}`);
  }
}

if (process.env.DRY_RUN) {
  console.log(JSON.stringify(all.slice(0, 3), null, 2));
} else if (all.length) {
  if (!process.env.INGEST_TOKEN) throw new Error("INGEST_TOKEN 비밀이 없어요");
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.INGEST_TOKEN}`, "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ deals: all }),
    signal: AbortSignal.timeout(20000)
  });
  const body = await res.text();
  console.log(`[collect] ingest st=${res.status} ${body.slice(0, 200)}`);
  let parsed = null;
  try { parsed = JSON.parse(body); } catch (e) { /* JSON 아님 */ }
  // 워커에 /api/ingest가 없으면 다른 경로 응답(200)이 올 수 있어서 received 필드까지 확인
  if (!res.ok || !parsed || typeof parsed.received !== "number") {
    console.log(`::error title=워커 전달 실패::HTTP ${res.status} ${body.slice(0, 200)}`);
    process.exitCode = 1;
  } else {
    console.log(`::notice title=수집 결과::보냄 ${all.length}건, 워커 새로 받음 ${parsed.added}건, 큐 ${parsed.queue}건${failed.length ? `, 실패: ${failed.join(",")}` : ""}`);
  }
}

// 모든 피드가 실패하면 실행을 실패로 표시(GitHub 알림·Actions 화면에서 바로 보이게)
if (failed.length === FEEDS.length) process.exitCode = 1;
