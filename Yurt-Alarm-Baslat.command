#!/bin/bash
cd "$(dirname "$0")"
printf '\e[8;36;102t'
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı. Önce https://nodejs.org adresinden LTS sürümünü kur."
  open https://nodejs.org
  read -n 1 -s -r -p "Kapatmak için bir tuşa bas..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "İlk kurulum yapılıyor, biraz bekle..."
  npm install --omit=dev --no-audit --no-fund
fi
exec node --liftoff-only --max-semi-space-size=1 --max-old-space-size=64 index.js "$@"
