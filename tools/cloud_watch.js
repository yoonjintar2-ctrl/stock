// 클라우드 감시: 맥 크롬 탭이 하던 일(토스 탭에서 scanner.js 감시 + FRED 올리기 + 정시 검색 요청)을
// GitHub Actions의 머리 없는 크롬에서 그대로 돌림 → 맥을 켜 두거나 만질 필요 없음. 주문 기능 없음(시세 조회·계산만).
const { chromium } = require('playwright');
const RAW = 'https://raw.githubusercontent.com/yoonjintar2-ctrl/yoonjintar2-ctrl.github.io/main/bb/alert/';
const N = 'https://jipsa-relay.jipsa-e3839b.workers.dev/n/', REQ = 'berry-3059012bcc6b7db9-r';
const RUN_MIN = +(process.env.RUN_MIN || 340);
// 계산이 기억해 두는 것(카드 기록·규칙 성적·주간 점검 등)은 브라우저 저장소에 있음 → 30분마다 중계(-s)와 파일에 남기고, 시작할 때 되살림
const fs = require('fs');
const STOPIC = 'berry-3059012bcc6b7db9-s', SFILE = process.env.STATE_FILE || '/tmp/w/state/state.json';
const SKEYS = '^(cardlog|crisisState|d6seen|ruleStats|vlog|wkDone|riskAlert|riskLast|fundck3:|d6c5:)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date(Date.now() + 9 * 3600e3).toISOString().slice(5, 19), ...a);

(async () => {
  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });

  const startToss = async (page) => {
    await page.goto('https://www.tossinvest.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    let file = null; try { file = JSON.parse(fs.readFileSync(SFILE, 'utf8')); } catch (e) {}
    const restored = await page.evaluate(async ([N, STOPIC, file]) => {
      let o = null, from = '';
      try { const t = (await (await fetch(N + STOPIC + '/json?poll=1&since=latest')).text()).trim(); if (t) { const m = JSON.parse(t.split('\n').pop()); if (m.attachment && m.attachment.url) { o = await (await fetch(m.attachment.url)).json(); from = 'relay'; } } } catch (e) {}
      if (!o && file) { o = file; from = 'file'; }
      if (!o) return 'none';
      let n = 0; for (const k in o) { try { localStorage.setItem(k, o[k]); n++; } catch (e) {} }
      return from + ' ' + n;
    }, [N, STOPIC, file]);
    log('state restored:', restored);
    return page.evaluate(async (RAW) => {
      (0, eval)(await (await fetch(RAW + 'scanner.js?t=' + Date.now(), { cache: 'no-store' })).text());
      try { localStorage.removeItem('berryWatcher'); } catch (e) {}
      return window.__berryWatch();
    }, RAW);
  };
  const startFred = async (page) => {
    await page.goto('https://fred.stlouisfed.org/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    return page.evaluate(async (RAW) => {
      (0, eval)(await (await fetch(RAW + 'fredwatch.js?t=' + Date.now(), { cache: 'no-store' })).text());
      return window.__fredWatch();
    }, RAW);
  };

  let toss = await ctx.newPage(), fred = await ctx.newPage();
  const hook = (p, name) => p.on('console', m => { if (m.type() === 'error') log(name + ' console:', m.text().slice(0, 200)); });
  hook(toss, 'toss');
  try { log('toss', await startToss(toss)); } catch (e) { log('toss start ERR', String(e).slice(0, 300)); }
  try { log('fred', await startFred(fred)); } catch (e) { log('fred start ERR', String(e).slice(0, 300)); }

  const post = (message) => toss.evaluate(([N, REQ, message]) => fetch(N, { method: 'POST', body: JSON.stringify({ topic: REQ, title: '검색 요청', message }) }).then(r => r.status), [N, REQ, message]);
  await sleep(3000);
  try { log('first scan', await post('scan sched cloud start')); } catch (e) { log('first scan ERR', String(e).slice(0, 200)); }

  const saveState = async () => {
    try {
      const o = await toss.evaluate(async ([N, STOPIC, SKEYS]) => {
        const re = new RegExp(SKEYS), o = {}; for (const k of Object.keys(localStorage)) if (re.test(k)) o[k] = localStorage.getItem(k);
        if (!Object.keys(o).length) return null;
        await fetch(N + STOPIC, { method: 'PUT', headers: { Filename: 'state.json', Title: 'state cloud' }, body: JSON.stringify(o) });
        return o;
      }, [N, STOPIC, SKEYS]);
      if (o) { fs.mkdirSync(require('path').dirname(SFILE), { recursive: true }); fs.writeFileSync(SFILE, JSON.stringify(o)); log('state saved', Object.keys(o).length); }
    } catch (e) { log('state save ERR', String(e).slice(0, 200)); }
  };
  const t0 = Date.now(); let lastSlot = '', tick = 0;
  while (Date.now() - t0 < RUN_MIN * 60e3) {
    await sleep(20000); tick++;
    // 정시 검색: 매시 정각 · 08:50 · 미국장 시간(22:30~06:00)엔 10분마다
    const k = new Date(Date.now() + 9 * 3600e3), h = k.getUTCHours(), m = k.getUTCMinutes(), hm = h * 60 + m;
    const us = hm >= 22 * 60 + 30 || hm < 6 * 60, slot = k.toISOString().slice(0, 16);
    if ((m === 0 || (h === 8 && m === 50) || (us && m % 10 === 0)) && slot !== lastSlot) {
      lastSlot = slot;
      try { log('sched', slot.slice(11), await post('scan sched cloud ' + slot.slice(11))); } catch (e) { log('sched ERR', String(e).slice(0, 200)); }
    }
    if (tick % 90 === 0) await saveState();
    if (tick % 15 === 0 || tick === 4) { // 5분마다(시작 직후 한 번 더) 상태 확인, 죽었으면 다시 켬
      let st = null;
      try { st = await toss.evaluate(() => { const s = window.__berryWatchState; return s ? { alive: s.alive, rs: s.es && s.es.readyState, handled: s.handled, last: s.last, pub: window.__berryPubStatus || '' } : null; }); } catch (e) { st = null; }
      log('state', JSON.stringify(st));
      if (!st || !st.alive) { try { await toss.close().catch(() => {}); toss = await ctx.newPage(); hook(toss, 'toss'); log('toss restart', await startToss(toss)); } catch (e) { log('toss restart ERR', String(e).slice(0, 200)); } }
      let fs = null; try { fs = await fred.evaluate(() => window.__fredWatchState ? (window.__fredWatchState.last || 'starting') : null); } catch (e) {}
      if (tick % 60 === 0 || tick === 4) log('fred', fs);
      if (fs == null) { try { await fred.close().catch(() => {}); fred = await ctx.newPage(); log('fred restart', await startFred(fred)); } catch (e) { log('fred restart ERR', String(e).slice(0, 200)); } }
    }
  }
  await saveState();
  log('done'); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
