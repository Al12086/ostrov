<?php
/* «Королевство принцессы» — синхронизация между устройствами.
   Прогресс и записи голоса хранятся в папке data/ рядом с этим файлом.
   Доступ — по коду синхронизации, который вы задаёте в игре (раздел «Для родителей»). */
// Работает на PHP 5.4 и новее. При сбое отдаёт текст ошибки, чтобы её было видно в игре.
ini_set('display_errors', '0');
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR))) {
        if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); }
        echo json_encode(array('ok' => false, 'err' => 'php', 'msg' => $e['message'] . ' (строка ' . $e['line'] . ')', 'php' => PHP_VERSION));
    }
});
const MAX_STATE = 400000;      // байт на сохранение
const MAX_VOICE = 2000000;     // байт на одну запись голоса
const MAX_FILES = 2000;         // записей голоса на один код

header('Cache-Control: no-store');
function out($d, $c = 200) {
    http_response_code($c);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}
function readJson($f) {
    if (!is_file($f)) return array();
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : array();
}
function writeJson($f, $d) {
    if (file_put_contents($f, json_encode($d, JSON_UNESCAPED_UNICODE), LOCK_EX) === false) out(array('ok' => false, 'err' => 'write', 'msg' => 'Не удаётся записать файл в папку data — проверьте права на папку сайта'), 500);
}

/* Автоматическая фраза или своя запись? Синтез отдаёт mp3, а запись с микрофона в браузере — никогда,
   поэтому mp3 считаем автоматической, даже если пометка потерялась при переносе между устройствами или кодами. */
function isGen($e) { return !empty($e['gen']) || (isset($e['type']) && strpos($e['type'], 'audio/mpeg') === 0); }
function q($n) { return isset($_GET[$n]) ? (string)$_GET[$n] : ''; }
$a = q('a');
if ($a === 'ping') out(array('ok' => true, 'php' => PHP_VERSION, 'writable' => is_writable(__DIR__)));
/* Перенос на другой сервер: владелец (по паролю) скачивает всю папку data одним tar-архивом. */
if ($a === 'export') {
    $own = readJson(__DIR__ . '/data/_voice/owner.json');
    $p = isset($_POST['adm']) ? (string)$_POST['adm'] : '';
    if (empty($own['hash']) || $p === '' || hash('sha256', 'kingdom-owner:' . $p) !== $own['hash']) out(array('ok' => false, 'err' => 'owner', 'msg' => 'Нужен пароль владельца'), 403);
    @set_time_limit(600);
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/x-tar');
    header('Content-Disposition: attachment; filename="kingdom-data.tar"');
    $base = __DIR__ . '/data';
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if (!$f->isFile()) continue;
        $name = 'data/' . str_replace('\\', '/', substr($f->getPathname(), strlen($base) + 1));
        if (strlen($name) > 99) continue;
        $size = $f->getSize();
        $h = str_pad($name, 100, "\0") . str_pad('0000644', 7, '0', STR_PAD_LEFT) . "\0" . "0000000\0" . "0000000\0"
           . str_pad(decoct($size), 11, '0', STR_PAD_LEFT) . "\0" . str_pad(decoct($f->getMTime()), 11, '0', STR_PAD_LEFT) . "\0"
           . '        ' . '0' . str_repeat("\0", 100) . "ustar\0" . '00' . str_repeat("\0", 247);
        $sum = 0; for ($i = 0; $i < 512; $i++) $sum += ord($h[$i]);
        $h = substr_replace($h, str_pad(decoct($sum), 6, '0', STR_PAD_LEFT) . "\0 ", 148, 8);
        echo $h;
        readfile($f->getPathname());
        if ($size % 512) echo str_repeat("\0", 512 - $size % 512);
        flush();
    }
    echo str_repeat("\0", 1024);
    exit;
}
$code = trim(q('code'));
$code = function_exists('mb_strtolower') ? mb_strtolower($code, 'UTF-8') : strtolower($code);
$len = function_exists('mb_strlen') ? mb_strlen($code, 'UTF-8') : strlen($code);
if ($len < 6 || $len > 60) out(array('ok' => false, 'err' => 'code'), 400);

$root = __DIR__ . '/data';
$dir = $root . '/' . hash('sha256', 'kingdom:' . $code);
$stateF = $dir . '/state.json';
/* Озвучка (свои записи и автоматическая) и ключ синтеза — общие для всех кодов. Прогресс — у каждого кода свой. */
$vdir = $root . '/_voice';
$voiceF = $vdir . '/voice.json';
$ttsF = $vdir . '/tts.json';
$admF = $vdir . '/owner.json';
/* Ссылку на игру можно раздать друзьям, поэтому менять общую озвучку и тратить ключ синтеза может только владелец:
   тот, кто первым задал пароль владельца. Забыли пароль — удалите файл data/_voice/owner.json на сервере. */
