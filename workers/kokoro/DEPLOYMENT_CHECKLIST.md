# Kokoro Private Worker Deployment Checklist

## Release Gate

Complete every control below before registering the worker endpoint in AI Content OS. The service is designed to remain private; its base URL and bearer token are not browser configuration values.

| Control area | Required production control | Validation evidence |
|---|---|---|
| Runtime and model | Install the pinned dependency range in `requirements.txt`, install required system speech dependencies, and allow model caching only on the worker host. | A worker release record identifies the image or environment revision and confirmed Kokoro model version. |
| Health | Expose `GET /healthz` only to the load balancer or application network and require a successful health response before enabling the provider. | Health probe returns `status: ok`, `provider: kokoro`, and `model: Kokoro-82M`. |
| Authentication | Set a high-entropy `TTS_WORKER_TOKEN`; send it only as a server-side bearer token; rotate it before an incident response or worker handover. | An unauthenticated speech request returns `401` when the token is configured. |
| Network | Restrict the endpoint to the AI Content OS server and private render worker through network policy or firewall rules. | Public internet access is denied and only approved service identities reach port 8000. |
| Consent | Create a voice record and a verified `commercial_tts` consent record with an evidence reference before a voice is used. | The guarded synthesis test is replicated in staging: request fails before consent and succeeds only after administrative verification. |
| Storage | Return audio to the application once; use tenant-scoped object storage for the persisted asset; apply retention rules to worker-local temporary files. | Generated audio has a tenant-scoped storage key and no raw output remains on the worker after retention cleanup. |
| Observability | Record job ID, provider, model, approved voice ID, duration, HTTP status, and error class without logging narration text, tokens, or raw audio. | A failed request can be correlated from the application job record to a worker log entry without exposing sensitive content. |
| Rollback | Maintain a previous known-good worker revision and disable the provider registry entry before rollback if output quality, consent validation, or health checks fail. | An operator can disable the provider without deleting jobs or existing output assets. |

## Enablement Sequence

1. Deploy the worker privately and verify the health endpoint.
2. Store the endpoint and token through server-side configuration only.
3. Register the provider as self-hosted, free-tier, commercially allowed, and initially disabled.
4. Add an approved voice and verified commercial-consent evidence through the administrator workflow.
5. Execute a short staging synthesis, verify the tenant storage asset and audit record, then enable the provider for the selected workspace.

> Do not expose the worker directly to browsers, upload unverified reference voices, or enable production synthesis merely because the model service responds to a health probe.
