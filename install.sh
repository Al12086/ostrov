#!/usr/bin/env bash
# Установка игры «Остров» на сервер (Ubuntu). Запуск:  sudo bash install.sh ИМЯ-САЙТА
# Чужие сайты на сервере не трогает: добавляет только свой отдельный файл настроек.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

DOMAIN="${1:-}"
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/ostrov
DATA=/var/lib/ostrov
ENVF=/etc/ostrov.env
PORT=3210

ok()   { echo -e "\033[32m[готово]\033[0m $*"; }
info() { echo -e "\033[36m[шаг]\033[0m $*"; }
stop() { echo -e "\n\033[31m[СТОП]\033[0m $*\nНичего не сломано. Скопируй всё, что выше, и отправь Claude."; exit 1; }

[ "$(id -u)" = "0" ] || stop "Запусти с sudo: sudo bash install.sh $DOMAIN"
[ -n "$DOMAIN" ] || stop "Не указано имя сайта. Пример: sudo bash install.sh zvezdochki.kjacargo.ru"

# ---------- 1. Проверки ----------
info "Проверяю сервер"
MYIP="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n1)"
PUBIP="$(curl -4 -s --max-time 8 https://ifconfig.me 2>/dev/null || true)"
echo "$PUBIP" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || PUBIP="$MYIP"
DNSIP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}')"
echo "    адрес сервера: $PUBIP, сайт $DOMAIN указывает на: ${DNSIP:-пока никуда}"
[ "$DNSIP" = "$PUBIP" ] || stop "Сайт $DOMAIN ещё не смотрит на этот сервер (запись в Beget не разошлась). Подожди 15–30 минут и запусти команду снова."

if command -v nginx >/dev/null 2>&1; then
  ok "nginx уже есть"
else
  if ss -ltnH 'sport = :80' 2>/dev/null | grep -q .; then
    ss -ltnp 'sport = :80' || true
    stop "На сервере уже работает другой веб-сервер (не nginx). Нужна другая настройка."
  fi
  info "Ставлю nginx"
  apt-get update -qq && apt-get install -y -qq nginx
fi

NODE=""
for n in /usr/bin/node /usr/local/bin/node; do [ -x "$n" ] && NODE="$n" && break; done
if [ -z "$NODE" ]; then
  info "Ставлю Node.js"
  apt-get update -qq && apt-get install -y -qq nodejs
  NODE=/usr/bin/node
fi
NODEV="$("$NODE" -v | sed 's/^v//; s/\..*//')"
[ "$NODEV" -ge 14 ] || stop "Node.js слишком старый (версия $NODEV, нужна 14 или новее)."
ok "Node.js $("$NODE" -v)"

if ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . && ! systemctl is-active --quiet ostrov; then
  ss -ltnp "sport = :$PORT" || true
  stop "Порт $PORT занят другой программой."
fi

# ---------- 2. Файлы игры ----------
info "Копирую игру в $APP"
id ostrov >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin ostrov
mkdir -p "$APP" "$DATA"
for f in server.js index.html manifest.json icon.svg icon-192.png icon-512.png; do
  [ -f "$SRC/$f" ] || stop "Не хватает файла $f рядом с install.sh"
  install -m 644 "$SRC/$f" "$APP/$f"
done
chown -R ostrov:ostrov "$DATA"

if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" <<ENV
PORT=$PORT
HOST=127.0.0.1
DATA_DIR=$DATA
TURN_HOST=$DOMAIN
TURN_SECRET=$(openssl rand -hex 24)
ENV
  chmod 640 "$ENVF"; chown root:ostrov "$ENVF"
else
  sed -i "s/^TURN_HOST=.*/TURN_HOST=$DOMAIN/" "$ENVF"
fi
TURN_SECRET="$(sed -n 's/^TURN_SECRET=//p' "$ENVF")"

cat > /etc/systemd/system/ostrov.service <<UNIT
[Unit]
Description=Ostrov game
After=network.target

[Service]
User=ostrov
Group=ostrov
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=$NODE $APP/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA
MemoryMax=250M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable -q ostrov
systemctl restart ostrov
sleep 1.5
curl -fs "http://127.0.0.1:$PORT/health" >/dev/null || { journalctl -u ostrov -n 20 --no-pager || true; stop "Игра не запустилась."; }
ok "Игра запущена"

# ---------- 3. Сайт в nginx ----------
info "Подключаю сайт $DOMAIN"
if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
  NGX=/etc/nginx/sites-available/ostrov; NGXLINK=/etc/nginx/sites-enabled/ostrov
else
  NGX=/etc/nginx/conf.d/ostrov.conf; NGXLINK=""
fi
if [ ! -f "$NGX" ] || ! grep -q "server_name $DOMAIN;" "$NGX"; then
  cat > "$NGX" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
NGINX
  [ -n "$NGXLINK" ] && ln -sf "$NGX" "$NGXLINK"
  if ! nginx -t 2>/tmp/ostrov-nginx.log; then
    cat /tmp/ostrov-nginx.log
    rm -f "$NGX"; [ -n "$NGXLINK" ] && rm -f "$NGXLINK"
    stop "nginx не принял настройку — я её убрал, остальные сайты работают как раньше."
  fi
  systemctl reload nginx
fi
ok "Сайт подключён"

# ---------- 4. Сертификат (https нужен для микрофона) ----------
if grep -q "ssl_certificate" "$NGX"; then
  ok "Сертификат уже есть"
else
  info "Получаю сертификат https"
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
  elif ! certbot plugins 2>/dev/null | grep -q nginx; then
    apt-get install -y -qq python3-certbot-nginx || true
  fi
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || stop "Не получилось выпустить сертификат. Игра уже открывается по http://$DOMAIN, но без https микрофон работать не будет."
  ok "Сертификат получен"
fi

# ---------- 5. Голосовая связь (coturn) ----------
info "Настраиваю голосовую связь"
command -v turnserver >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq coturn; }
CONF=/etc/turnserver.conf
if [ -f "$CONF" ] && ! grep -q "# ostrov" "$CONF"; then cp "$CONF" "$CONF.before-ostrov"; fi
cat > "$CONF" <<TURN
# ostrov
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=$TURN_SECRET
realm=$DOMAIN
min-port=49160
max-port=49300
total-quota=60
stale-nonce=600
no-multicast-peers
no-cli
no-tls
no-dtls
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
TURN
if [ -n "$MYIP" ] && [ "$MYIP" != "$PUBIP" ]; then echo "external-ip=$PUBIP/$MYIP" >> "$CONF"; fi
[ -f /etc/default/coturn ] && sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable -q coturn
systemctl restart coturn
sleep 1
systemctl is-active --quiet coturn || { journalctl -u coturn -n 20 --no-pager || true; stop "Служба голосовой связи не запустилась (сама игра при этом работает)."; }
ok "Голосовая связь настроена"

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  info "Открываю порты в защитном экране"
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  ufw allow 3478/tcp >/dev/null; ufw allow 3478/udp >/dev/null; ufw allow 49160:49300/udp >/dev/null
fi

# ---------- 6. Итог ----------
if curl -fs --max-time 10 "https://$DOMAIN/health" >/dev/null; then
  echo -e "\n\033[32m===== ВСЁ ГОТОВО =====\033[0m\nОткрывай на планшете:  https://$DOMAIN\n"
else
  stop "Установка прошла, но https://$DOMAIN с сервера не открылся."
fi
