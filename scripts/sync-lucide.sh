#!/usr/bin/env bash
# sync-lucide.sh — синхронизация иконок Lucide в content-addressable хранилище.
#
# Команды:
#   bootstrap --version VER [--storage DIR]
#       Первоначальная инициализация: скачивает полный набор иконок одной версии,
#       создаёт blobs/ и versions/VER/ с симлинками, пишет manifest.json.
#
#   sync [--storage DIR] [--from VER]
#       Инкрементальная синхронизация: для каждой версии новее manifest.upstream
#       (или --from) получает diff через compare API, скачивает только изменённые
#       SVG, обновляет блобы/симлинки/манифест.
#
# Manifest fields:
#   latest    — версия, опубликованная в npm/bundle (может быть patch-release,
#               которого нет в upstream — например, 1.11.1 как алиас 1.11.0).
#   upstream  — последний реальный тег в lucide-icons/lucide, от которого ведём
#               compare. Старые манифесты без `upstream` трактуются как upstream=latest.
#
# Требования:
#   - bash 4.0+ (macOS default 3.2 не подойдёт — `brew install bash`)
#   - gh (аутентифицирован)
#   - curl, jq, tar
#   - sha256sum (Linux) или shasum (macOS)
#
# Env:
#   STORAGE_DIR   переопределяет --storage, дефолт ./icons-storage
#   GH_REPO       дефолт lucide-icons/lucide
#   TAG_PREFIX    префикс git-тегов в репо, дефолт "" (Lucide 1.x релизы без префикса;
#                 старые v0.x были с "v"). Переопределить при необходимости.

set -euo pipefail

# ─── Константы ────────────────────────────────────────────────────────────────

readonly DEFAULT_STORAGE="./icons-storage"
readonly DEFAULT_REPO="lucide-icons/lucide"
readonly DEFAULT_TAG_PREFIX=""
readonly MAX_CHANGED_FILES=300  # Fallback на полный tarball при превышении лимита

# ─── Логи ─────────────────────────────────────────────────────────────────────

