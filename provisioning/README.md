# provisioning/

Настройка чистого VDS под `icons.createui.dev` (лендинг) и `icon.createui.dev` (API). **Stage 6 — provisioning** (см. [`PLAN.md`](../PLAN.md)).

## Файлы

```
provisioning/
├── bootstrap.sh         # Идемпотентный bash-скрипт настройки сервера
├── icon-server.service  # Systemd-юнит для Go-сервера (без start, бинарь — Stage 7)
└── README.md            # Этот runbook
```

## Что делает `bootstrap.sh`

12 шагов, идемпотентно:

1. `apt update && upgrade && autoremove`
2. Swap 1G + `vm.swappiness=10`
3. Timezone (`Europe/Moscow`)
4. Locale (`en_US.UTF-8` + `ru_RU.UTF-8`)
5. Пакеты: `nginx`, `certbot`, `rsync`, `jq`, `curl`, `git`, `ufw`, `fail2ban`, `unattended-upgrades`, `htop`, `iotop`
6. Создание `deploy`-юзера + `NOPASSWD:ALL` sudo
7. SSH `authorized_keys` для `deploy` (нужно для CI/CD)
8. UFW: deny incoming + allow `22/tcp`, `80/tcp`, `443/tcp`
9. fail2ban для sshd (5 попыток / 10 мин → ban 1ч)
10. unattended-upgrades (только security-патчи)
11. Структура директорий: `/var/icons/{blobs,versions,bundles}`, `/var/www/icons-landing`, `/var/www/certbot`, `/var/cache/nginx/icons`
12. Systemd-юнит `icon-server.service` (без `enable`/`start` — бинарника ещё нет)

**`sshd_config` НЕ трогается** — root-логин и password auth остаются дефолтными (Ubuntu 24.04 ставит `PermitRootLogin prohibit-password` по умолчанию для cloud-образов; для bare-metal/desktop install — `prohibit-password` тоже стандарт). После первого деплоя рекомендуется сменить root-пароль через панель провайдера.

## Запуск

### Подготовка (локально)

VDS должна быть свежепровиженной с root-доступом по паролю/ключу.

```bash
# Подставь свои значения
VDS=85.239.48.234
SSH_PUBKEY=$(cat ~/.ssh/id_ed25519.pub)
```

### 1. Скопировать скрипт + юнит на сервер

```bash
scp provisioning/bootstrap.sh provisioning/icon-server.service root@$VDS:/root/
```

### 2. Скопировать pubkey на сервер (отдельным файлом — без quoting-рисков)

```bash
scp ~/.ssh/id_ed25519.pub root@$VDS:/root/deploy.pub
```

### 3. Запустить bootstrap

```bash
ssh root@$VDS "DEPLOY_USER=deploy \
  TIMEZONE=Europe/Moscow \
  SSH_PORT=22 \
  SSH_PUBKEY_FILE=/root/deploy.pub \
  bash /root/bootstrap.sh"
```

Скрипт идёт ~3–5 минут (apt upgrade — самый долгий шаг).

### 4. Проверить SSH-доступ deploy-юзером

```bash
ssh deploy@$VDS 'whoami; sudo whoami'
# Ожидаем: deploy / root
```

### 5. Сменить root-пароль

После того как deploy-юзер работает по ключу:

```bash
ssh root@$VDS 'passwd'
# Ввести новый strong пароль (старый из чата считаем скомпрометированным)
```

### 6. DNS

A-записи (оба на один IP):

```
icons.createui.dev. → 85.239.48.234   # лендинг
icon.createui.dev.  → 85.239.48.234   # API (SVG + бандл)
```

Подождать пропагации:

```bash
dig +short icons.createui.dev
dig +short icon.createui.dev
```

## Что проверить после bootstrap

```bash
ssh deploy@$VDS '
  echo "--- swap ---"; free -h | grep Swap
  echo "--- timezone ---"; timedatectl | grep "Time zone"
  echo "--- ufw ---"; sudo ufw status
  echo "--- fail2ban ---"; sudo systemctl is-active fail2ban
  echo "--- nginx ---"; sudo systemctl is-active nginx
  echo "--- dirs ---"; ls -la /var/icons /var/www/icons-landing
  echo "--- icon-server unit ---"; systemctl cat icon-server | head -3
'
```

## Что НЕ делает (это Stage 7)

- НЕ запускает `icon-server` (нет бинарника)
- НЕ применяет nginx-конфиги (`nginx/icons.conf`, `nginx/icon.conf`)
- НЕ выпускает SSL-сертификат
- НЕ заливает иконки в `/var/icons/`

Всё это — следующий этап деплоя.

## Re-run

Скрипт идемпотентен — можно перезапускать после фейлов или для апдейта конфигов. Деструктивный шаг ровно один: UFW сбрасывается полностью каждый раз (`ufw --force reset`). Кастомные правила (если добавлял руками) — потеряются.

## Troubleshooting

**SSH не пускает deploy:**
- Проверь `/home/deploy/.ssh/authorized_keys` (perms 600, owner deploy:deploy, содержит твой pubkey)
- Проверь `/home/deploy/.ssh` (perms 700)
- `journalctl -u ssh -n 50` покажет причину отказа

**fail2ban: сам себя заблокировал:**
```bash
ssh root@$VDS 'fail2ban-client set sshd unbanip <IP>'
```

**Swap не создался (busy):**
```bash
swapoff /swapfile && rm /swapfile && bash bootstrap.sh
```
