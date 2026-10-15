// 나스닥100 선물(NQ) 초과 베이시스 → c/basis.json (2026-10-15)
// 초과 베이시스 = (NQ 선물 / 나스닥100 − 1) − (3개월 국채 금리 − QQQ 배당수익률) × 만기까지 일수 / 365
// 만기 12일 전 ~ 4일 뒤(교체일 왜곡)는 제외. 날짜 d의 값 = d 이전 5거래일 평균(선물 종가가 1시간 늦어 d 당일은 안 씀), p = 직전 252개 대비 백분위
// 검증(장부 '선물·현물 가격 차이'): ⑨ SOXL 신호 때 p < 1/3(선물이 쌈 = 헤지 매도 많음)이면 2010년대 +3.7% vs +16.8%, 2020년대 −2.3% vs +8.7%
const fs = require('fs');
const UA = { 'User-Agent': 'Mozilla/5.0' };
const get = async (s) => {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=0&period2=9999999999&interval=1d&events=div`, { headers: UA });
  if (!r.ok) throw new Error(s + ' ' + r.status);
  const res = (await r.json()).chart.result[0], q = res.indicators.quote[0], out = {};
  res.timestamp.forEach((t, i) => { if (q.close[i] == null) return; out[new Date((t + res.meta.gmtoffset) * 1000).toISOString().slice(0, 10)] = q.close[i]; });
  const div = Object.values((res.events || {}).dividends || {}).map(x => ({ d: new Date(x.date * 1000).toISOString().slice(0, 10), a: x.amount }));
  return { c: out, div };
};
(async () => {
  const [F, S, I, Q] = await Promise.all(['NQ=F', '^NDX', '^IRX', 'QQQ'].map(get));
  const day = (s) => Date.parse(s + 'T00:00:00Z') / 864e5;
  const exp = []; for (let y = 2000; y <= 2035; y++) for (const m of [2, 5, 8, 11]) { const d = new Date(Date.UTC(y, m, 1)); exp.push(new Date(Date.UTC(y, m, 1 + ((5 - d.getUTCDay() + 7) % 7) + 14)).toISOString().slice(0, 10)); }
  const ds = Object.keys(F.c).filter(d => S.c[d] && d >= '2010-01-01').sort();
  const b = {}; ds.forEach(d => b[d] = F.c[d] / S.c[d] - 1);
  const roll = {}; exp.forEach(e => { let best = null, bj = -1; ds.forEach((d, k) => { if (k < 1 || day(d) < day(e) - 16 || day(d) > day(e)) return; const j = b[d] - b[ds[k - 1]]; if (j > bj) { bj = j; best = d; } }); roll[e] = best; });
  let irx = null; const eb = [];
  ds.forEach(d => {
    if (I.c[d] != null) irx = I.c[d]; if (irx == null) return;
    const ci = exp.findIndex(e => day(e) >= day(d)); let e = exp[ci]; if (roll[e] && d >= roll[e]) e = exp[ci + 1];
    const near = exp.some(x => day(d) >= day(x) - 12 && day(d) <= day(x) + 4);
    let dv = 0; Q.div.forEach(x => { if (day(x.d) > day(d) - 365 && day(x.d) <= day(d)) dv += x.a; });
    const q = Q.c[d] ? dv / Q.c[d] : 0;
    eb.push({ d, v: near ? null : b[d] - (irx / 100 - q) * (day(e) - day(d)) / 365 });
  });
  const e5At = (i) => { const w = eb.slice(Math.max(0, i - 5), i).map(x => x.v).filter(v => v != null); return w.length >= 3 ? w.reduce((a, c) => a + c, 0) / w.length : null; };
  const ser = []; for (let i = 6; i <= eb.length; i++) ser.push({ d: i < eb.length ? eb[i].d : 'next', e5: e5At(i) });
  const vals = ser.filter(x => x.e5 != null);
  const out = { upd: new Date().toISOString(), last: eb[eb.length - 1].d, m: {} };
  vals.forEach((x, k) => { if (k < 252) return; let c = 0; for (let j = k - 252; j < k; j++) if (vals[j].e5 < x.e5) c++; const o = { e5: +(x.e5 * 100).toFixed(3), p: +(c / 252).toFixed(3) }; if (x.d === 'next') out.next = o; else if (k >= vals.length - 61) out.m[x.d] = o; });
  fs.writeFileSync('c/basis.json', JSON.stringify(out));
  console.log('basis', out.last, JSON.stringify(out.next), Object.keys(out.m).length);
})().catch(e => { console.error(e); process.exit(1); });
