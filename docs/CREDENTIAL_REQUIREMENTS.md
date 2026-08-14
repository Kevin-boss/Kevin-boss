# Provider Credential Requirements

## Consolidated Credential Collection

AI Content OS is prepared to collect required values **together**, after private services are deployed. No raw secret is rendered in the browser, committed to source control, or embedded in a model-provider record.

| Integration | Required server-side variable | Provide when | Notes |
|---|---|---|---|
| Hugging Face Inference Providers | `HF_TOKEN` | Public-provider inference is enabled. | The official public base URL is `https://router.huggingface.co/v1`; use a fine-grained token permitted to make Inference Provider calls. |
| Private Kokoro worker | `TTS_WORKER_TOKEN` | Only if the optional self-hosted Kokoro worker is later deployed with authentication. | No worker URL is requested: deployment-specific URLs are registered by an administrator after service deployment. |
| Private production render worker | `RENDER_WORKER_TOKEN` | Only if the optional self-hosted final-render worker is later deployed with authentication. | Browser-local WebM drafts do not require this value. |

The currently configured credential-free paths use the built-in application services and the browser-local WebM renderer. Social-publishing credentials remain intentionally out of scope until the deferred publishing adapter is implemented and official platform account links are ready. The official public Hugging Face endpoint is used as the default public-provider reference; the included Kokoro worker remains an optional self-hosted path for work that needs the private consent-controlled contract.

## Validation Record

The supplied `HF_TOKEN` was validated against Hugging Face's official `GET https://huggingface.co/api/whoami-v2` account endpoint. Registry adapters attach that token only when calling the public `https://router.huggingface.co/` inference router; local and private endpoints do not receive it. The official JavaScript `InferenceClient.textToSpeech` path is now covered by both adapter and production-workflow tests: it accepts the model identifier and text on the server, normalizes the returned audio blob, persists the tenant-scoped asset, and returns only the normal job and asset result to the caller.[1]

| Credentialed capability | Status | Verified application behavior |
|---|---|---|
| Public Hugging Face text and image inference | Validated | Uses `HF_TOKEN` only for official router requests; callers never receive the token. |
| Public Hugging Face TTS with `hexgrad/Kokoro-82M` | Validated in automated integration coverage | Uses server-side `InferenceClient.textToSpeech`, stores normalized audio in tenant-scoped storage, and retains the existing free-first policy and verified-consent guard. |
| Private Kokoro TTS worker | Prepared, not configured | Requires administrator-controlled deployment and its optional `TTS_WORKER_TOKEN`; no private URL is requested from the user. |
| Private final MP4 render worker | Prepared, not configured | Requires administrator-controlled deployment and its optional `RENDER_WORKER_TOKEN`; browser-local WebM remains available without it. |

## Operational Boundary

**Public provider calls** use the official Hugging Face router and the server-side `HF_TOKEN`. Public TTS is implemented as a token-only, model-selected speech path: it sends text and model ID to `InferenceClient.textToSpeech`, while selection and verified commercial-consent checks remain in the application. The public model output is treated as its registered default voice; it does not receive the private Kokoro catalog controls for gender, tone, accent, speed, or emotion. **Private Kokoro TTS** retains those controls through its authenticated worker payload and its consent/provenance process. **Browser-local quick drafts** render locally and require no service credential. **Final production MP4 composition** remains a separate private render-worker capability because it combines timeline tracks, captions, licensed assets, storage persistence, and long-running job control; it must not be represented as a public text-to-video call.

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
