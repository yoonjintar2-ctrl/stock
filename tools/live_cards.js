// 지금 떠 있는 개별주 카드(④⑦⑧ 등)마다 공유 페이지 c/<slug>/<티커>/ 와 썸네일 c/<slug>/<티커>.jpg 를 만든다.
// GitHub Actions(.github/workflows/cards.yml)가 10분마다 실행. 새 카드가 없으면 아무것도 안 함.
// 사용: node tools/live_cards.js plan  → 만들 게 있으면 todo.json 쓰고 'NEED' 출력
//       node tools/live_cards.js build → (hunter 사이트를 localhost:8765에 띄운 뒤) todo.json대로 생성, c/live.json 갱신
const fs = require('fs'), path = require('path');
const TOPIC = 'berry-3059012bcc6b7db9-a', FIXED = ['1','2','3','3s','5','5s','6','6s','9','9s','11','13','13s','14','c1','c2','c3','c4'];
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪ⓒⓏ⑫';
const ruleNo = s => { s = (s || '').trim(); const i = CIRC.indexOf(s.charAt(0)); return i < 0 ? 0 : i + 1; };
const slugOf = c => { const no = ruleNo(c.s); return no ? no + (c.v ? 's' : '') : ''; };
const tickOf = c => { const t = String((c.m === 'KR' && c.code) || (/[A-Za-z]/.test(c.n || '') ? c.n : c.code) || c.n || '').replace(/[^A-Za-z0-9]/g, ''); return t.slice(0, 24); };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const LIVE = 'c/live.json';
(async () => {
  const mode = process.argv[2];
  if (mode === 'plan') {
    const t = await (await fetch(`https://ntfy.sh/${TOPIC}/json?poll=1&since=12h`)).text();
    let best = null, bt = 0;
    for (const l of t.split('\n')) { if (!l) continue; try { const m = JSON.parse(l); const b = String(m.message || ''); if (b[0] !== '{') continue; const j = JSON.parse(b); if ((j.v || 0) >= 2 && m.time >= bt) { best = j; bt = m.time; } } catch (e) {} }
    const live = fs.existsSync(LIVE) ? JSON.parse(fs.readFileSync(LIVE, 'utf8')) : {};
    const todo = [];
    for (const c of (best && best.cards) || []) { const sl = slugOf(c), tk = tickOf(c); if (!sl || !tk || FIXED.includes(sl)) continue; const k = sl + '/' + tk; if (!live[k] || live[k].g !== c.g) todo.push(c); }
    fs.writeFileSync('todo.json', JSON.stringify(todo));
    console.log(todo.length ? 'NEED ' + todo.map(c => slugOf(c) + '/' + tickOf(c)).join(' ') : 'NONE');
    return;
  }
  const { chromium } = require('playwright');
  const todo = JSON.parse(fs.readFileSync('todo.json', 'utf8')); if (!todo.length) return;
  const live = fs.existsSync(LIVE) ? JSON.parse(fs.readFileSync(LIVE, 'utf8')) : {};
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
  for (const c of todo) {
    const sl = slugOf(c), tk = tickOf(c);
    const m = await p.evaluate(async (c) => {
      const H = window.__hx, no = (c.s || '').trim().charAt(0), ty = H.RTYPE['①②③④⑤⑥⑦⑧⑨⑩⑪ⓒⓏ⑫'.indexOf(no) + 1] || ['#5c7cfa', '#dbe4ff'];
      const T = H.tier(c.g), name = (c.s || '').slice(2);
      let st = document.getElementById('ogStage'); if (st) st.remove();
      st = document.createElement('div'); st.id = 'ogStage';
      st.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:630px;z-index:999;overflow:hidden;font-family:inherit;background:radial-gradient(80% 100% at 30% 30%,#fff,' + ty[1] + ' 75%,' + ty[1] + ');color:#1d232a';
      const C = document.createElement('div'); C.style.cssText = 'position:absolute;left:44px;top:30px;width:420px;zoom:1.42;pointer-events:none';
      C.innerHTML = H.card(Object.assign({}, c, { ln: c.ln })); C.querySelectorAll('img').forEach(im => im.loading = 'eager'); C.querySelectorAll('.freqo').forEach(x => x.remove());
      C.querySelector('.tc').style.margin = '0';
      const big = c.n, bl = big.length, sub = c.kn && c.kn !== c.n ? c.kn : '';
      const R = document.createElement('div'); R.style.cssText = 'position:absolute;left:676px;right:44px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:14px;align-items:flex-start';
      R.innerHTML = '<div style="display:flex;align-items:center;gap:10px;font-size:22px;font-weight:900;opacity:.85"><img src="a/logo.webp" style="width:44px;height:44px;object-fit:contain">수리수리진타리</div>' +
        '<div style="zoom:1.9">' + H.badge(c.g, 1, T) + '</div>' +
        '<div style="font-size:' + (bl <= 4 ? 112 : bl <= 6 ? 90 : bl <= 9 ? 64 : 48) + 'px;font-weight:900;letter-spacing:-2px;line-height:1;word-break:keep-all">' + big + '</div>' +
        (sub ? '<div style="font-size:28px;font-weight:800;opacity:.7;margin-top:-4px">' + sub + '</div>' : '') +
        '<div style="font-size:30px;font-weight:900;letter-spacing:-.5px;line-height:1.2;word-break:keep-all">' + no + ' ' + name + '</div>' +
        '<div style="margin-top:6px;font-size:20px;font-weight:800;padding:10px 20px;border-radius:999px;background:#1d232a;color:#fff">카드 보러 가기 →</div>';
      st.append(C, R); document.body.appendChild(st);
      await Promise.all([...st.querySelectorAll('img')].map(im => im.complete ? 1 : new Promise(res => { im.onload = im.onerror = res; })));
      return { name, sub };
    }, c);
    await p.waitForTimeout(300);
    fs.mkdirSync(path.join('c', sl, tk), { recursive: true });
    await p.screenshot({ path: path.join('c', sl, tk + '.jpg'), type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    const title = c.n + (m.sub ? ' ' + m.sub : '') + ' · ' + m.name + ' · ' + c.g + '등급';
    const desc = (c.why ? String(c.why).slice(0, 110) + ' ' : '') + '수리수리진타리에서 이 카드를 확인하세요.';
    const v = Date.now().toString(36), img = `https://stock.jintar.co.kr/c/${sl}/${tk}.jpg?v=${v}`, url = `https://stock.jintar.co.kr/c/${sl}/${tk}/`;
    fs.writeFileSync(path.join('c', sl, tk, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | 수리수리진타리</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="수리수리진타리">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:image" content="${img}">
<link rel="icon" href="https://yoonjintar2-ctrl.github.io/bb/hunter/a/icon180.png?v=2">
<script>location.replace('/#c${sl}-${tk}');</script>
</head><body style="font-family:sans-serif;color:#6b7580;text-align:center;padding-top:40vh"><a href="/#c${sl}-${tk}">카드 보러 가기</a></body></html>
`);
    live[sl + '/' + tk] = { g: c.g, t: Math.floor(Date.now() / 1000) };
    console.log('made', sl + '/' + tk, c.g);
  }
  await b.close();
  fs.writeFileSync(LIVE, JSON.stringify(live));
})();
