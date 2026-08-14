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

The supplied `HF_TOKEN` was validated against Hugging Face's official `GET https://huggingface.co/api/whoami-v2` account endpoint. Registry adapters now attach that token only when calling the public `https://router.huggingface.co/` inference router; local and private endpoints do not receive it. The credential and header-routing behavior are covered by automated tests.

## Public Provider References

| Capability | Official reference | Integration boundary |
|---|---|---|
| Natural-voice TTS | [Kokoro](https://github.com/hexgrad/kokoro) | Private worker package at `workers/kokoro/`; no model weights in the web deployment. |
| TTS model assets | [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M) | Review voices and permitted use before administrator consent is verified. |
| ASR | [Whisper](https://github.com/openai/whisper) | Existing registry-backed ASR boundary; self-hosted endpoint remains optional. |
| Image generation | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Existing registry-backed image boundary; self-hosted endpoint remains optional. |
| Text-to-video generation | [Hugging Face InferenceClient](https://huggingface.co/docs/huggingface.js/en/inference/classes/InferenceClient) | Public token-only generation capability via `textToVideo`; suitable for generated clips, not a substitute for the multi-track, captions, licensed-media, and long-form final MP4 compositing worker. |
