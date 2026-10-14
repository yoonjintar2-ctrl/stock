# stock
## 카드 공유 링크
- `c/<slug>/index.html`: 카드별 공유 페이지(카드 썸네일 OG) → `/#c<slug>-<티커>`로 이동해 그 카드 위치로 스크롤
- `c/<slug>.jpg`: 1200x630 썸네일
- 등급이 바뀌면 `bb/hunter`에서 `python3 -m http.server 8765` 실행 후 `node tools/make_cards.js .` 다시 돌려 커밋
