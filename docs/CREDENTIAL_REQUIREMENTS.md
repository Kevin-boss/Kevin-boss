# Provider Credential Requirements

## On-demand Platform Credential Collection

AI Content OS requests each platform's required values **only when the user elects to activate publishing for that platform**. The submitted values are stored server-side for future authorized publishing; no raw secret is rendered in the browser, committed to source control, or embedded in a model-provider record.

| Integration | Required server-side variable | Provide when | Notes |
|---|---|---|---|
| Hugging Face Inference Providers | `HF_TOKEN` | Public-provider inference is enabled. | The official public base URL is `https://router.huggingface.co/v1`; use a fine-grained token permitted to make Inference Provider calls. |
| Private Kokoro worker | `TTS_WORKER_TOKEN` | Only if the optional self-hosted Kokoro worker is later deployed with authentication. | No worker URL is requested: deployment-specific URLs are registered by an administrator after service deployment. |
| Private production render worker | `RENDER_WORKER_TOKEN` | Only if the optional self-hosted final-render worker is later deployed with authentication. | Browser-local WebM drafts do not require this value. |
| YouTube Data API | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | When the YouTube OAuth adapter is activated. | Required for official upload authorization; an approved final asset and authorized channel are also required. |
| TikTok Content Posting API | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_WEBHOOK_SECRET` | When the TikTok OAuth adapter is activated. | The callback requires HTTPS; direct posting can require a verified media domain or URL prefix.[2] |
| Meta Graph API for Facebook Pages and Instagram | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` | When either Meta publishing adapter is activated. | One application credential set supports both adapters; Instagram requires an eligible professional account and Page Publishing Authorization.[3] |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | When the LinkedIn OAuth adapter is activated. | Organization video posting requires the applicable application permissions and organization rights.[4] |
| X API | `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_WEBHOOK_SECRET` | When the X OAuth adapter is activated. | X post creation requires user-context OAuth; webhook activation also requires a public HTTPS callback with challenge-response validation.[5] |

The currently configured credential-free paths use the built-in application services and the browser-local WebM renderer. Official social publishing now has documented provider contracts, a connection-readiness surface, account/approval/attempt records, a durable dispatch callback foundation, and a credential-gated OAuth initiation procedure. When the user chooses a configured platform, initiation creates a workspace-scoped, expiring OAuth state record and PKCE verifier where required, then returns the provider's official authorization URL. It never returns a secret or starts an exchange before the selected platform is activated. External post creation remains safely disabled until the user selects a platform for publishing, provides that platform's official application credentials, completes the required OAuth redirects and platform review, and connects an approved account. The official public Hugging Face endpoint remains the default public-provider reference; the included Kokoro worker remains an optional self-hosted path for work that needs the private consent-controlled contract.

## Validation Record

The supplied `HF_TOKEN` was validated against Hugging Face's official `GET https://huggingface.co/api/whoami-v2` account endpoint. Registry adapters attach that token only when calling the public `https://router.huggingface.co/` inference router; local and private endpoints do not receive it. The official JavaScript `InferenceClient.textToSpeech` path is now covered by both adapter and production-workflow tests: it accepts the model identifier and text on the server, normalizes the returned audio blob, persists the tenant-scoped asset, and returns only the normal job and asset result to the caller.[1]

| Credentialed capability | Status | Verified application behavior |
|---|---|---|
| Public Hugging Face text and image inference | Validated | Uses `HF_TOKEN` only for official router requests; callers never receive the token. |
| Public Hugging Face TTS with `hexgrad/Kokoro-82M` | Validated in automated integration coverage | Uses server-side `InferenceClient.textToSpeech`, stores normalized audio in tenant-scoped storage, and retains the existing free-first policy and verified-consent guard. |
| Private Kokoro TTS worker | Prepared, not configured | Requires administrator-controlled deployment and its optional `TTS_WORKER_TOKEN`; no private URL is requested from the user. |
| Private final MP4 render worker | Prepared, not configured | Requires administrator-controlled deployment and its optional `RENDER_WORKER_TOKEN`; browser-local WebM remains available without it. |
| Official social adapter contracts | Verified and scaffolded | YouTube, TikTok, Facebook Pages, Instagram, LinkedIn, and X are represented only where an official outbound publishing contract was verified; the adapter readiness endpoint never returns secret values. |
| Official social OAuth initiation | Implemented, inactive pending platform activation | Creates a workspace-scoped expiring state record, uses a SHA-256 PKCE challenge where the provider contract requires it, and returns only the official authorization URL after required server credentials are present. |
| Approval-aware scheduled dispatch | Implemented, inactive pending credentials and publication | A protected platform-managed callback queues an idempotent delivery attempt only after a plan is approved, connected to the matching account, and attached to a final video asset. |

## Operational Boundary

**Public provider calls** use the official Hugging Face router and the server-side `HF_TOKEN`. Public TTS is implemented as a token-only, model-selected speech path: it sends text and model ID to `InferenceClient.textToSpeech`, while selection and verified commercial-consent checks remain in the application. The public model output is treated as its registered default voice; it does not receive the private Kokoro catalog controls for gender, tone, accent, speed, or emotion. **Private Kokoro TTS** retains those controls through its authenticated worker payload and its consent/provenance process. **Browser-local quick drafts** render locally and require no service credential. **Final production MP4 composition** remains a separate private render-worker capability because it combines timeline tracks, captions, licensed assets, storage persistence, and long-running job control; it must not be represented as a public text-to-video call.

Social OAuth application secrets and provider tokens follow the same server-only rule. The database stores only a reference to credential material, public account identity, granted scopes, expiry metadata, and sanitized state; it does not store raw access or refresh tokens in browser-visible records. A scheduled dispatch callback has a single responsibility: it validates a ready approved plan and creates an idempotent queue record. It does not fabricate a provider result or mark a post published before the official adapter has returned a verified provider post identifier.

## Public Provider References

| Capability | Official reference | Integration boundary |
|---|---|---|
| Natural-voice TTS | [Kokoro](https://github.com/hexgrad/kokoro) | Private worker package at `workers/kokoro/`; no model weights in the web deployment. |
| TTS model assets | [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M) | Review voices and permitted use before administrator consent is verified. |
| ASR | [Whisper](https://github.com/openai/whisper) | Existing registry-backed ASR boundary; self-hosted endpoint remains optional. |
| Image generation | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Existing registry-backed image boundary; self-hosted endpoint remains optional. |
| Text-to-video generation | [Hugging Face InferenceClient](https://huggingface.co/docs/huggingface.js/en/inference/classes/InferenceClient) | Public token-only generation capability via `textToVideo`; suitable for generated clips, not a substitute for the multi-track, captions, licensed-media, and long-form final MP4 compositing worker. |

## References

[1]: https://huggingface.co/docs/huggingface.js/en/inference/classes/InferenceClient "Hugging Face JavaScript InferenceClient documentation"
[2]: https://developers.tiktok.com/doc/content-posting-api-get-started "TikTok Content Posting API: Get Started"
[3]: https://developers.facebook.com/documentation/instagram-platform/content-publishing "Meta Instagram Content Publishing API"
[4]: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-07 "LinkedIn Videos API"
[5]: https://docs.x.com/x-api/webhooks/introduction "X API v2 Webhooks"
