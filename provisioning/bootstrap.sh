#!/usr/bin/env bash
# bootstrap.sh — provisioning Ubuntu 24.04 VDS для icons.createui.dev.
#
# Запускается на чистом сервере под root (или sudo).
# Идемпотентен: можно перезапускать после фейла, шаги проверяют состояние.
#
# Конфигурация через env vars (или дефолты):
#   DEPLOY_USER   имя deploy-пользователя (default: deploy)
#   TIMEZONE      timezone (default: Europe/Moscow)
#   SSH_PORT      SSH-порт (для UFW и fail2ban, default: 22)
#   SSH_PUBKEY    публичный ключ для deploy-юзера (без него deploy остаётся
#                 без ключа — CI/CD деплой работать не будет)
#   DOMAIN        домен (только для логов, default: icons.createui.dev)
#
# ВНИМАНИЕ: sshd_config не трогается — root-логин и password auth остаются как
# в дефолте Ubuntu. Сменить root-пароль рекомендуется после первого деплоя.
#
# Пример вызова:
#   SSH_PUBKEY="ssh-ed25519 AAAA... user@host" bash bootstrap.sh

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
TIMEZONE="${TIMEZONE:-Europe/Moscow}"
SSH_PORT="${SSH_PORT:-22}"
SSH_PUBKEY="${SSH_PUBKEY:-}"
DOMAIN="${DOMAIN:-icons.createui.dev}"

log()  { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "must run as root"
. /etc/os-release
[ "$ID" = "ubuntu" ] || log "WARN: tested on Ubuntu, got $ID — proceed at your own risk"

# ─── 1. APT update + upgrade ──────────────────────────────────────────────────
log "1/12 apt update + upgrade"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq upgrade
apt-get -y -qq autoremove

# ─── 2. Swap 1G ───────────────────────────────────────────────────────────────
# 1 GB RAM мало под всплески — добавляем swap. swappiness=10: использовать swap
# только в крайнем случае (предпочитаем держать всё в RAM пока возможно).
if [ ! -f /swapfile ]; then
  log "2/12 creating 1G swap"
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
else
  log "2/12 swap already present, skipping"
fi
echo "vm.swappiness=10" > /etc/sysctl.d/99-icons.conf
sysctl -p /etc/sysctl.d/99-icons.conf >/dev/null

# ─── 3. Timezone ──────────────────────────────────────────────────────────────
log "3/12 set timezone $TIMEZONE"
timedatectl set-timezone "$TIMEZONE"

# ─── 4. Locale ────────────────────────────────────────────────────────────────
log "4/12 generate locales"
locale-gen en_US.UTF-8 ru_RU.UTF-8 >/dev/null 2>&1 || true
update-locale LANG=en_US.UTF-8 >/dev/null

# ─── 5. Packages ──────────────────────────────────────────────────────────────
log "5/12 installing packages"
apt-get -y -qq install \
  nginx \
  certbot python3-certbot-nginx \
  rsync jq curl git \
  ufw fail2ban unattended-upgrades \
  htop iotop \
  ca-certificates

# ─── 6. Deploy user + sudo ────────────────────────────────────────────────────
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  log "6/12 creating user $DEPLOY_USER"
  useradd -m -s /bin/bash "$DEPLOY_USER"
else
  log "6/12 user $DEPLOY_USER already exists"
fi
usermod -aG sudo "$DEPLOY_USER"
# Passwordless sudo для CI/CD-операций
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEPLOY_USER"
chmod 440 "/etc/sudoers.d/$DEPLOY_USER"

# ─── 7. SSH key для deploy user ───────────────────────────────────────────────
# Read из файла (если SSH_PUBKEY_FILE задан) или из env (SSH_PUBKEY).
# Файл предпочтительнее: исключает quoting-риски с многословным ключом.
if [ -n "${SSH_PUBKEY_FILE:-}" ] && [ -f "$SSH_PUBKEY_FILE" ]; then
  SSH_PUBKEY="$(cat "$SSH_PUBKEY_FILE")"
fi
if [ -n "$SSH_PUBKEY" ]; then
  log "7/12 installing SSH key for $DEPLOY_USER"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  echo "$SSH_PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
else
  log "7/12 SSH_PUBKEY not set — deploy user без ключа (CI/CD не будет работать)"
fi

# ─── 8. UFW firewall ──────────────────────────────────────────────────────────
log "8/12 configuring UFW"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow "$SSH_PORT/tcp" comment 'SSH' >/dev/null
ufw allow 80/tcp comment 'HTTP' >/dev/null
ufw allow 443/tcp comment 'HTTPS' >/dev/null
ufw --force enable >/dev/null

# ─── 9. fail2ban ──────────────────────────────────────────────────────────────
log "9/12 configuring fail2ban for sshd"
cat > /etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port = $SSH_PORT
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban

# ─── 10. unattended-upgrades (только security) ────────────────────────────────
log "10/12 enabling unattended-upgrades (security only)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable unattended-upgrades >/dev/null 2>&1
systemctl restart unattended-upgrades

# ─── 11. Структура директорий ─────────────────────────────────────────────────
log "11/12 creating /var/icons and /var/www tree"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 755 \
  /var/icons \
  /var/icons/blobs \
  /var/icons/versions \
  /var/icons/bundles \
  /var/www/icons-landing
install -d -o www-data -g www-data -m 755 \
  /var/www/certbot \
  /var/cache/nginx/icons

# nginx должен читать /var/icons/bundles/ — даём world-read (символы версий публичны)
chmod -R a+rX /var/icons

# ─── 12. systemd unit для icon-server (placeholder, без start) ────────────────
# Бинарник появится в Stage 7. Здесь только устанавливаем юнит, не enable/start.
log "12/12 installing icon-server.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/icon-server.service" ]; then
  cp "$SCRIPT_DIR/icon-server.service" /etc/systemd/system/icon-server.service
  systemctl daemon-reload
