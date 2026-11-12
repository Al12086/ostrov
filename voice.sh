#!/usr/bin/env bash
# Включает живую озвучку (Яндекс SpeechKit). Запуск:  bash /root/ostrov/voice.sh
set -euo pipefail
ENVF=/etc/ostrov.env
[ "$(id -u)" = "0" ] || { echo "Запусти от root: sudo bash voice.sh"; exit 1; }
echo "Вставь API-ключ Яндекса (он начинается на AQVN...) и нажми Enter."
echo "При вставке символы не видно — так и задумано."
read -rs KEY; echo
KEY="$(echo -n "$KEY" | tr -d '[:space:]')"
[ ${#KEY} -ge 20 ] || { echo "Ключ какой-то короткий. Проверь и запусти ещё раз."; exit 1; }
touch "$ENVF"; chmod 600 "$ENVF"
grep -v '^YANDEX_TTS_KEY=' "$ENVF" > "$ENVF.tmp" || true
echo "YANDEX_TTS_KEY=$KEY" >> "$ENVF.tmp"; mv "$ENVF.tmp" "$ENVF"; chmod 600 "$ENVF"
systemctl restart ostrov; sleep 1.5
CODE=$(curl -s -o /tmp/ostrov-voice-test.mp3 -w '%{http_code}' "http://127.0.0.1:3210/tts?v=n&t=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%21")
if [ "$CODE" = "200" ] && [ -s /tmp/ostrov-voice-test.mp3 ]; then
  echo "Готово: живой голос работает! Перезапусти игру на планшетах."
else
  echo "Голос пока не отвечает (код $CODE). Отправь Claude вот это:"
  journalctl -u ostrov -n 15 --no-pager | grep -i 'озвучка\|speechkit' || journalctl -u ostrov -n 15 --no-pager
fi
