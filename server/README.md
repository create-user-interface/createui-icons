# server/

HTTP-сервер на Go. Отдаёт SVG-иконки с подстановкой `stroke-width`.

## Файлы

```
server/
├── main.go          # Точка входа, HTTP-роутинг, валидация, подстановка stroke
├── main_test.go     # Юнит-тесты
└── go.mod           # Зависимости модуля (только stdlib)
```

## Логика

1. Парсит URL `/{version}/{icon}.svg?stroke={value}`.
2. Валидирует: `version` — `\d+\.\d+\.\d+`, `icon` — `[a-z0-9-]+`, `stroke` — число 0.25–10 (NaN/Inf → 400).
3. Квантует `stroke` до ближайшего шага 0.25.
4. Читает `$ICONS_ROOT/versions/{version}/{icon}.svg` (прозрачно следуя симлинку на блоб).
5. Если `stroke != 2` — заменяет `stroke-width="2"` → `stroke-width="{квантованное}"`. При `stroke == 2` SVG отдаётся без модификаций (нет смысла сканировать файл).
6. Возвращает SVG с заголовками `Cache-Control: public, max-age=604800, immutable` и `Access-Control-Allow-Origin: *`.

## Эндпоинты

| Метод | Путь | Ответ |
|---|---|---|
| `GET`/`HEAD` | `/{version}/{icon}.svg?stroke={value}` | SVG или 400/404 |
| `GET`/`HEAD` | `/health` | `200 OK`, тело `ok` |

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт для прослушивания |
| `BIND_ADDR` | `127.0.0.1` | Адрес bind. За Nginx — оставить loopback. |
| `ICONS_ROOT` | `/var/icons` | Корневая директория хранилища иконок (ожидает `$ICONS_ROOT/versions/...`) |

## Graceful shutdown

Сервер ловит `SIGINT` и `SIGTERM` (systemd по умолчанию шлёт `SIGTERM`), вызывает `http.Server.Shutdown` с таймаутом 10 секунд — активные запросы дорабатываются, новые не принимаются. После 10 секунд — жёсткое завершение.

## Сборка

```bash
# Локально для разработки
go build -o icon-server .

# Для прода (кросс-компиляция с macOS/Windows)
GOOS=linux GOARCH=amd64 go build -o icon-server .
```

## Запуск локально

```bash
# С дефолтами
./icon-server

# С кастомным путём к иконкам
ICONS_ROOT=./fake-icons PORT=8080 ./icon-server
```

## Тесты

```bash
go test ./...
go test -v -cover ./...
```

Покрытие: `parseStroke`, `quantize`, `formatStroke`, `replaceStroke`, хендлеры (OK, default stroke, quantized, 404 на traversal/uppercase/underscore/missing, 400 на bad stroke), `/health`.

## Деплой

Слушает `127.0.0.1:3000` по умолчанию. Nginx проксирует на него запросы по пути `^/\d+\.\d+\.\d+/.+\.svg$` (см. `nginx/icons.conf`). Systemd-юнит — см. Этап 7 в `PLAN.md`.
