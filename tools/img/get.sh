mkdir -p imgout; i=0
while read -r u; do i=$((i+1)); curl -sL -m 60 -o imgout/v$i.jpg -w "v$i %{http_code} %{size_download}\n" "$u"; done < tools/img/urls.txt
ls -la imgout
