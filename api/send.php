<?php
declare(strict_types=1);

// время в письме — московское, независимо от настроек хостинга
date_default_timezone_set('Europe/Moscow');

/**
 * Приём заявки с сайта и отправка её на почту через SMTP Яндекса.
 * POST JSON {name, contact, task, consent, website(honeypot), page} или обычная форма.
 * Ответ: JSON {ok: true} либо {ok: false, error: "..."}.
 * Настройки: api/config.php (см. config.example.php).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $code, array $body): never
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Читает ответ SMTP-сервера (в том числе многострочный). */
function smtp_read($fp): array
{
    $text = '';
    while (($line = fgets($fp, 515)) !== false) {
        $text .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }
    return [(int)substr($text, 0, 3), trim($text)];
}

/** Отправляет команду и проверяет код ответа. */
function smtp_cmd($fp, string $cmd, array $okCodes): void
{
    if ($cmd !== '') {
        fwrite($fp, $cmd . "\r\n");
    }
    [$code, $text] = smtp_read($fp);
    if (!in_array($code, $okCodes, true)) {
        throw new RuntimeException('SMTP: ' . $text);
    }
}

/** Отправляет готовое письмо (заголовки + тело) через SMTP с SSL (порт 465). */
function smtp_send(array $cfg, string $from, string $to, string $message): void
{
    $fp = @stream_socket_client(
        'ssl://' . $cfg['smtp_host'] . ':' . $cfg['smtp_port'],
        $errno,
        $errstr,
        10
    );
    if (!$fp) {
        throw new RuntimeException("SMTP: нет соединения ($errno $errstr)");
    }
    stream_set_timeout($fp, 10);

    try {
        smtp_cmd($fp, '', [220]);
        smtp_cmd($fp, 'EHLO ' . (gethostname() ?: 'localhost'), [250]);
        smtp_cmd($fp, 'AUTH LOGIN', [334]);
        smtp_cmd($fp, base64_encode($cfg['smtp_user']), [334]);
        smtp_cmd($fp, base64_encode($cfg['smtp_pass']), [235]);
        smtp_cmd($fp, 'MAIL FROM:<' . $from . '>', [250]);
        smtp_cmd($fp, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtp_cmd($fp, 'DATA', [354]);
        // точка в начале строки удваивается по правилам SMTP
        $data = preg_replace('/^\./m', '..', $message);
        smtp_cmd($fp, $data . "\r\n.", [250]);
        fwrite($fp, "QUIT\r\n");
    } finally {
        fclose($fp);
    }
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('send.php: api/config.php не найден');
    respond(500, ['ok' => false, 'error' => 'Сервер не настроен.']);
}
$config = require $configFile;
$allowedOrigins = (array)($config['allowed_origins'] ?? []);
$rateLimit = (int)($config['rate_limit_per_hour'] ?? 5);
$smtp = [
    'smtp_host' => (string)($config['smtp_host'] ?? 'smtp.yandex.ru'),
    'smtp_port' => (int)($config['smtp_port'] ?? 465),
    'smtp_user' => (string)($config['smtp_user'] ?? ''),
    'smtp_pass' => (string)($config['smtp_pass'] ?? ''),
];
$mailTo = (string)($config['mail_to'] ?? '');

// CORS: на случай, если сайт и PHP на разных адресах
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    // Запрос с того же сайта (Origin совпадает с Host) разрешён всегда;
    // чужие адреса должны быть перечислены в allowed_origins
    $oHost = (string)parse_url($origin, PHP_URL_HOST);
    $oPort = parse_url($origin, PHP_URL_PORT);
    $originHost = strtolower($oHost . ($oPort ? ':' . $oPort : ''));
    $sameSite = $originHost !== '' && $originHost === strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if (!$sameSite && !in_array($origin, $allowedOrigins, true)) {
        error_log('send.php: запрещённый Origin ' . $origin . ' (Host ' . ($_SERVER['HTTP_HOST'] ?? '') . ')');
        respond(403, ['ok' => false, 'error' => 'Запрещено.']);
    }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    respond(405, ['ok' => false, 'error' => 'Метод не поддерживается.']);
}
if (
    !filter_var($smtp['smtp_user'], FILTER_VALIDATE_EMAIL)
    || $smtp['smtp_pass'] === ''
    || !filter_var($mailTo, FILTER_VALIDATE_EMAIL)
) {
    error_log('send.php: в config.php не заданы smtp_user, smtp_pass или mail_to');
    respond(500, ['ok' => false, 'error' => 'Сервер не настроен.']);
}

