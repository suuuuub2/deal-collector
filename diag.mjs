// 진단: robots.txt 확인 + 뽐뿌 글 페이지 1건을 수집기와 같은 UA(정직한 봇 표시)로 1회만 열어 구조 확인
const UA = "Mozilla/5.0 (compatible; OneulTeukga/1.0; +https://newdealmarket.com)";
const get = async (u) => {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "";
    const enc = /euc-kr/i.test(ct) || /charset=["']?euc-kr/i.test(buf.toString("latin1").slice(0, 3000)) ? "euc-kr" : "utf-8";
    return { st: r.status, ct, fin: r.url, html: new TextDecoder(enc).decode(buf) };
  } catch (e) { return { st: 0, err: String(e), html: "" }; }
};
for (const u of ["https://www.ppomppu.co.kr/robots.txt", "https://www.fmkorea.com/robots.txt"]) {
  const r = await get(u);
  console.log(`\n## ${u} st=${r.st} ${r.err || ""}\n${r.html.slice(0, 1500)}`);
}
const rss = await get("https://www.ppomppu.co.kr/rss.php?id=ppomppu");
const link = ((rss.html.match(/<link>(http[^<]*view\.php[^<]*)<\/link>/) || [])[1] || "").replace(/&amp;/g, "&");
const p = await get(link);
const h = p.html;
console.log(`\n## post ${link} st=${p.st} ct=${p.ct} len=${h.length} fin=${p.fin}`);
console.log("title:", (h.match(/<title>([^<]*)/i) || [])[1]);
console.log("og/meta:", [...h.matchAll(/<meta[^>]+(?:og:|twitter:)[^>]*>/gi)].map((m) => m[0].slice(0, 200)));
const hrefs = [...new Set([...h.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, "&")))];
console.log("hrefs total:", hrefs.length);
console.log("candidates:", hrefs.filter((u) => /s\.ppomppu|target=|link\.php|outlink|gmarket|coupang|11st|auction|lotteon|ssg|naver|aliexpress|coupa\.ng/i.test(u)).slice(0, 10));
for (const kw of ["scrap_url", "wordfix", "원문", "링크", "<img"]) {
  const i = h.indexOf(kw);
  if (i >= 0) console.log(`\n[${kw}] ...${h.slice(Math.max(0, i - 150), i + 350).replace(/\s+/g, " ")}`);
}
if (h.length < 3000) console.log("\nBODY:", h);
