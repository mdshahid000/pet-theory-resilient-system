#!/usr/bin/env bash
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT before deploying}"
REGION="${REGION:-us-west1}"
IMAGE="gcr.io/${GOOGLE_CLOUD_PROJECT}/sms-service"

gcloud builds submit --tag "$IMAGE" .
gcloud run deploy sms-service \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --no-allow-unauthenticated \
  --max-instances=1
