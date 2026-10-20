import json,sys,gzip,time,os,urllib.request,urllib.parse,concurrent.futures as cf
B='https://wts-info-api.tossinvest.com/api'
UA={'User-Agent':'Mozilla/5.0','Accept':'application/json'}
def get(u):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30) as r: return json.load(r)
        except Exception: time.sleep(2+i*3)
    return None
def fetch(sym):
    try:
        if sym.startswith('A') and sym[1:].isdigit(): mk,c='kr-s',sym
        else:
            j=get(f'{B}/v2/stock-infos/code-or-symbol/{sym}')
            if not j: return sym,0
            mk,c='us-s',j['result']['code']
        out=[]; frm=''
        for p in range(15):
            j=get(f'{B}/v1/c-chart/{mk}/{c}/day:1?count=400&useAdjustedRate=true'+('&from='+urllib.parse.quote(frm) if frm else ''))
            if not j: break
            k=j['result'].get('candles') or []
            out+= [[x['dt'][:10],x['open'],x['high'],x['low'],x['close'],x['volume']] for x in k]
            frm=j['result'].get('nextDateTime')
            if not frm or len(k)<400 or k[-1]['dt']<'2010': break
        out.reverse()
        with gzip.open(f'd1/{sym}.json.gz','wt') as f: json.dump(out,f,separators=(',',':'))
        return sym,len(out)
    except Exception as e: return sym,'E'+str(e)[:50]
os.makedirs('d1',exist_ok=True)
syms=open(sys.argv[1]).read().split()
with cf.ThreadPoolExecutor(6) as ex:
    for r in ex.map(fetch,syms): print(r,flush=True)
