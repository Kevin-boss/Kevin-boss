# Provider Credential Requirements

## Consolidated Credential Collection

AI Content OS is prepared to collect required values **together**, after private services are deployed. No raw secret is rendered in the browser, committed to source control, or embedded in a model-provider record.

| Integration | Required server-side variable | Provide when | Notes |
|---|---|---|---|
| Kokoro private TTS worker | `TTS_WORKER_URL` | The private worker is deployed and its `/healthz` endpoint is reachable from the application. | Example format: `https://tts.example.internal`. The registered provider endpoint is the service speech route. |
| Kokoro private TTS worker | `TTS_WORKER_TOKEN` | At the same time as `TTS_WORKER_URL`, if bearer authentication is enabled. | Use a high-entropy token. It is sent only from the server to `POST /v1/audio/speech`. |
| Private production render worker | `RENDER_WORKER_URL` | The MP4 render worker is deployed and reachable from the application. | Required for natural-voice, long-form final MP4 jobs; not needed for browser-local WebM drafts. |
| Private production render worker | `RENDER_WORKER_TOKEN` | At the same time as `RENDER_WORKER_URL`, if bearer authentication is enabled. | Sent only from the server to the private render-worker endpoint. |

The currently configured credential-free paths use the built-in application services and the browser-local WebM renderer. Social-publishing credentials remain intentionally out of scope until the deferred publishing adapter is implemented and official platform account links are ready.

## Public Provider References

| Capability | Official reference | Integration boundary |
|---|---|---|
| Natural-voice TTS | [Kokoro](https://github.com/hexgrad/kokoro) | Private worker package at `workers/kokoro/`; no model weights in the web deployment. |
| TTS model assets | [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M) | Review voices and permitted use before administrator consent is verified. |
| ASR | [Whisper](https://github.com/openai/whisper) | Existing registry-backed ASR boundary; self-hosted endpoint remains optional. |
| Image generation | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Existing registry-backed image boundary; self-hosted endpoint remains optional. |