else
  log "WARN: icon-server.service not found in $SCRIPT_DIR — skipping (положи рядом с bootstrap.sh)"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
log "✓ bootstrap done for $DOMAIN"
cat <<EOF

─── Что дальше (Stage 7 — первичный деплой) ───
  1) DNS:  A-запись $DOMAIN → $(curl -s -4 ifconfig.io 2>/dev/null || echo "<server IP>")
  2) Build Go binary локально:
       cd server && GOOS=linux GOARCH=amd64 go build -o icon-server .
  3) Copy + enable:
       scp icon-server $DEPLOY_USER@$DOMAIN:/tmp/
       ssh $DEPLOY_USER@$DOMAIN 'sudo mv /tmp/icon-server /usr/local/bin/ && sudo systemctl enable --now icon-server'
  4) Bootstrap иконок локально и rsync на сервер:
       bash scripts/sync-lucide.sh bootstrap --version 1.8.0 --storage ./icons-storage
       rsync -avz icons-storage/ $DEPLOY_USER@$DOMAIN:/var/icons/
  5) Nginx config:
       scp nginx/icons.conf $DEPLOY_USER@$DOMAIN:/tmp/
       scp nginx/icons-cache.conf $DEPLOY_USER@$DOMAIN:/tmp/
       ssh $DEPLOY_USER@$DOMAIN '...'   # см. nginx/README.md
  6) Certbot:
       ssh $DEPLOY_USER@$DOMAIN 'sudo certbot --nginx -d $DOMAIN'
  7) Smoke-test:
       curl https://$DOMAIN/health
       curl -I https://$DOMAIN/1.8.0/user.svg

─── Безопасность ───
  sshd НЕ менялся: root-логин и password auth остаются. После первого
  деплоя рекомендуется сменить root-пароль через панель провайдера или:
    ssh root@<IP> 'passwd'

EOF
