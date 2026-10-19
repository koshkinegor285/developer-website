<?php
// Скопируйте этот файл в config.php на сервере и заполните значения.
// config.php в репозиторий не попадает (см. .gitignore).

return [
    // SMTP Яндекса. Логин — ящик, с которого уходят письма.
    'smtp_host' => 'smtp.yandex.ru',
    'smtp_port' => 465,
    'smtp_user' => 'egor.koshkin.dev@yandex.ru',
    // Пароль приложения (Яндекс ID → Безопасность → Пароли приложений → Почта),
    // не основной пароль от аккаунта.
    'smtp_pass' => 'пароль-приложения',

    // Куда приходят заявки
    'mail_to' => 'egor.koshkin.dev@yandex.ru',

    // Сайты, которым разрешено слать заявки с другого адреса (CORS). Без слэша на конце.
    'allowed_origins' => [
        'https://egor-koshkin-dev.online',
        'https://www.egor-koshkin-dev.online',
    ],

    // Максимум заявок с одного IP в час (0 — без лимита)
    'rate_limit_per_hour' => 5,

    // Любая случайная строка для хеширования IP в файлах лимита
    'rate_salt' => 'change-me',
];