log()  { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

# ─── Проверка окружения ───────────────────────────────────────────────────────

check_bash_version() {
  if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    fail "requires bash 4.0+, got $BASH_VERSION. On macOS: brew install bash"
  fi
}

check_deps() {
  local missing=()
  for cmd in gh curl jq tar; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if command -v sha256sum >/dev/null 2>&1; then
    SHA256_CMD="sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    SHA256_CMD="shasum -a 256"
  else
    missing+=("sha256sum|shasum")
  fi
  [ ${#missing[@]} -eq 0 ] || fail "missing dependencies: ${missing[*]}"
  gh auth status >/dev/null 2>&1 || fail "gh not authenticated — run 'gh auth login'"
}

# ─── Хэш и верификация ────────────────────────────────────────────────────────

hash_file() {
  $SHA256_CMD "$1" | awk '{print substr($1, 1, 16)}'
}

verify_svg() {
  local f="$1"
  [ -s "$f" ]                     || fail "empty file: $f"
  grep -q '<svg' "$f"             || fail "not a valid SVG: $f"
  grep -q 'stroke-width=' "$f"    || fail "no stroke-width attr: $f"
}

store_blob() {
  # Копирует файл в blobs/ по хэшу, возвращает хэш.
  local src="$1" storage="$2"
  local hash
  hash=$(hash_file "$src")
  local dst="$storage/blobs/$hash.svg"
  [ -f "$dst" ] || cp "$src" "$dst"
  printf '%s' "$hash"
}

# ─── Tarball (bootstrap / fallback) ───────────────────────────────────────────

download_and_extract_tarball() {
  # Скачивает tar.gz релиза Lucide, распаковывает SVG в $dest_dir.
  local version="$1" dest_dir="$2"
  local tmp tarball

  tmp=$(mktemp -d)
  tarball="$tmp/lucide.tar.gz"

  log "downloading tarball $version..."
  gh api -H "Accept: application/vnd.github.v3+json" \
    "/repos/${GH_REPO}/tarball/${TAG_PREFIX}${version}" > "$tarball" \
    || fail "failed to download tarball ${TAG_PREFIX}${version}"

  log "extracting tarball..."
  tar -xzf "$tarball" -C "$tmp"

  # GitHub tarball структура: <user>-<repo>-<sha>/icons/
  local icons_src
  icons_src=$(find "$tmp" -mindepth 2 -maxdepth 2 -type d -name icons | head -1)
  [ -d "$icons_src" ] || { rm -rf "$tmp"; fail "no icons/ directory in tarball"; }

  mkdir -p "$dest_dir"
  cp "$icons_src"/*.svg "$dest_dir/"
  rm -rf "$tmp"
}

# ─── Bootstrap ────────────────────────────────────────────────────────────────

cmd_bootstrap() {
  local version="$1" storage="$2"

  [ -n "$version" ] || fail "bootstrap: --version required"

  local versions_dir="$storage/versions/$version"
  local manifest="$storage/manifest.json"
  [ ! -d "$versions_dir" ] || fail "$versions_dir already exists — refusing to overwrite"

  mkdir -p "$storage/blobs" "$versions_dir"
  log "bootstrapping v${version} into $storage"

  local icons_tmp; icons_tmp=$(mktemp -d)
  download_and_extract_tarball "$version" "$icons_tmp"

  # Соберём {name: hash} в JSON-файле через jq (determenistic order)
  local hashes_json="$storage/.bootstrap-hashes.json"
  echo '{}' > "$hashes_json"

  local count=0
  for svg in "$icons_tmp"/*.svg; do
    [ -e "$svg" ] || continue
    local name; name=$(basename "$svg" .svg)
    verify_svg "$svg"
    local hash; hash=$(store_blob "$svg" "$storage")
    ln -sf "../../blobs/${hash}.svg" "$versions_dir/${name}.svg"
    jq --arg n "$name" --arg h "$hash" '. + {($n): $h}' "$hashes_json" > "${hashes_json}.tmp"
    mv "${hashes_json}.tmp" "$hashes_json"
    count=$((count + 1))
  done
  rm -rf "$icons_tmp"

  log "bootstrapped $count icons"

  # Собрать manifest.json
  jq --arg v "$version" --slurpfile hashes "$hashes_json" \
     '{latest: $v, upstream: $v, versions: {($v): $hashes[0]}}' \
     <<< '{}' > "$manifest"
  rm -f "$hashes_json"

  log "wrote $manifest"
}

# ─── Sync (incremental) ───────────────────────────────────────────────────────

cmd_sync() {
  local storage="$1" from="$2"

  local manifest="$storage/manifest.json"
  [ -f "$manifest" ] || fail "no $manifest — run 'bootstrap' first"

  # Базис для compare API — последний реальный upstream-тег lucide. На старых
  # манифестах без поля upstream фолбэчимся на latest (был аналог).
  local current
  if [ -n "$from" ]; then
    current="$from"
  else
    current=$(jq -r '.upstream // .latest // empty' "$manifest")
  fi
  [ -n "$current" ] || fail "no current version (manifest.upstream/latest empty and --from not set)"

  log "current upstream: $current"

  local new_versions
  new_versions=$(list_newer_versions "$current")

  if [ -z "$new_versions" ]; then
    log "no new versions — up to date"
    return 0
  fi

  log "new versions to sync: $(echo "$new_versions" | tr '\n' ' ')"

  local prev="$current" ver
  while IFS= read -r ver; do
    [ -n "$ver" ] || continue
    log "─── $prev → $ver ───"
    sync_one_version "$storage" "$prev" "$ver"
    prev="$ver"
  done <<< "$new_versions"

  log "done. latest: $prev"
}

list_newer_versions() {
  # Lucide может иметь смешанные форматы тегов (исторически v0.x, сейчас 1.x),
  # поэтому жёстко фильтруем по expected формату: ^${TAG_PREFIX}X.Y.Z$ (без суффиксов).
  # Затем сравнение — через sort -V, а не лексическое awk ($0 > cur).
  local current="$1"
  local all
  all=$(gh api "/repos/${GH_REPO}/releases" --paginate --jq '.[].tag_name' \
    | grep -E "^${TAG_PREFIX}[0-9]+\.[0-9]+\.[0-9]+$" \
    | sed "s/^${TAG_PREFIX}//" \
    | sort -V -u)

  # Добавляем current в поток, сортируем, печатаем всё после current
  printf '%s\n%s\n' "$current" "$all" \
    | sort -V -u \
    | awk -v cur="$current" 'found {print} $0 == cur {found=1}'
}

sync_one_version() {
  local storage="$1" prev="$2" new="$3"

  # Идемпотентность: если versions/$new уже лежит в storage (повторный прогон
  # после половинного успеха предыдущего запуска), не качаем заново и не
  # трогаем manifest для этой пары — доверяем тому, что было собрано раньше.
  if [ -d "$storage/versions/$new" ]; then
    log "$new already in storage — skipping"
    return
  fi

  local tmp; tmp=$(mktemp -d)

  # 1. Получаем список изменённых SVG через compare API
  local changes_json="$tmp/changes.json"
  gh api "/repos/${GH_REPO}/compare/${TAG_PREFIX}${prev}...${TAG_PREFIX}${new}" \
    --jq '[.files[]?
           | select(.filename | startswith("icons/"))
           | select(.filename | endswith(".svg"))]' \
    > "$changes_json"

  local change_count; change_count=$(jq 'length' "$changes_json")
  log "$change_count changed icon files"

  if [ "$change_count" -gt "$MAX_CHANGED_FILES" ]; then
    log "> $MAX_CHANGED_FILES changes — falling back to full tarball download"
    rm -rf "$tmp"
    sync_one_version_full "$storage" "$prev" "$new"
    return
  fi

  # 2. Скачать added/modified/renamed; собрать removed
  local downloaded_dir="$tmp/svg"; mkdir -p "$downloaded_dir"
  local hashes_json="$tmp/hashes.json"; echo '{}' > "$hashes_json"
  local removed_json="$tmp/removed.json"; echo '[]' > "$removed_json"

  local line
  while IFS= read -r line; do
    local status name
    status=$(jq -r '.status' <<< "$line")
    name=$(jq -r '.filename | ltrimstr("icons/") | rtrimstr(".svg")' <<< "$line")

    case "$status" in
      added|modified|changed)
        fetch_and_hash "$new" "$name" "$downloaded_dir" "$storage" "$hashes_json"
        ;;
      renamed)
        # Старое имя — удалить, новое — скачать
        local old_name
        old_name=$(jq -r '.previous_filename | ltrimstr("icons/") | rtrimstr(".svg")' <<< "$line")
        jq --arg n "$old_name" '. + [$n]' "$removed_json" > "${removed_json}.tmp"
        mv "${removed_json}.tmp" "$removed_json"
        fetch_and_hash "$new" "$name" "$downloaded_dir" "$storage" "$hashes_json"
        ;;
      removed)
        jq --arg n "$name" '. + [$n]' "$removed_json" > "${removed_json}.tmp"
        mv "${removed_json}.tmp" "$removed_json"
        ;;
      *)
        log "unknown status '$status' for $name — skipping"
        ;;
    esac
  done < <(jq -c '.[]' "$changes_json")

  # 3. Создать versions/{new}/ — копируем симлинки из prev, применяем изменения
  build_version_dir "$storage" "$prev" "$new" "$hashes_json" "$removed_json"

  # 4. Обновить manifest
  update_manifest "$storage" "$prev" "$new" "$hashes_json" "$removed_json"

  rm -rf "$tmp"
}

fetch_and_hash() {
  local version="$1" name="$2" svg_dir="$3" storage="$4" hashes_json="$5"
  local dest="$svg_dir/${name}.svg"
  local url="https://raw.githubusercontent.com/${GH_REPO}/${TAG_PREFIX}${version}/icons/${name}.svg"

  curl -sSLf "$url" -o "$dest" || fail "download failed: $url"
  verify_svg "$dest"
  local hash; hash=$(store_blob "$dest" "$storage")

  jq --arg n "$name" --arg h "$hash" '. + {($n): $h}' "$hashes_json" > "${hashes_json}.tmp"
  mv "${hashes_json}.tmp" "$hashes_json"
}

sync_one_version_full() {
  # Fallback: полный tarball, как bootstrap, но в существующий storage.
  local storage="$1" prev="$2" new="$3"
  local new_dir="$storage/versions/$new"
  local manifest="$storage/manifest.json"

  # Идемпотентно — см. sync_one_version. Идём вместе с тем же поведением, чтобы
  # повторный запуск после фолбэка через tarball не падал.
  if [ -d "$new_dir" ]; then
    log "$new already in storage — skipping"
    return
  fi
  mkdir -p "$new_dir"

  local icons_tmp; icons_tmp=$(mktemp -d)
  download_and_extract_tarball "$new" "$icons_tmp"

  local hashes_json; hashes_json=$(mktemp)
  echo '{}' > "$hashes_json"

  for svg in "$icons_tmp"/*.svg; do
    [ -e "$svg" ] || continue
    local name; name=$(basename "$svg" .svg)
    verify_svg "$svg"
    local hash; hash=$(store_blob "$svg" "$storage")
    ln -sf "../../blobs/${hash}.svg" "$new_dir/${name}.svg"
    jq --arg n "$name" --arg h "$hash" '. + {($n): $h}' "$hashes_json" > "${hashes_json}.tmp"
    mv "${hashes_json}.tmp" "$hashes_json"
  done
  rm -rf "$icons_tmp"

  # Manifest: для fallback новый маппинг полностью из $hashes_json (вся версия),
  # removed уже учтён (отсутствующие иконки просто не попали).
  jq --arg new "$new" --slurpfile full "$hashes_json" \
     '.versions[$new] = $full[0] | .latest = $new | .upstream = $new' \
     "$manifest" > "${manifest}.tmp"
  mv "${manifest}.tmp" "$manifest"

  rm -f "$hashes_json"
  log "full sync of $new complete"
}

build_version_dir() {
  local storage="$1" prev="$2" new="$3" hashes_json="$4" removed_json="$5"
  local new_dir="$storage/versions/$new"
  local prev_dir="$storage/versions/$prev"

  [ -d "$prev_dir" ] || fail "previous version dir missing: $prev_dir"
  [ ! -d "$new_dir" ] || fail "version already exists: $new_dir"

  mkdir -p "$new_dir"

  # Собрать отсортированные списки имён в файлы
  local removed_list; removed_list=$(mktemp)
  local changed_list; changed_list=$(mktemp)
  jq -r '.[]'        "$removed_json" | sort > "$removed_list"
  jq -r 'keys[]'     "$hashes_json"  | sort > "$changed_list"

  # Перенести из prev: всё, что не в removed и не в changed
  local link name
  for link in "$prev_dir"/*.svg; do
    [ -e "$link" ] || continue
    name=$(basename "$link" .svg)
    if grep -Fxq "$name" "$removed_list"; then continue; fi
    if grep -Fxq "$name" "$changed_list"; then continue; fi
    local target; target=$(readlink "$link")
    ln -s "$target" "$new_dir/${name}.svg"
  done

  # Добавить added/modified/renamed
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    local hash; hash=$(jq -r --arg n "$name" '.[$n]' "$hashes_json")
    ln -sf "../../blobs/${hash}.svg" "$new_dir/${name}.svg"
  done < "$changed_list"

  rm -f "$removed_list" "$changed_list"
}

update_manifest() {
  local storage="$1" prev="$2" new="$3" hashes_json="$4" removed_json="$5"
  local manifest="$storage/manifest.json"

  jq --arg prev "$prev" --arg new "$new" \
     --slurpfile changed "$hashes_json" \
     --slurpfile removed "$removed_json" \
     '.versions[$new] =
        ((.versions[$prev] // {}) + $changed[0]
         | to_entries
         | map(select(.key as $k | $removed[0] | index($k) | not))
         | from_entries)
      | .latest = $new
      | .upstream = $new' \
     "$manifest" > "${manifest}.tmp"
  mv "${manifest}.tmp" "$manifest"
}

# ─── CLI ──────────────────────────────────────────────────────────────────────

usage() {
  cat <<EOF
Usage:
  $0 bootstrap --version VER [--storage DIR]
  $0 sync [--storage DIR] [--from VER]
  $0 --help

Env:
  STORAGE_DIR   storage root (default: $DEFAULT_STORAGE)
  GH_REPO       Lucide repo (default: $DEFAULT_REPO)
  TAG_PREFIX    git tag prefix (default: "$DEFAULT_TAG_PREFIX"; set empty if tags have no prefix)
EOF
}

main() {
  check_bash_version
  check_deps

  local storage="${STORAGE_DIR:-$DEFAULT_STORAGE}"
  GH_REPO="${GH_REPO:-$DEFAULT_REPO}"
  TAG_PREFIX="${TAG_PREFIX-$DEFAULT_TAG_PREFIX}"

  local cmd="${1:-}"
  shift || true

  local version="" from=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --version) version="$2"; shift 2 ;;
      --storage) storage="$2"; shift 2 ;;
      --from)    from="$2";    shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *) fail "unknown arg: $1" ;;
    esac
  done

  case "$cmd" in
    bootstrap) cmd_bootstrap "$version" "$storage" ;;
    sync)      cmd_sync      "$storage" "$from" ;;
    --help|-h|"") usage; exit 0 ;;
    *) fail "unknown command: ${cmd:-<none>}. Run with --help" ;;
  esac
}

main "$@"
