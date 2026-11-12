<?php
/* Перенос данных Королевства со старого сайта через его обычный api.php (доступ к Beget не нужен).
   Запуск: php migrate.php https://kingdom.kjacargo.ru /var/www/kingdom/data   (пароль владельца — в переменной ADM)
   Переносит: все игры (прогресс), записи голоса и озвучку, пароль владельца. Ключ Яндекса старый сайт не отдаёт — его вводят заново. */
$old = rtrim($argv[1], '/'); $root = rtrim($argv[2], '/'); $adm = getenv('ADM');
function get($url, &$code = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_FOLLOWLOCATION => true,
        // у старого сайта на Beget сертификат сейчас не совпадает с адресом; данные всё равно защищены паролем владельца
        CURLOPT_SSL_VERIFYPEER => false, CURLOPT_SSL_VERIFYHOST => 0));
    $b = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($b === false) $GLOBALS['cerr'] = curl_error($ch);
    curl_close($ch);
    return $b === false ? '' : $b;
}
function api($old, $q, &$code = null) { return get($old . '/api.php?' . http_build_query($q), $code); }
function wj($f, $d) { file_put_contents($f, json_encode($d, JSON_UNESCAPED_UNICODE)); }
$dummy = 'perenos-' . mt_rand(100000, 999999);

$j = json_decode(api($old, array('a' => 'games', 'code' => $dummy, 'adm' => $adm), $c), true);
if ($c === 403) { fwrite(STDERR, "Пароль владельца не подошёл\n"); exit(3); }
if (!is_array($j) || empty($j['ok'])) { fwrite(STDERR, "Старый сайт не ответил ($c) " . (isset($GLOBALS['cerr']) ? $GLOBALS['cerr'] : '') . ' [адрес ' . gethostbyname(parse_url($old, PHP_URL_HOST)) . ']' . "\n"); exit(2); }

@mkdir($root . '/_voice', 0700, true);
wj($root . '/_voice/owner.json', array('hash' => hash('sha256', 'kingdom-owner:' . $adm)));
$games = 0; $voiceIdx = null;
foreach ($j['games'] as $g) {
    if ($g['code'] === '') { echo "  пропускаю игру без кода ({$g['name']})\n"; continue; }
    $s = json_decode(api($old, array('a' => 'get', 'code' => $g['code'])), true);
    if (!is_array($s) || empty($s['ok']) || empty($s['state'])) { echo "  не получилось забрать «{$g['code']}»\n"; continue; }
    $dir = $root . '/' . hash('sha256', 'kingdom:' . $g['code']);
    @mkdir($dir, 0700, true);
    wj($dir . '/state.json', array('ts' => $s['ts'], 'state' => $s['state']));
    wj($dir . '/meta.json', array('code' => $g['code']));
    if (!empty($g['blocked'])) touch($dir . '/blocked');
    if ($voiceIdx === null && isset($s['voice'])) $voiceIdx = (array)$s['voice'];
    $games++;
    echo "  игра «{$g['code']}» ({$g['name']}): звёзд {$g['stars']}\n";
}
$n = 0; $idx = array();
foreach (($voiceIdx ? $voiceIdx : array()) as $k => $e) {
    $b = api($old, array('a' => 'vget', 'code' => $dummy, 'k' => $k), $c);
    if ($c !== 200 || $b === '') continue;
    file_put_contents($root . '/_voice/v_' . md5($k) . '.bin', $b);
    $idx[$k] = $e; $n++;
    if ($n % 100 === 0) echo "  голос: $n\n";
}
wj($root . '/_voice/voice.json', $idx);
echo "Перенесено игр: $games, фраз озвучки: $n\n";
