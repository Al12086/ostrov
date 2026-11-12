#!/usr/bin/env bash
# «Королевство принцессы» на сервере Timeweb: https://kjacargo.ru/kingdom/
# Запуск из папки ostrov:  sudo bash kingdom/install.sh
# Повторный запуск = обновление игры. Сохранения (папка data) не трогает.
# Остальные сайты не трогает: в настройки kjacargo.ru добавляется одна строка include, при ошибке всё откатывается.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

DOMAIN=kjacargo.ru
OLD=https://kingdom.kjacargo.ru
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/var/www/kingdom
SNIP=/etc/nginx/snippets/kingdom.conf

ok()   { echo -e "\033[32m[готово]\033[0m $*"; }
info() { echo -e "\033[36m[шаг]\033[0m $*"; }
stop() { echo -e "\n\033[31m[СТОП]\033[0m $*\nСкопируй всё, что выше, и отправь Claude."; exit 1; }

[ "$(id -u)" = "0" ] || stop "Запусти с sudo: sudo bash kingdom/install.sh"
command -v nginx >/dev/null 2>&1 || stop "На сервере нет nginx — а сайт $DOMAIN должен работать через него."

# ---------- 1. PHP ----------
if ! ls /run/php/php*-fpm.sock >/dev/null 2>&1; then
  info "Ставлю PHP (нужен для сохранений и озвучки)"
  apt-get update -qq && apt-get install -y -qq php-fpm php-curl php-mbstring >/dev/null
fi
PHPV="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
systemctl enable -q --now "php$PHPV-fpm"
SOCK="$(ls /run/php/php$PHPV-fpm.sock 2>/dev/null || ls /run/php/php*-fpm.sock | head -n1)"
[ -S "$SOCK" ] || stop "PHP установлен, но не запустился."
ok "PHP $PHPV"

# ---------- 2. Файлы игры ----------
info "Копирую игру в $APP"
mkdir -p "$APP/data"
for f in index.html sw.js manifest.webmanifest api.php; do install -m 644 "$SRC/$f" "$APP/$f"; done
for d in css js img fonts icons; do rm -rf "${APP:?}/$d"; cp -r "$SRC/$d" "$APP/$d"; done
chown -R root:root "$APP"; find "$APP" -path "$APP/data" -prune -o -type d -exec chmod 755 {} + ; 
chown -R www-data:www-data "$APP/data"; chmod 700 "$APP/data"
ok "Файлы на месте ($(cat "$SRC/js/game.js" | sed -n 's/^const APP_VER = \([0-9]*\).*/версия \1/p'))"

# ---------- 3. nginx ----------
info "Подключаю адрес https://$DOMAIN/kingdom/"
mkdir -p /etc/nginx/snippets
cat > "$SNIP" <<NGINX
# Королевство принцессы — подключается строкой include в сайт $DOMAIN
location = /kingdom { return 301 /kingdom/; }
location ^~ /kingdom/data/ { deny all; return 404; }
location = /kingdom/api.php {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $APP/api.php;
    fastcgi_pass unix:$SOCK;
    fastcgi_read_timeout 600s;
    client_max_body_size 8m;
}
location = /kingdom/sw.js { alias $APP/sw.js; add_header Cache-Control "no-cache"; }
location = /kingdom/manifest.webmanifest { alias $APP/manifest.webmanifest; default_type application/manifest+json; }
location ^~ /kingdom/ {
    alias $APP/;
    index index.html;
    location ~ \.php\$ { return 404; }
}
NGINX

# какие файлы настроек отвечают за $DOMAIN
mapfile -t FILES < <(grep -rlE "server_name[^;]*[[:space:]]$DOMAIN([[:space:]]|;)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | xargs -r -n1 readlink -f | sort -u)
[ "${#FILES[@]}" -gt 0 ] || stop "Не нашёл в nginx сайт $DOMAIN."
STAMP="$(date +%s)"
for f in "${FILES[@]}"; do cp -p "$f" "$f.before-kingdom.$STAMP"; done
python3 - "$DOMAIN" "${FILES[@]}" <<'PY'
import re, sys
dom, files = sys.argv[1], sys.argv[2:]
inc = "    include snippets/kingdom.conf;   # Королевство принцессы\n"
for fn in files:
    lines = open(fn, encoding='utf-8').read().split('\n')
    # границы блоков server { ... }
    blocks, depth, start = [], 0, None
    for i, l in enumerate(lines):
        code = l.split('#', 1)[0]
        if start is None and re.match(r'\s*server\s*\{', code) and depth == 0: start = i
        depth += code.count('{') - code.count('}')
        if start is not None and depth == 0: blocks.append((start, i)); start = None
    def mine(a, b):
        return any(re.search(r'server_name[^;]*\s' + re.escape(dom) + r'[\s;]', lines[k].split('#', 1)[0]) for k in range(a, b + 1))
    def ssl(a, b):
        return any(re.search(r'listen\s+(\[::\]:)?443', lines[k]) for k in range(a, b + 1))
    targets = [bl for bl in blocks if mine(*bl)]
    if any(ssl(*bl) for bl in targets): targets = [bl for bl in targets if ssl(*bl)]
    for a, b in sorted(targets, reverse=True):
        if any('snippets/kingdom.conf' in lines[k] for k in range(a, b + 1)): continue
        k = next(k for k in range(a, b + 1) if re.search(r'server_name', lines[k]))
        lines.insert(k + 1, inc.rstrip('\n'))
    open(fn, 'w', encoding='utf-8').write('\n'.join(lines))
PY
if ! nginx -t 2>/tmp/kingdom-nginx.log; then
  cat /tmp/kingdom-nginx.log
  for f in "${FILES[@]}"; do cp -p "$f.before-kingdom.$STAMP" "$f"; done
  stop "nginx не принял настройку — я вернул всё как было, сайт $DOMAIN работает по-старому."
fi
systemctl reload nginx
ok "Адрес подключён"

# ---------- 4. Перенос сохранений со старого сайта (через его api.php, доступ к Beget не нужен) ----------
if [ -z "$(ls -A "$APP/data" 2>/dev/null | grep -v '^.htaccess$' || true)" ] && [ -t 0 ]; then
  echo
  echo "Перенести игры и озвучку со старого сайта $OLD?"
  echo "Нужен пароль владельца из игры (тот, что вводишь на вкладке «Голос»). Пустой ответ — пропустить."
  read -rs -p "Пароль владельца: " ADM; echo
  if [ -n "$ADM" ]; then
    info "Забираю данные со старого сайта"
    if ADM="$ADM" php "$SRC/migrate.php" "$OLD" "$APP/data"; then
      chown -R www-data:www-data "$APP/data"
      ok "Данные перенесены. Ключ Яндекса старый сайт не отдаёт: введи его заново в игре, вкладка «Голос»."
    else
      rm -rf "${APP:?}/data/"*; echo "Перенос не удался (см. выше). Можно запустить установку ещё раз."
    fi
  fi
fi

# ---------- 5. Проверка ----------
R="$(curl -s --max-time 10 "https://$DOMAIN/kingdom/api.php?a=ping" || true)"
echo "$R" | grep -q '"ok":true' || stop "Игра скопирована, но https://$DOMAIN/kingdom/api.php не отвечает: $R"
curl -fs --max-time 10 "https://$DOMAIN/kingdom/" | grep -q "Королевство\|kingdom" || stop "Страница https://$DOMAIN/kingdom/ не открылась."
echo -e "\n\033[32m===== ВСЁ ГОТОВО =====\033[0m\nОткрывай на планшете:  https://$DOMAIN/kingdom/\n"
