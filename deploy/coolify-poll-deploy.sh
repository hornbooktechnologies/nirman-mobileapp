#!/usr/bin/env bash
set -euo pipefail

config_file="${NIRMANSITE_COOLIFY_POLLER_CONFIG:-$HOME/.config/nirmansite-coolify/poller.env}"
if [[ ! -r "$config_file" ]]; then
  echo "Coolify poller configuration is not readable: $config_file" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$config_file"

required=(
  COOLIFY_API_URL
  COOLIFY_AUTH_HEADER_FILE
  GIT_REPOSITORY
  GIT_BRANCH
  DEPLOYED_SHA_FILE
  LOCK_FILE
)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Required poller setting is empty: $variable" >&2
    exit 1
  fi
done

if [[ -z "${COOLIFY_APPLICATION_UUID:-}" ]]; then
  for variable in \
    COOLIFY_API_APPLICATION_UUID \
    COOLIFY_WEB_APPLICATION_UUID \
    COOLIFY_WEBSITE_APPLICATION_UUID; do
    if [[ -z "${!variable:-}" ]]; then
      echo "Split deployment requires a Coolify UUID for every service: $variable" >&2
      exit 1
    fi
  done
fi

git_cache_dir="${GIT_CACHE_DIR:-$(dirname "$DEPLOYED_SHA_FILE")/repository.git}"
mkdir -p "$(dirname "$DEPLOYED_SHA_FILE")" "$(dirname "$LOCK_FILE")" "$(dirname "$git_cache_dir")"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

remote_sha="$(git ls-remote --exit-code "$GIT_REPOSITORY" "refs/heads/$GIT_BRANCH" | awk '{print $1}')"
if [[ ! "$remote_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Could not resolve a valid remote Git commit.' >&2
  exit 1
fi

deployed_sha=''
if [[ -r "$DEPLOYED_SHA_FILE" ]]; then
  deployed_sha="$(tr -d '[:space:]' < "$DEPLOYED_SHA_FILE")"
fi
if [[ "$remote_sha" == "$deployed_sha" ]]; then
  exit 0
fi

if ! git --git-dir="$git_cache_dir" rev-parse --is-bare-repository >/dev/null 2>&1; then
  git init --bare "$git_cache_dir" >/dev/null
fi
git --git-dir="$git_cache_dir" fetch --quiet --force --no-tags \
  "$GIT_REPOSITORY" "refs/heads/$GIT_BRANCH:refs/remotes/nirmansite/$GIT_BRANCH"

deploy_api=false
deploy_web=false
deploy_website=false
deploy_legacy=false

if [[ -n "${COOLIFY_APPLICATION_UUID:-}" ]]; then
  deploy_legacy=true
elif [[ "$deployed_sha" =~ ^[0-9a-f]{40}$ ]] \
  && git --git-dir="$git_cache_dir" cat-file -e "$deployed_sha^{commit}" 2>/dev/null; then
  while IFS= read -r -d '' changed_path; do
    case "$changed_path" in
      package.json|pnpm-lock.yaml|pnpm-workspace.yaml|turbo.json|.npmrc|.dockerignore)
        deploy_api=true
        deploy_web=true
        deploy_website=true
        ;;
      apps/api/*|packages/shared/*|deploy/coolify-migrate.sh|compose.coolify-api.yaml)
        deploy_api=true
        ;;
      apps/web/*|compose.coolify-web.yaml)
        deploy_web=true
        ;;
      apps/website/*|compose.coolify-website.yaml)
        deploy_website=true
        ;;
      scripts/load-root-env.cjs)
        deploy_web=true
        deploy_website=true
        ;;
    esac
  done < <(git --git-dir="$git_cache_dir" diff --name-only -z "$deployed_sha" "$remote_sha")
else
  # A new or stale state file cannot provide a safe diff baseline.
  deploy_api=true
  deploy_web=true
  deploy_website=true
fi

resource_uuids=()
resource_names=()

add_resource() {
  local should_deploy="$1"
  local resource_name="$2"
  local resource_uuid="$3"

  if [[ "$should_deploy" != true ]]; then
    return
  fi
  if [[ -z "$resource_uuid" ]]; then
    echo "Skipping changed service without a configured Coolify UUID: $resource_name" >&2
    return
  fi
  resource_names+=("$resource_name")
  resource_uuids+=("$resource_uuid")
}

if [[ "$deploy_legacy" == true ]]; then
  add_resource true legacy "$COOLIFY_APPLICATION_UUID"
else
  add_resource "$deploy_api" api "${COOLIFY_API_APPLICATION_UUID:-}"
  add_resource "$deploy_web" web "${COOLIFY_WEB_APPLICATION_UUID:-}"
  add_resource "$deploy_website" website "${COOLIFY_WEBSITE_APPLICATION_UUID:-}"
fi

if (( ${#resource_uuids[@]} > 0 )); then
  response_file="$(mktemp)"
  state_file="$(mktemp "$(dirname "$DEPLOYED_SHA_FILE")/.deployed-sha.XXXXXX")"
  cleanup() {
    rm -f "$response_file" "$state_file"
  }
  trap cleanup EXIT

  uuid_csv="$(IFS=,; echo "${resource_uuids[*]}")"
  http_code="$(curl --silent --show-error \
    --output "$response_file" \
    --write-out '%{http_code}' \
    --request POST \
    --header @"$COOLIFY_AUTH_HEADER_FILE" \
    --header 'Content-Type: application/json' \
    --data "{\"uuid\":\"$uuid_csv\",\"force\":false}" \
    "$COOLIFY_API_URL/api/v1/deploy")"

  if [[ "$http_code" != '200' ]]; then
    message="$(jq -r '.message // "unknown Coolify API error"' "$response_file" 2>/dev/null || true)"
    echo "Coolify deployment request failed (HTTP $http_code): $message" >&2
    exit 1
  fi

  expected_count="${#resource_uuids[@]}"
  if ! jq -e --argjson expected "$expected_count" \
    '.deployments | type == "array" and length == $expected and all(.[]; (.deployment_uuid | type == "string" and length > 0))' \
    "$response_file" >/dev/null; then
    echo 'Coolify accepted the request without returning every expected deployment UUID.' >&2
    exit 1
  fi

  echo "Queued services: ${resource_names[*]}"
  jq -r '.deployments[] | "Queued Coolify deployment \(.deployment_uuid) for resource \(.resource_uuid)"' "$response_file"
else
  echo "No deployable service changed in $remote_sha"
  state_file="$(mktemp "$(dirname "$DEPLOYED_SHA_FILE")/.deployed-sha.XXXXXX")"
fi

printf '%s\n' "$remote_sha" > "$state_file"
chmod 600 "$state_file"
mv -f "$state_file" "$DEPLOYED_SHA_FILE"
