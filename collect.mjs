// 오늘특가 수집기 — 커뮤니티 공식 RSS를 받아 워커 /api/ingest로 넘긴다.
// 원칙: robots.txt 허용 + 공식 피드만, 피드당 1회 요청, 브라우저인 척하지 않음, 막히면 우회하지 않음.
// 실행: INGEST_TOKEN=... node collect.mjs   (DRY_RUN=1 이면 보내지 않고 출력만)
const INGEST_URL = process.env.INGEST_URL || "https://deal-scraper-worker.kmhkm486.workers.dev/api/ingest";
const UA = "Mozilla/5.0 (compatible; OneulTeukga/1.0; +https://deal-or-land-pages.pages.dev)";

// type: rss(공식 피드) / html(robots.txt가 허용하는 목록 1쪽, 2026-10-27 확인)
const FEEDS = [
  { name: "ppomppu", source: "뽐뿌", type: "rss", url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu" },
  { name: "ppomppu4", source: "뽐뿌", type: "rss", url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu4" }, // 해외뽐뿌
  { name: "ppomppu8", source: "뽐뿌", type: "rss", url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu8" }, // 알리뽐뿌
  { name: "ruliweb", source: "루리웹", type: "rss", url: "https://bbs.ruliweb.com/market/board/1020/rss" },
  // 클리앙 robots: /service/board/ 허용, 물음표 주소(/*?*) 금지 → 쿼리 없는 목록 1쪽만
  { name: "clien", source: "클리앙", type: "html", url: "https://www.clien.net/service/board/jirum", parse: parseClien },
  // 딜바다 robots: Allow / (RSS는 사이트가 막아 둠) → 목록 1쪽
  { name: "dealbada", source: "딜바다", type: "html", url: "https://www.dealbada.com/bbs/board.php?bo_table=deal_domestic", parse: parseDealbada }
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

const strip = (h) => decode(String(h || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
// KST "YYYY-MM-DD HH:MM:SS" → ISO
const kstIso = (s) => { const d = new Date(String(s).trim().replace(" ", "T") + "+09:00"); return isNaN(d.getTime()) ? "" : d.toISOString(); };

// 클리앙 알뜰구매: 행마다 제목(title 속성)·글 번호·썸네일·정확한 작성 시각(timestamp)
function parseClien(html, feed) {
  const rows = html.split(/<div class="list_item symph_row/).slice(1);
  return rows.map((r) => {
    const sn = (r.match(/data-board-sn=["']?(\d+)/) || r.match(/href="\/service\/board\/jirum\/(\d+)/) || [])[1];
    const title = decode((r.match(/<span class="list_subject"[^>]*title="([^"]*)"/) || [])[1] || "").trim();
    const img = (r.match(/class="list_thumbnail"[\s\S]*?<img src="(https:\/\/[^"]+)"/) || [])[1] || "";
    const ts = (r.match(/<span class="timestamp">([^<]+)<\/span>/) || [])[1] || "";
    if (!sn || !title) return null;
    return { title, link: `https://www.clien.net/service/board/jirum/${sn}`, source: feed.source, img, postedAt: kstIso(ts) };
  }).filter(Boolean);
}

// 딜바다 국내딜: 표 행마다 wr_id·제목·썸네일·시각("20:54" 오늘 / "10-26" 지난 날)
function parseDealbada(html, feed) {
  const rows = html.split(/<tr class=/).slice(1);
  const nowKst = new Date(Date.now() + 9 * 3600e3);
  const today = nowKst.toISOString().slice(0, 10);
  return rows.map((r) => {
    const sub = r.match(/<td class="td_subject">[\s\S]*?<a href="[^"]*wr_id=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!sub) return null;
    const title = strip(sub[2]).replace(/\s*댓글\s*\d+\s*개$/, "");
    const imgRaw = (r.match(/<td class="td_img">[\s\S]*?<img src=['"]([^'"]+)['"]/) || [])[1] || "";
    const img = imgRaw ? imgRaw.replace(/^\/\//, "https://").replace(/^http:\/\//, "https://") : "";
    const d = ((r.match(/<td class="td_date">([^<]+)<\/td>/) || [])[1] || "").trim();
    let postedAt = "";
    if (/^\d{1,2}:\d{2}$/.test(d)) {
      postedAt = kstIso(`${today} ${d.padStart(5, "0")}:00`);
      if (postedAt && new Date(postedAt).getTime() > Date.now() + 5 * 60e3) postedAt = new Date(new Date(postedAt).getTime() - 864e5).toISOString(); // 자정 넘김
    } else if (/^\d{2}-\d{2}$/.test(d)) {
      postedAt = kstIso(`${today.slice(0, 4)}-${d} 00:00:00`);
      if (postedAt && new Date(postedAt).getTime() > Date.now()) postedAt = kstIso(`${Number(today.slice(0, 4)) - 1}-${d} 00:00:00`); // 작년 글
    }
    if (!title) return null;
    return { title, link: `https://www.dealbada.com/bbs/board.php?bo_table=deal_domestic&wr_id=${sub[1]}`, source: feed.source, img, postedAt };
  }).filter(Boolean);
}

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
  const deals = feed.type === "html" ? feed.parse(text, feed) : parseRss(text, feed);
  if (deals.length === 0) throw new Error(`글 0건 (응답 앞부분: ${text.slice(0, 120).replace(/\s+/g, " ")})`);
  return deals;
}

const all = [];
const failed = [];
const perFeed = [];
for (const feed of FEEDS) {
  try {
    const deals = await fetchFeed(feed);
    perFeed.push({ name: feed.name, items: deals });
    console.log(`[collect] ${feed.name} ok items=${deals.length} img=${deals.filter((d) => d.img).length}`);
    all.push(...deals);
  } catch (e) {
    failed.push(feed.name);
    console.log(`::warning title=${feed.name} 수집 실패::${String(e.message || e)}`);
  }
}

if (process.env.DRY_RUN) {
  if (process.env.FEEDS_OUT) (await import("node:fs")).writeFileSync(process.env.FEEDS_OUT, JSON.stringify(perFeed));
  else console.log(JSON.stringify(all.slice(0, 3), null, 2));
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
