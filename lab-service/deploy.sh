#!/usr/bin/env bash
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT before deploying}"
REGION="${REGION:-us-west1}"
IMAGE="gcr.io/${GOOGLE_CLOUD_PROJECT}/lab-report-service"

gcloud builds submit --tag "$IMAGE" .
gcloud run deploy lab-report-service \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances=1 \
  --set-env-vars PUBSUB_TOPIC="${PUBSUB_TOPIC:-new-lab-report}"
