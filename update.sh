#!/usr/bin/env bash
# Обновление игры после того, как новые файлы загружены на GitHub. Запуск:  sudo bash update.sh
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
for f in server.js index.html manifest.json icon.svg icon-192.png icon-512.png; do install -m 644 "$f" "/opt/ostrov/$f"; done
systemctl restart ostrov
sleep 1.5
curl -fs http://127.0.0.1:3210/health >/dev/null && echo "Готово: игра обновлена и работает." || { echo "Игра не запустилась, отправь это Claude:"; journalctl -u ostrov -n 20 --no-pager; exit 1; }
