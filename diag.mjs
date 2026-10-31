// 진단: 수집기가 평소 받는 뽐뿌 공식 RSS(수집기와 같은 UA, 같은 1회 요청)의 description에 상품 링크가 들어 있는지만 확인
const UA = "OneulTeukga-collector (+https://newdealmarket.com)";
const r = await fetch("https://www.ppomppu.co.kr/rss.php?id=ppomppu", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
const buf = Buffer.from(await r.arrayBuffer());
const xml = new TextDecoder(/euc-kr/i.test(r.headers.get("content-type") || "") ? "euc-kr" : "utf-8").decode(buf);
console.log("st", r.status, r.headers.get("content-type"));
const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
for (const it of items.slice(0, 3)) console.log("\n----\n" + it.slice(0, 1500));
