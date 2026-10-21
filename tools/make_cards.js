// 카드 공유 썸네일(1200x630)과 공유 페이지(c/<slug>/index.html)를 만든다.
// 사용: (hunter 폴더에서 python3 -m http.server 8765 실행 후) node tools/make_cards.js <stock 저장소 경로>
// 등급이 바뀌면 다시 돌려서 커밋하면 된다.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '.';
const SLUGS = ['1','2','3','3s','4','4s','5','5s','6','6s','7','8','9','11','13','13s','14','15','c1','c2','c3','c4'];
// 같은 규칙이라도 실전에서 다른 등급으로 뜰 수 있는 카드는 등급별 썸네일을 따로 만든다(c/<slug>-<등급>/)
const VAR = { '2': ['B'], '5': ['A'], '6': ['B'], '6s': ['B'], '8': ['B+'], '9': ['B'], '3': ['B'], '1': ['B'] };
const gcode = g => g.toLowerCase().replace('+', 'p').replace('-', 'm');
const ITEMS = SLUGS.map(s => [s, null]).concat(Object.entries(VAR).flatMap(([s, gs]) => gs.map(g => [s, g])));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/index.html'); await p.addStyleTag({ content: '.tc,.mc{transform:none!important}' });
  await p.waitForTimeout(600);
  await p.click('#bInfo'); await p.waitForTimeout(500);
  const meta = {};
  for (const [sl, og] of ITEMS) {
    const key = og ? sl + '-' + gcode(og) : sl;
    const m = await p.evaluate(async ([sl, og]) => {
      const H = window.__hx, i = H.RCARDS.findIndex(r => H.sl(H.rc(r)) === sl); if (i < 0) return null;
      const r = H.RCARDS[i], o = H.rc(r), mc = document.querySelector('.mc[data-i="' + i + '"]');
      let grade = mc.querySelector('.bdg').textContent.trim(); const ty = H.RTYPE[r[0]], name = o.s.slice(2), dark = r[0] === 13;
      if (og) { grade = og; }
      const ep = (mc.querySelector('.mw') || {}).textContent || '';
      let st = document.getElementById('ogStage'); if (st) st.remove();
      st = document.createElement('div'); st.id = 'ogStage';
      st.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:630px;z-index:999;overflow:hidden;font-family:inherit;' +
        (dark ? 'background:radial-gradient(80% 100% at 30% 30%,#3b4048,#15181c);color:#f1f3f5' : 'background:radial-gradient(80% 100% at 30% 30%,#fff,' + ty[1] + ' 75%,' + ty[1] + ');color:#1d232a');
      const o2 = Object.assign({}, o); if (og) o2.g = og;
      const C = document.createElement('div'); C.style.cssText = 'position:absolute;left:44px;top:30px;width:420px;zoom:1.42;pointer-events:none';
      C.innerHTML = H.card(o2); C.querySelectorAll('img').forEach(im => im.loading = 'eager');
      const tc = C.querySelector('.tc'); tc.style.margin = '0';
      const big = r[1], kn = r[2], bl = big.length;
      const R = document.createElement('div'); R.style.cssText = 'position:absolute;left:676px;right:44px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:14px;align-items:flex-start';
      R.innerHTML = '<div style="display:flex;align-items:center;gap:10px;font-size:22px;font-weight:900;opacity:.85"><img src="a/logo.webp" style="width:44px;height:44px;object-fit:contain">수리수리진타리</div>' +
        '<div style="zoom:1.9">' + H.badge(o2.g, 1, dark ? 'Z' : H.tier(o2.g)) + '</div>' +
        '<div style="font-size:' + (bl <= 4 ? 112 : bl <= 6 ? 90 : 70) + 'px;font-weight:900;letter-spacing:-2px;line-height:1">' + big + '</div>' +
        '<div style="font-size:28px;font-weight:800;opacity:.7;margin-top:-4px">' + kn + '</div>' +
        '<div style="font-size:30px;font-weight:900;letter-spacing:-.5px;line-height:1.2;word-break:keep-all">' + (dark && name.indexOf('매수 금지') < 0 ? '⛔ 매수 금지 · ' : '') + o.s.charAt(0) + ' ' + name + '</div>' +
        '<div style="margin-top:6px;font-size:20px;font-weight:800;padding:10px 20px;border-radius:999px;' + (dark ? 'background:#f1f3f5;color:#1d232a' : 'background:#1d232a;color:#fff') + '">카드 보러 가기 →</div>';
      st.append(C, R); document.body.appendChild(st);
      await Promise.all([...st.querySelectorAll('img')].map(im => im.complete ? 1 : new Promise(res => { im.onload = im.onerror = res; })));
      return { grade, name, dark, ep: ep.trim(), why: r[11] || r[15] || '', tick: r[1] };
    }, [sl, og]);
    if (!m) { console.log('skip', key); continue; }
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(OUT, 'c', key + '.jpg'), type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    m.sl = sl; meta[key] = m; console.log(key, m.grade, m.name);
  }
  await b.close();
  console.log('SHARE_OK', JSON.stringify(Object.keys(meta)));
  for (const [key, m] of Object.entries(meta)) { const sl = m.sl;
    const title = (m.dark && m.name.indexOf('매수 금지') < 0 ? '⛔ 매수 금지 · ' : m.dark ? '⛔ ' : '') + m.name + ' 카드 · ' + m.grade + '등급';
    const desc = (m.why ? m.why + ' ' : '') + '수리수리진타리에서 지금 이 카드를 확인하세요.';
    const img = 'https://stock.jintar.co.kr/c/' + key + '.jpg?v=' + Date.now().toString(36);
    const url = 'https://stock.jintar.co.kr/c/' + key + '/';
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | 수리수리진타리</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="수리수리진타리">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(m.name)} 카드">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${img}">
<link rel="icon" href="https://yoonjintar2-ctrl.github.io/bb/hunter/a/icon180.png?v=2">
<script>var h=(location.hash||'').replace(/^#/,'').replace(/[^A-Za-z0-9]/g,'');location.replace('/#c${sl}'+(h?'-'+h:''));</script>
</head><body style="font-family:sans-serif;color:#6b7580;text-align:center;padding-top:40vh"><a href="/#c${sl}">카드 보러 가기</a></body></html>
`;
    fs.mkdirSync(path.join(OUT, 'c', key), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'c', key, 'index.html'), html);
  }
})();
