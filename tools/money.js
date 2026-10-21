// ⑬ 집 나간 돈이 돌아온다! — 유동성 + 방어주 쏠림 → c/money.json (2026-10-21)
// 유동성 = 연준 총자산(WALCL) − 재무부 일반계정(WTREGEN) − 역레포(RRPONTSYD×1000), 단위 백만 달러. '높음' = 직전 252거래일 평균보다 높음
// 방어주 = 코스트코·월마트·LLY·XLP·XLV 로그 평균, 나스닥 = QQQ. rel = 방어주 − 나스닥(로그)
// 신호 = 유동성 높음 & (rel 20거래일 변화 ≥ +5% 또는 60거래일 변화 ≥ +3%) → 다음 날 TQQQ, +40% 익절 / −25% 손절 / 최대 40거래일
// 검증(장부 'QQQ 절대가격' 4·5차): 2012~2026 31건 평균 +14.6% 승 74% · 아무 날 같은 방식보다 +11.1 / +8.8 / +6.7%p(2012~18 / 19~22 / 23~26)
const fs = require('fs');
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const INFO = 'https://wts-info-api.tossinvest.com/api';
const fred = async (id) => { const t = await (await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=2023-01-01`, { headers: { 'User-Agent': 'research yoonjintar2@gmail.com' } })).text();
  return t.trim().split('\n').slice(1).map(l => l.split(',')).filter(r => r[1] && r[1] !== '.').map(r => [r[0], +r[1]]); };
const toss = async (sym) => { const c = (await (await fetch(`${INFO}/v2/stock-infos/code-or-symbol/${sym}`, { headers: UA })).json()).result.code;
  let out = [], from = ''; for (let p = 0; p < 3; p++) { const j = await (await fetch(`${INFO}/v1/c-chart/us-s/${c}/day:1?count=400&useAdjustedRate=true` + (from ? '&from=' + encodeURIComponent(from) : ''), { headers: UA })).json(); const k = j.result.candles || []; out = k.slice().reverse().concat(out); from = j.result.nextDateTime; if (!from || k.length < 400) break; }
  const m = {}; out.forEach(x => m[x.dt.slice(0, 10)] = x.close); return m; };
const asof = (rows) => (d) => { let v = null; for (const [k, x] of rows) { if (k <= d) v = x; else break; } return v; };
(async () => {
  const [WA, TG, RR] = await Promise.all(['WALCL', 'WTREGEN', 'RRPONTSYD'].map(fred));
  const S = {}; for (const s of ['QQQ', 'COST', 'WMT', 'LLY', 'XLP', 'XLV']) S[s] = await toss(s);
  const days = Object.keys(S.QQQ).filter(d => ['COST', 'WMT', 'LLY', 'XLP', 'XLV'].every(s => S[s][d])).sort();
  const wa = asof(WA), tg = asof(TG), rr = asof(RR);
  const rows = days.map(d => { const l = wa(d) - tg(d) - (rr(d) || 0) * 1000; const def = ['COST', 'WMT', 'LLY', 'XLP', 'XLV'].reduce((a, s) => a + Math.log(S[s][d]), 0) / 5; return { d, liq: l, rel: def - Math.log(S.QQQ[d]) }; }).filter(r => isFinite(r.liq));
  const N = rows.length; if (N < 320) throw new Error('rows ' + N);
  const out = rows.map((r, i) => { if (i < 252) return null; let a = 0; for (let k = i - 252; k < i; k++) a += rows[k].liq; const avg = a / 252;
    const r20 = r.rel - rows[i - 20].rel, r60 = r.rel - rows[i - 60].rel; const hi = r.liq > avg;
    return { d: r.d, liq: Math.round(r.liq), avg: Math.round(avg), lp: +(r.liq / avg - 1).toFixed(4), r20: +r20.toFixed(4), r60: +r60.toFixed(4), hi, sig: hi && (r20 >= 0.05 || r60 >= 0.03) }; }).filter(Boolean);
  // 이번 신호 묶음의 첫날(이전 날들이 연속으로 신호였으면 거슬러 올라감)
  const last = out[out.length - 1]; let first = null; if (last.sig) { let i = out.length - 1; while (i > 0 && out[i - 1].sig) i--; first = out[i].d; }
  fs.writeFileSync('c/money.json', JSON.stringify({ upd: new Date().toISOString(), last, first, h: out.slice(-80) }));
  console.log(JSON.stringify(last), first);
})().catch(e => { console.error(e); process.exit(1); });