function ownHash($p) { return hash('sha256', 'kingdom-owner:' . $p); }
function needOwner($admF) {
    $a = readJson($admF); $p = q('adm');
    if (empty($a['hash']) || $p === '' || ownHash($p) !== $a['hash']) out(array('ok' => false, 'err' => 'owner', 'msg' => 'Менять озвучку может только владелец игры'), 403);
}
function ensureDir($root, $dir) {
    if (!is_dir($root) && !@mkdir($root, 0700, true)) out(array('ok' => false, 'err' => 'mkdir', 'msg' => 'Не удаётся создать папку data рядом с api.php — проверьте права на папку сайта'), 500);
    $ht = $root . '/.htaccess';   // папку data нельзя открыть из браузера
    if (!is_file($ht)) file_put_contents($ht, "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    if (!is_dir($dir)) mkdir($dir, 0700, true);
}
$k = q('k');
$vfile = $vdir . '/v_' . md5($k) . '.bin';

switch ($a) {
    case 'get':
        if (is_file($dir . '/blocked')) out(array('ok' => false, 'err' => 'blocked', 'msg' => 'эта игра отключена владельцем'), 403);
        if (is_file($dir . '/gone.json')) out(array('ok' => true, 'ts' => 0, 'state' => null, 'gone' => true, 'voice' => (object)readJson($voiceF), 'tts' => false, 'owner' => true));
        $s = readJson($stateF);
        $t = readJson($ttsF); $o = readJson($admF);
        out(array('ok' => true, 'ts' => isset($s['ts']) ? $s['ts'] : 0, 'state' => isset($s['state']) ? $s['state'] : null, 'voice' => (object)readJson($voiceF), 'tts' => !empty($t['key']), 'owner' => !empty($o['hash'])));

    case 'owner':        // задать пароль владельца (первый раз) или проверить его
        $d = json_decode((string)file_get_contents('php://input'), true);
        $p = is_array($d) && isset($d['pass']) ? trim((string)$d['pass']) : '';
        if (strlen($p) < 4 || strlen($p) > 200) out(array('ok' => false, 'err' => 'pass', 'msg' => 'Пароль должен быть не короче 4 символов'), 400);
        $o = readJson($admF);
        if (empty($o['hash'])) { ensureDir($root, $vdir); writeJson($admF, array('hash' => ownHash($p))); out(array('ok' => true, 'created' => true)); }
        if (ownHash($p) !== $o['hash']) out(array('ok' => false, 'err' => 'owner', 'msg' => 'Пароль владельца не подходит'), 403);
        out(array('ok' => true));

    case 'put':
        $raw = (string)file_get_contents('php://input');
        if (strlen($raw) > MAX_STATE) out(array('ok' => false, 'err' => 'size'), 413);
        $d = json_decode($raw, true);
        if (!is_array($d) || !isset($d['state']) || !is_array($d['state'])) out(array('ok' => false, 'err' => 'json'), 400);
        if (is_file($dir . '/blocked')) out(array('ok' => false, 'err' => 'blocked', 'msg' => 'эта игра отключена владельцем'), 403);
        if (is_file($dir . '/gone.json')) {            // владелец удалил эту игру
            if (empty($_GET['force'])) out(array('ok' => false, 'gone' => true));
            unlink($dir . '/gone.json');                // под тем же именем и словом создают новую
        }
        ensureDir($root, $dir); ensureDir($root, $vdir);
        $old = readJson($stateF);
        $ts = isset($d['ts']) ? (int)$d['ts'] : 0;
        if (empty($_GET['force']) && (isset($old['ts']) ? $old['ts'] : 0) > $ts) out(array('ok' => false, 'stale' => true, 'ts' => $old['ts']));
        writeJson($stateF, array('ts' => $ts, 'state' => $d['state']));
        writeJson($dir . '/meta.json', array('code' => $code));      // чтобы владелец видел в списке, чья это игра
        out(array('ok' => true, 'ts' => $ts));

    /* --- список игр для владельца --- */
    case 'games':
        needOwner($admF);
        $list = array();
        $dirs = glob($root . '/*', GLOB_ONLYDIR);
        foreach (($dirs ? $dirs : array()) as $d) {
            $id = basename($d);
            if (!preg_match('~^[0-9a-f]{64}$~', $id) || is_file($d . '/gone.json')) continue;
            $s = readJson($d . '/state.json');
            if (empty($s['state']) || !is_array($s['state'])) continue;
            $st = $s['state']; $m = readJson($d . '/meta.json');
            $stars = 0; $lv = 0;
            if (isset($st['stars']) && is_array($st['stars'])) foreach ($st['stars'] as $v) { $stars += (int)$v; $lv++; }
            $list[] = array('id' => $id, 'code' => isset($m['code']) ? $m['code'] : '', 'name' => isset($st['name']) ? (string)$st['name'] : '',
                'stars' => $stars, 'levels' => $lv, 'ts' => isset($s['ts']) ? $s['ts'] : 0, 'blocked' => is_file($d . '/blocked'), 'me' => ($d === $dir));
        }
        out(array('ok' => true, 'games' => $list));

    case 'gdel':         // удалить игру: устройства с ней вернутся на экран создания принцессы
    case 'gblock':       // отключить/включить сохранение игры на сервере
    case 'greset':       // обнулить прогресс, оставив имя и внешность
        needOwner($admF);
        $id = q('id');
        $d = $root . '/' . $id;
        if (!preg_match('~^[0-9a-f]{64}$~', $id) || !is_dir($d)) out(array('ok' => false, 'err' => 'id'), 404);
        $now = (int)round(microtime(true) * 1000);
        if ($a === 'gdel') {
            foreach (array('state.json', 'meta.json', 'blocked') as $f) if (is_file($d . '/' . $f)) unlink($d . '/' . $f);
            writeJson($d . '/gone.json', array('ts' => $now));
        } elseif ($a === 'gblock') {
            if (q('on') === '1') file_put_contents($d . '/blocked', '1'); elseif (is_file($d . '/blocked')) unlink($d . '/blocked');
        } else {
            $s = readJson($d . '/state.json');
            if (!empty($s['state']) && is_array($s['state'])) {
                $st = $s['state'];
                $st['stars'] = (object)array(); $st['stats'] = (object)array(); $st['seen'] = (object)array(); $st['wallet'] = 0;
                $st['owned'] = array('rose', 'simple', 'none');
                $st['wear'] = array('dress' => 'rose', 'crown' => 'simple', 'acc' => 'none', 'pet' => 'none');
                $st['day'] = array('d' => '', 'ms' => 0); $st['sess'] = array('ms' => 0, 'last' => 0, 'until' => 0);
                $st['ts'] = $now;
                writeJson($d . '/state.json', array('ts' => $now, 'state' => $st));      // метка времени новее — устройства заберут обнулённую игру
            }
        }
        out(array('ok' => true));

    case 'vput':
        needOwner($admF);
        if ($k === '') out(array('ok' => false, 'err' => 'key'), 400);
        $raw = (string)file_get_contents('php://input');
        if ($raw === '' || strlen($raw) > MAX_VOICE) out(array('ok' => false, 'err' => 'size'), 413);
        ensureDir($root, $dir); ensureDir($root, $vdir);
        $idx = readJson($voiceF);
        if (!isset($idx[$k]) && count($idx) >= MAX_FILES) out(array('ok' => false, 'err' => 'limit'), 413);
        $type = isset($_SERVER['CONTENT_TYPE']) ? (string)$_SERVER['CONTENT_TYPE'] : '';
        if (!preg_match('~^audio/[\w.+-]+(;[\w=,. +-]+)?$~', $type)) $type = 'audio/webm';
        file_put_contents($vfile, $raw, LOCK_EX);
        $ts = (int)round(microtime(true) * 1000);
        $idx[$k] = array('ts' => $ts, 'type' => $type);
        if (isGen($idx[$k])) $idx[$k]['gen'] = 1;
        writeJson($voiceF, $idx);
        out(array('ok' => true, 'ts' => $ts));

    case 'vget':
        $idx = readJson($voiceF);
        if (!isset($idx[$k]) || !is_file($vfile)) out(array('ok' => false, 'err' => 'notfound'), 404);
        header('Content-Type: ' . $idx[$k]['type']);
        header('Content-Length: ' . filesize($vfile));
        readfile($vfile);
        exit;

    case 'vdel':
        needOwner($admF);
        $idx = readJson($voiceF);
        if (isset($idx[$k])) { unset($idx[$k]); writeJson($voiceF, $idx); }
        if (is_file($vfile)) unlink($vfile);
        out(array('ok' => true));

    /* --- автоматическая озвучка через Yandex SpeechKit --- */
    case 'tts_key':      // сохранить API-ключ (хранится только на сервере, в игру обратно не отдаётся)
        needOwner($admF);
        $d = json_decode((string)file_get_contents('php://input'), true);
        $key = is_array($d) && isset($d['key']) ? trim((string)$d['key']) : '';
        if ($key !== '' && !preg_match('~^[A-Za-z0-9_\-]{20,200}$~', $key)) out(array('ok' => false, 'err' => 'key', 'msg' => 'Ключ выглядит неправильно: в нём должны быть только латинские буквы, цифры, дефис и подчёркивание'), 400);
        ensureDir($root, $dir); ensureDir($root, $vdir);
        $t = readJson($ttsF); $t['key'] = $key;
        writeJson($ttsF, $t);
        out(array('ok' => true, 'tts' => $key !== ''));

    case 'tts':          // озвучить одну фразу и положить её рядом с записями голоса
        needOwner($admF);
        $d = json_decode((string)file_get_contents('php://input'), true);
        $text = is_array($d) && isset($d['text']) ? trim((string)$d['text']) : '';
        if ($k === '' || $text === '' || strlen($text) > 600) out(array('ok' => false, 'err' => 'text'), 400);
        $t = readJson($ttsF);
        if (empty($t['key'])) out(array('ok' => false, 'err' => 'nokey', 'msg' => 'Сначала сохраните API-ключ Yandex SpeechKit'), 400);
        $idx = readJson($voiceF);
        if (isset($idx[$k]) && !isGen($idx[$k])) out(array('ok' => true, 'skipped' => true));       // своя запись главнее
        if (isset($idx[$k]) && empty($d['redo'])) out(array('ok' => true, 'skipped' => true, 'ts' => $idx[$k]['ts']));
        if (!isset($idx[$k]) && count($idx) >= MAX_FILES) out(array('ok' => false, 'err' => 'limit'), 413);
        $today = date('Y-m-d');      // предохранитель от случайного перерасхода: не больше 3000 фраз в сутки
        $n = (isset($t['day']) && $t['day'] === $today && isset($t['n'])) ? (int)$t['n'] : 0;
        if ($n >= 3000) out(array('ok' => false, 'err' => 'daily', 'msg' => 'Достигнут суточный предел озвучки (3000 фраз). Продолжить можно завтра.'), 429);
        $t['day'] = $today; $t['n'] = $n + 1; writeJson($ttsF, $t);
        $voices = array('marina' => 'friendly', 'jane' => 'good', 'omazh' => 'neutral', 'zahar' => 'good', 'ermil' => 'good', 'filipp' => '');
        $voice = isset($d['voice']) && isset($voices[$d['voice']]) ? $d['voice'] : 'marina';
        $f = array('text' => $text, 'lang' => 'ru-RU', 'voice' => $voice, 'speed' => '0.9', 'format' => 'mp3');
        if ($voices[$voice] !== '') $f['emotion'] = $voices[$voice];
        $url = getenv('KINGDOM_TTS_URL') ? getenv('KINGDOM_TTS_URL') : 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
        $code = 0; $body = '';
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($f), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40,
                CURLOPT_HTTPHEADER => array('Authorization: Api-Key ' . $t['key'])));
            $body = (string)curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($code === 0) $body = curl_error($ch);
            curl_close($ch);
        } else {
            $ctx = stream_context_create(array('http' => array('method' => 'POST', 'timeout' => 40, 'ignore_errors' => true,
                'header' => "Authorization: Api-Key " . $t['key'] . "\r\nContent-Type: application/x-www-form-urlencoded\r\n", 'content' => http_build_query($f))));
            $body = (string)@file_get_contents($url, false, $ctx);
            if (isset($http_response_header[0]) && preg_match('~ (\d{3}) ~', $http_response_header[0] . ' ', $m)) $code = (int)$m[1];
        }
        if ($code !== 200 || strlen($body) < 200) {
            $j = json_decode($body, true);
            $msg = is_array($j) ? (isset($j['error_message']) ? $j['error_message'] : (isset($j['message']) ? $j['message'] : $body)) : substr($body, 0, 300);
            out(array('ok' => false, 'err' => 'yandex', 'msg' => 'Яндекс ответил ' . $code . ': ' . $msg), 502);
        }
        ensureDir($root, $dir); ensureDir($root, $vdir);
        file_put_contents($vfile, $body, LOCK_EX);
        $ts = (int)round(microtime(true) * 1000);
        $idx = readJson($voiceF);
        $idx[$k] = array('ts' => $ts, 'type' => 'audio/mpeg', 'gen' => 1);
        writeJson($voiceF, $idx);
        out(array('ok' => true, 'ts' => $ts));

    default:
        out(array('ok' => false, 'err' => 'action'), 400);
}
