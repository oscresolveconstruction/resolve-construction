# Railway → WhatsApp alert receiver (not deployed)

A standalone Node.js HTTP receiver. Deploy as a **separate Railway service** only after the Meta WhatsApp Cloud API sender and approved utility template have been configured.

## Environment variables

- `RAILWAY_WEBHOOK_SECRET`: random secret, also added to Railway's project webhook as `Authorization: Bearer <secret>`.
- `WA_ACCESS_TOKEN`: Meta system-user token with messaging permission (secret).
- `WA_PHONE_NUMBER_ID`: sending number ID from Meta, **not** the recipient's number.
- `WA_RECIPIENT`: opted-in recipient's number in international format, without +.
- `WA_GRAPH_VERSION`: currently supported Graph API version (check Meta before launch; default in code is only an example).
- `WA_TEMPLATE_NAME`: approved Meta utility template (default `resolve_critical_alert`).
- `WA_TEMPLATE_LANGUAGE`: approved template language (default `en`).
- `PORT`: injected by Railway.

Template body example: `Resolve Construction alert: {{1}} has experienced {{2}}. Please check Railway.` The template must be created and approved with exactly two body variables. Only alerts from production service `resolve-construction` of types `Deployment.failed` and `Deployment.crashed` are sent.

Run: `node alerts/receiver.mjs`. Health: `GET /health`; webhook: `POST /railway-webhook`.

## Before activation
1. Obtain an official Meta WhatsApp Business Platform sending number (recipient may use regular personal WhatsApp), opt-in and approved utility template.
2. Deploy the receiver as an isolated Railway service, with health check and secrets stored as service variables.
3. Register a Railway project webhook to the receiver HTTPS `/railway-webhook` endpoint, with the authorization header. Select deployment status change events.
4. Test an authorized **synthetic** `Deployment.failed` event before enabling real notifications. Do not simulate an actual production failure.
5. Confirm the message arrives at the opted-in number; add monitoring and alerting for relay failures.

Caveats: Railway retries webhook deliveries; this minimal receiver is **not durable or deduplicated** and may send duplicates. Prior to production use, introduce a durable event store/queue with idempotency by event/deployment ID, rate limits, observability and retry policy. Sender setup and template approval are external prerequisites. WhatsApp message charges may apply. No alerts are active merely because these files exist.

Do not merge or deploy this branch until reviewed and tested.
