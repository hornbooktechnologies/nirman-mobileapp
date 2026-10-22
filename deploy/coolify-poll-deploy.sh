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
  COOLIFY_APPLICATION_UUID
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

mkdir -p "$(dirname "$DEPLOYED_SHA_FILE")" "$(dirname "$LOCK_FILE")"
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

response_file="$(mktemp)"
state_file="$(mktemp "$(dirname "$DEPLOYED_SHA_FILE")/.deployed-sha.XXXXXX")"
cleanup() {
  rm -f "$response_file" "$state_file"
}
trap cleanup EXIT

http_code="$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  --request POST \
  --header @"$COOLIFY_AUTH_HEADER_FILE" \
  --header 'Content-Type: application/json' \
  --data "{\"uuid\":\"$COOLIFY_APPLICATION_UUID\",\"force\":false}" \
  "$COOLIFY_API_URL/api/v1/deploy")"

if [[ "$http_code" != '200' ]]; then
  message="$(jq -r '.message // "unknown Coolify API error"' "$response_file" 2>/dev/null || true)"
  echo "Coolify deployment request failed (HTTP $http_code): $message" >&2
  exit 1
fi

deployment_uuid="$(jq -r '.deployments[0].deployment_uuid // empty' "$response_file")"
if [[ -z "$deployment_uuid" ]]; then
  echo 'Coolify accepted the request without returning a deployment UUID.' >&2
  exit 1
fi

printf '%s\n' "$remote_sha" > "$state_file"
chmod 600 "$state_file"
mv -f "$state_file" "$DEPLOYED_SHA_FILE"
echo "Queued Coolify deployment $deployment_uuid for $remote_sha"
