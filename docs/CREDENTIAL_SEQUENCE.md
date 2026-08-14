# Credential Sequence

The platform already has managed server-side access for its built-in LLM, image-generation, and transcription helpers. Those capabilities are not requested again as user API keys.

| Sequence | Credential | Purpose | Requested when |
|---:|---|---|---|
| 1 | `TTS_API_KEY` | Provider-backed speech synthesis for approved voices | After the TTS provider endpoint and commercial-use policy are selected |
| 2 | `YOUTUBE_OAUTH_CLIENT_SECRET` | Official YouTube account connection and upload | After the YouTube OAuth application exists |
| 3 | `TIKTOK_CLIENT_SECRET` | Official TikTok account connection and publishing | After TikTok application review requirements are known |
| 4 | `META_APP_SECRET` | Facebook and Instagram account connection | After the Meta application and permissions are configured |
| 5 | `RENDER_WORKER_TOKEN` | Private authorization for the FFmpeg/worker service | After the worker environment and endpoint are selected |
| 6 | `ANALYTICS_PROVIDER_KEY` | Official analytics synchronization when a provider requires a separate key | Only for the selected analytics provider |

Each value is requested individually through the project secret-management flow.

## Current status

| Credential | Status | Validation result |
|---|---|---|
| `TTS_API_KEY` | Not requested | No external TTS provider selected yet |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | Not requested | OAuth adapter not configured |
| `TIKTOK_CLIENT_SECRET` | Not requested | OAuth adapter not configured |
| `META_APP_SECRET` | Not requested | OAuth adapter not configured |
| `RENDER_WORKER_TOKEN` | Not requested | Worker endpoint not selected |
| `ANALYTICS_PROVIDER_KEY` | Not requested | Analytics provider not selected |

No external credential has been validated in this project yet. The managed built-in LLM, image, and transcription helpers are available through the hosting environment and are not represented as user-supplied keys. Values are never placed in source code, client bundles, database rows, prompts, or audit metadata. A credential is considered configured only after an adapter performs a safe non-publishing validation call and the result is recorded.

Direct publishing remains disabled unless the corresponding official OAuth connection is present, the account capabilities are known, the workspace role permits the action, and any required reviewer approval has been recorded. A TTS key alone does not grant rights to a voice model; model and voice licensing remain separate policy records in the provider registry.

## Current external blockers

The remaining external features require a selected TTS provider, a worker runtime capable of FFmpeg and optionally GPU inference, and official applications for each publishing platform. The application continues to show explicit unavailable or approval-required states rather than fabricating successful connections or rendered exports.
