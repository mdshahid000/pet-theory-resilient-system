# Pet Theory Resilient Async System

A Cloud Run and Pub/Sub prototype based on the Pet Theory lab. The system accepts medical lab reports over HTTP, publishes each report to the `new-lab-report` Pub/Sub topic, and independently delivers the report through email and SMS worker services.

## Architecture

```text
Lab company --HTTP POST--> lab-report-service --Pub/Sub topic--> email-service
                                                            \--> sms-service
```

The email and SMS services are separate Pub/Sub push subscribers. They acknowledge successful work with HTTP `204`. Any decoding or delivery failure returns HTTP `500`, causing Pub/Sub to retry the message rather than dropping it.

## Repository layout

| Path | Purpose |
|---|---|
| `lab-service/` | Public HTTP ingress and Pub/Sub publisher |
| `email-service/` | Private Pub/Sub push endpoint for email delivery |
| `sms-service/` | Private Pub/Sub push endpoint for SMS delivery |
| `post-reports.sh` | Sends sample reports with IDs 12, 34, and 56 |

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
for service in lab-service email-service sms-service; do
  (cd "$service" && npm install)
done

npm --prefix lab-service test
npm --prefix email-service test
npm --prefix sms-service test
```

The lab service requires Google Application Default Credentials when it publishes to Pub/Sub. For local HTTP-only checks, run the worker services directly; the included tests mock the Pub/Sub publisher.

## Google Cloud deployment

Set the project and region first:

```bash
export GOOGLE_CLOUD_PROJECT="your-lab-project-id"
export REGION="us-west1"
gcloud config set project "$GOOGLE_CLOUD_PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com pubsub.googleapis.com

gcloud pubsub topics create new-lab-report
```

Deploy each service from its own directory:

```bash
(cd lab-service && ./deploy.sh)
(cd email-service && ./deploy.sh)
(cd sms-service && ./deploy.sh)
```

Create the Pub/Sub push subscriptions. The invoker service account must be able to invoke both private worker services:

```bash
gcloud iam service-accounts create pubsub-cloud-run-invoker \
  --display-name="Pub/Sub Cloud Run Invoker"

for service in email-service sms-service; do
  gcloud run services add-iam-policy-binding "$service" \
    --member="serviceAccount:pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" \
    --role="roles/run.invoker" --region "$REGION" --platform managed
done

PROJECT_NUMBER="$(gcloud projects describe "$GOOGLE_CLOUD_PROJECT" --format='value(projectNumber)')"
gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
  --member="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

EMAIL_SERVICE_URL="$(gcloud run services describe email-service --platform managed --region "$REGION" --format='value(status.address.url)')"
SMS_SERVICE_URL="$(gcloud run services describe sms-service --platform managed --region "$REGION" --format='value(status.address.url)')"
INVOKER="pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com"

gcloud pubsub subscriptions create email-service-sub \
  --topic new-lab-report --push-endpoint="$EMAIL_SERVICE_URL" \
  --push-auth-service-account="$INVOKER"
gcloud pubsub subscriptions create sms-service-sub \
  --topic new-lab-report --push-endpoint="$SMS_SERVICE_URL" \
  --push-auth-service-account="$INVOKER"
```

Finally, post reports to the public ingress service:

```bash
export LAB_REPORT_SERVICE_URL="$(gcloud run services describe lab-report-service --platform managed --region "$REGION" --format='value(status.address.url)')"
./post-reports.sh
```

## Resilience exercise

To simulate an unavailable email provider, temporarily add `throw new Error('Email server is down')` at the beginning of `sendEmail` in `email-service/index.js`, redeploy that service, and post reports again. The email subscriber will return `500` and Pub/Sub will retry. The SMS subscriber remains independent and continues processing. Remove the throw statement and redeploy; queued email messages should eventually succeed.

## Security notes

The lab ingress is intentionally unauthenticated because the external lab company posts to it. Worker services are deployed without unauthenticated access and accept authenticated Pub/Sub push requests. Do not commit credentials, `.env` files, or temporary lab passwords.
