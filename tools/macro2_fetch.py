import os,time,urllib.request
os.makedirs('mac2',exist_ok=True)
UA={'User-Agent':'research yoonjintar2@gmail.com'}
for s in ['BAA10Y','VIXCLS','T10Y2Y','T10Y3M','DGS2','NFCI','ICSA','DEXJPUS','CBBTCUSD','THREEFYTP10','DFF','DEXKOUS','DEXCHUS','DCOILBRENTEU','STLFSI4','SP500']:
    for i in range(4):
        try:
            b=urllib.request.urlopen(urllib.request.Request(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={s}',headers=UA),timeout=60).read()
            open(f'mac2/{s}.csv','wb').write(b); print(s,len(b)); break
        except Exception as e: print('retry',s,e); time.sleep(5)
