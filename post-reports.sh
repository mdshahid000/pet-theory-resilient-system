#!/usr/bin/env bash
set -euo pipefail

: "${LAB_REPORT_SERVICE_URL:?Set LAB_REPORT_SERVICE_URL to the deployed lab service URL}"

for id in 12 34 56; do
  curl --fail-with-body --silent --show-error \
    --request POST \
    --header 'Content-Type: application/json' \
    --data "{\"id\":${id}}" \
    "$LAB_REPORT_SERVICE_URL" &
done
wait