// Тело запроса: JSON или обычная форма
$raw = file_get_contents('php://input', false, null, 0, 20000);
$input = [];
if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        respond(400, ['ok' => false, 'error' => 'Некорректный запрос.']);
    }
    $input = $decoded;
} else {
    $input = $_POST;
}

// $multiline = false: переводы строк заменяются пробелами (защита заголовков письма)
$field = static function (string $key, int $max, bool $multiline = false) use ($input): string {
    $v = $input[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = preg_replace('/[^\P{C}\n]+/u', '', $v) ?? '';
    if (!$multiline) {
        $v = str_replace("\n", ' ', $v);
    }
    return mb_substr(trim($v), 0, $max);
};

// Honeypot: бот заполнил скрытое поле — делаем вид, что всё хорошо
if ($field('website', 200) !== '') {
    respond(200, ['ok' => true]);
}

$name = $field('name', 100);
$contact = $field('contact', 100);
$task = $field('task', 2000, true);
$page = $field('page', 300);
$consent = !empty($input['consent']) && $input['consent'] !== 'false';

if ($name === '') {
    respond(422, ['ok' => false, 'error' => 'Укажите имя.', 'field' => 'name']);
}
if (mb_strlen($contact) < 3) {
    respond(422, ['ok' => false, 'error' => 'Укажите Telegram или телефон.', 'field' => 'contact']);
}
if (!$consent) {
    respond(422, ['ok' => false, 'error' => 'Нужно согласие на обработку данных.', 'field' => 'consent']);
}

// Лимит заявок с одного IP в час
if ($rateLimit > 0) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $dir = sys_get_temp_dir() . '/lead-rate';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . '/' . hash('sha256', $ip . '|' . ($config['rate_salt'] ?? 'salt'));
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $hits = array_filter(
            array_map('intval', file($file, FILE_IGNORE_NEW_LINES) ?: []),
            static fn(int $t): bool => $now - $t < 3600
        );
    }
    if (count($hits) >= $rateLimit) {
        header('Retry-After: 3600');
        respond(429, ['ok' => false, 'error' => 'Слишком много заявок. Попробуйте позже или напишите на почту.']);
    }
    $hits[] = $now;
    @file_put_contents($file, implode("\n", $hits), LOCK_EX);
}

// Письмо
$body = "Новая заявка с сайта\r\n\r\n"
    . "Имя: $name\r\n"
    . "Контакт: $contact\r\n"
    . ($task !== '' ? "Задача: " . str_replace("\n", "\r\n", $task) . "\r\n" : '')
    . "\r\n" . date('d.m.Y H:i') . ($page !== '' ? " · $page" : '') . "\r\n";

$subject = 'Заявка с сайта: ' . mb_substr($name, 0, 40);
$headers = [
    'Date: ' . date('r'),
    'From: =?UTF-8?B?' . base64_encode('Сайт egor-koshkin-dev.online') . '?= <' . $smtp['smtp_user'] . '>',
    'To: <' . $mailTo . '>',
    'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($smtp['smtp_user'], '@'), 1) . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];
// Если клиент оставил почту, «Ответить» пойдёт ему
if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: <' . $contact . '>';
}
$message = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($body), 76, "\r\n");

try {
    smtp_send($smtp, $smtp['smtp_user'], $mailTo, $message);
} catch (Throwable $ex) {
    // пароль в лог не попадает: пишется только ответ сервера
    error_log('send.php: ' . $ex->getMessage());
    respond(502, ['ok' => false, 'error' => 'Не удалось отправить заявку. Напишите в Telegram или на почту.']);
}

respond(200, ['ok' => true]);
