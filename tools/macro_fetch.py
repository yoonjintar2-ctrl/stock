import json,os,time,urllib.request,csv,io
os.makedirs('mac',exist_ok=True)
UA={'User-Agent':'research yoonjintar2@gmail.com','Accept':'*/*'}
def get(u,t=60):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=t) as r: return r.read()
        except Exception as e: err=e; time.sleep(3+i*5)
    print('FAIL',u,err); return None
for s in ['DCOILWTICO','DTWEXBGS','WALCL','WTREGEN','RRPONTSYD','DFII10','DGS10','M2SL','BAMLH0A0HYM2','T10YIE']:
    b=get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={s}')
    if b: open(f'mac/{s}.csv','wb').write(b); print(s,len(b))
CIK={'AAPL':320193,'MSFT':789019,'NVDA':1045810,'AMZN':1018724,'GOOGL':1652044,'META':1326801,'TSLA':1318605,'AVGO':1730168,'COST':909832,'NFLX':1065280,'AMD':2488,'ADBE':796343,'PEP':77476,'CSCO':858877,'QCOM':804328,'INTC':50863}
for s,c in CIK.items():
    b=get(f'https://data.sec.gov/api/xbrl/companyfacts/CIK{c:010d}.json',120)
    if not b: continue
    j=json.loads(b); g=j['facts'].get('us-gaap',{}); out={}
    for tag in ['Revenues','RevenueFromContractWithCustomerExcludingAssessedTax','SalesRevenueNet','RevenueFromContractWithCustomerIncludingAssessedTax','SalesRevenueGoodsNet']:
        for u in (g.get(tag,{}).get('units',{}).get('USD',[])):
            if 'start' not in u: continue
            out.setdefault(tag,[]).append([u['start'],u['end'],u['val'],u.get('filed'),u.get('form')])
    json.dump(out,open(f'mac/rev_{s}.json','w')); print(s,{k:len(v) for k,v in out.items()})
    time.sleep(0.3)
