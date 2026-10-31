// 진단 전용: 이미지 없는 글 → 글 페이지 → 본문 외부 링크 → 쇼핑몰 og:image 가 되는지 확인
import fs from "node:fs";
const feeds = JSON.parse(fs.readFileSync("feeds.json", "utf8"));
const BH = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
};
const get = async (url, ref) => {
  try {
    const r = await fetch(url, { headers: ref ? { ...BH, Referer: ref } : BH, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const buf = Buffer.from(await r.arrayBuffer());
    return { st: r.status, fin: r.url, html: buf.toString("latin1") };
  } catch (e) { return { st: 0, err: String(e.message || e), html: "" }; }
};
const og = (h) => (h.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i) || [])[1] || "";
const unwrap = (u) => {
  try {
    const x = new URL(u);
    for (const k of ["target", "url", "u", "link", "goto"]) {
      const v = x.searchParams.get(k); if (!v) continue;
      if (/^https?:/i.test(v)) return v;
      try { const d = Buffer.from(v, "base64").toString("utf8"); if (/^https?:/i.test(d)) return d; } catch (e) {}
    }
  } catch (e) {}
  return u;
};
for (const f of feeds) {
  const noimg = f.items.filter((d) => !d.img).slice(0, 6);
  console.log(`\n=== ${f.name}: 전체 ${f.items.length}, 이미지없음 ${f.items.filter((d) => !d.img).length}`);
  for (const d of noimg) {
    const p = await get(d.link);
    const base = new URL(d.link);
    const hrefs = [...p.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1].replace(/&amp;/g, "&"), d.link).href; } catch (e) { return ""; } })
      .filter((u) => u.startsWith("http") && !new URL(u).hostname.endsWith(base.hostname.replace(/^www\./, "").replace(/^bbs\./, "")));
    const ext = [...new Set(hrefs.map(unwrap))].filter((u) => !/(google|facebook|twitter|kakao|naver\.com\/?$|apple|play\.google|instagram|youtube|ppomppu|ruliweb|clien|dealbada|daum|w3\.org|schema)/i.test(new URL(u).hostname));
    console.log(`- post st=${p.st}${p.err ? " err=" + p.err : ""} postOg=${og(p.html) ? "Y" : "N"} ext=${ext.length} ${d.link}`);
    for (const u of ext.slice(0, 2)) {
      const m = await get(u, d.link);
      console.log(`    mall st=${m.st}${m.err ? " err=" + m.err : ""} fin=${m.fin ? new URL(m.fin).hostname : "-"} og=${og(m.html) ? og(m.html).slice(0, 90) : "N"}  <- ${u.slice(0, 110)}`);
    }
  }
}
