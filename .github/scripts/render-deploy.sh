#!/usr/bin/env bash
# Trigger a Render deploy and block until it is live (or fails).
# Requires: RENDER_API_KEY (secret), SERVICE_ID (the srv-… id of the service).
set -euo pipefail

api="https://api.render.com/v1"

deploy_id=$(
  curl -fsS -X POST "${api}/services/${SERVICE_ID}/deploys" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' | jq -r '.id'
)
echo "Triggered deploy ${deploy_id} for ${SERVICE_ID}"

# Free-tier Docker builds can take a while; poll for up to 20 minutes.
for _ in $(seq 1 120); do
  status=$(
    curl -fsS "${api}/services/${SERVICE_ID}/deploys/${deploy_id}" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" | jq -r '.status'
  )
  echo "  status: ${status}"
  case "${status}" in
    live)
      echo "Deploy is live."
      exit 0
      ;;
    build_failed|update_failed|pre_deploy_failed|canceled|deactivated)
      echo "Deploy failed with status: ${status}" >&2
      exit 1
      ;;
  esac
  sleep 10
done

echo "Timed out waiting for the deploy to go live." >&2
exit 1
