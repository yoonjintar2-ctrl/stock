import json,sys,gzip,time,urllib.request,urllib.parse,concurrent.futures as cf
B='https://wts-info-api.tossinvest.com/api'
UA={'User-Agent':'Mozilla/5.0','Accept':'application/json'}
def get(u):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30) as r: return json.load(r)
        except Exception as e: time.sleep(2+i*3)
    raise RuntimeError(u)
def code(s): return get(f'{B}/v2/stock-infos/code-or-symbol/{s}')['result']['code']
def fetch(sym,since):
    c=code(sym); out=[]; frm=''; n=0
    while True:
        u=f'{B}/v1/c-chart/us-s/{c}/min:1?count=400&useAdjustedRate=true'+('&from='+urllib.parse.quote(frm) if frm else '')
        j=get(u)['result']; k=j.get('candles') or []
        for x in k:
            if x.get('sessionType')=='main': out.append([x['dt'][:16],x['open'],x['high'],x['low'],x['close'],x['volume']])
        n+=1; frm=j.get('nextDateTime')
        if not k or not frm or k[-1]['dt']<since: break
        time.sleep(0.05)
    out=[r for r in out if r[0]>=since]; out.reverse()
    with gzip.open(f'm1/{sym}.json.gz','wt') as f: json.dump(out,f,separators=(',',':'))
    return sym,n,len(out),out[0][0] if out else None
import os; os.makedirs('m1',exist_ok=True)
syms=sys.argv[2].split(','); since=sys.argv[1]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(lambda s: fetch(s,since), syms): print(r,flush=True)
