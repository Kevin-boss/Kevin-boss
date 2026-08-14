# Self-Hosted Natural-Voice TTS Research

## Decision

The recommended **free-first production baseline** for AI Content OS is **Kokoro-82M**, deployed behind a private, authenticated HTTP adapter. The official project describes Kokoro as an 82-million-parameter open-weight TTS model with Apache-licensed weights that can be deployed in production, while its source repository is also Apache-2.0 licensed.[1]

| Candidate | Research finding | Decision for AI Content OS |
|---|---|---|
| **Kokoro-82M** | The official project states that its Apache-licensed weights may be deployed in production; the inference library is Apache-2.0 licensed.[1] | **Recommended default.** Use for permitted narrator voices and short-to-medium production clips, served privately through a stable adapter. |
| Coqui XTTS-v2 | The model card supports multilingual synthesis and reference-audio voice cloning, but specifies the Coqui Public Model License.[2] | **Do not enable by default.** It requires a separate legal/licence review before any commercial or client workload. |
| F5-TTS | The official repository says the code is MIT but the pre-trained models are CC-BY-NC because of their training data.[3] | **Not suitable for commercial production by default.** Keep outside the approved free-first catalogue unless replacement commercial-use weights are independently verified. |
| Piper1-GPL | The maintained implementation is GPL-3.0 licensed.[4] | **Not selected for the SaaS service boundary.** It may be appropriate for an isolated internal service after legal review, but it is not the default distribution path. |

## Private Endpoint Contract

Public internet research can identify software and model assets; it cannot provide a trustworthy private service address, API token, or a licensed voice. The production deployment must therefore be operated in a user-controlled environment and expose a private adapter using this stable contract:

| Item | Required value |
|---|---|
| Endpoint | `POST https://<private-host>/v1/audio/speech` |
| Authentication | Private network identity or a bearer token stored only in the project secrets manager. |
| Request | `{ "input": "…", "voice": "<approved-voice-id>", "format": "wav", "speed": 1 }` |
| Response | `audio/wav` binary stream, or JSON containing a short-lived signed audio URL and duration metadata. |
| Guardrails | Enforce a permitted-voice allow-list, record source/voice consent, reject unauthorised cloning references, bound text length, and retain model/version provenance with each render job. |

The application now enforces the controllable parts of this boundary before calling a registered provider: the selected voice must belong to the project's workspace, match the selected provider, and be marked `commercialUse: "allowed"`. A `voiceConsents` record must also match the selected voice and workspace, have `status: "verified"`, declare `approvedUseScope: "commercial_tts"`, contain an `evidenceReference`, and include a verifier and verification timestamp. The adapter sends a stable Kokoro-compatible JSON request, requires a non-empty base64 audio response, only accepts `audio/*` MIME types, and records provider, model, approved voice, language, and approval provenance on the resulting tenant-scoped audio asset. Live synthesis remains unavailable until the private endpoint is registered and enabled.

Workspace administrators record consent through the protected `production.voice.recordConsent` procedure. The procedure verifies workspace administration rights, validates that the voice belongs to that workspace, requires evidence for verified commercial synthesis, upserts the consent record, and writes an audit event. Automated coverage verifies both this administration path and the synthesis guard that requires the resulting verified commercial-consent record.

The guarded-flow integration test additionally proves the required order of operations: private TTS is rejected before a verified consent exists; an administrator records verified `commercial_tts` consent through the supported procedure; the same synthesis request then succeeds. This prevents a consent value supplied only by a client request from bypassing the persisted approval boundary.

## Public Inference Assessment

Hugging Face's official InferenceClient documentation includes a token-authenticated `textToSpeech` method that accepts a model identifier and text input.[5] The official Kokoro model page identifies the model as a text-to-speech model, Apache-2.0 licensed, and supported by Hugging Face Inference Providers.[6] AI Content OS now implements this as a **public token-only speech path** using the already validated `HF_TOKEN`: the server calls `InferenceClient.textToSpeech`, normalizes the returned audio blob, writes it to tenant-scoped storage, and returns the usual job and asset result. Adapter and production-route tests cover that flow.

| Speech control | Public Hugging Face TTS | Private Kokoro worker |
|---|---|---|
| Provider configuration | Official public router plus server-side `HF_TOKEN` | Administrator-controlled authenticated worker deployment |
| Voice behavior | The registered model's default output; the application still requires a matching approved voice record and verified commercial consent | Explicit approved `voice` identifier passed to the worker |
| Gender, tone, accent | Catalog metadata only; not sent to the public provider | Supported through the private approved-voice catalogue and worker configuration |
| Speed and emotion | Not sent to the public provider; treated as unavailable rather than silently simulated | Sent to the private worker payload when configured and supported |
| Long-form, multi-track final video | Not a compositing solution | Intended source for the separate private final-render workflow |

> A successful public provider call does not itself prove consent, licensed narrator identity, or a selectable voice characteristic. AI Content OS preserves the persisted approved-voice and verified-commercial-consent checks for both paths; the private worker remains the path that can honor catalog-level voice controls.

## Deployment Recommendation

Deploy the model and adapter as an isolated private service rather than inside the request-scoped web application. The adapter should load approved Kokoro voices, write generated WAV files to tenant-scoped object storage, and return a signed or private storage reference to the existing render worker. The private worker can then join voice, captions, licensed media, and scene timing into final MP4 output.

> The credential-free browser WebM workflow remains available immediately. It intentionally does not claim natural speech, cloned voices, photoreal footage, or hour-long production rendering.

## Required User-Controlled Input

No additional public endpoint URL is needed for the implemented Hugging Face speech path: it uses the official public router and the validated `HF_TOKEN`. A private worker remains optional. If it is later deployed, an administrator registers its internal endpoint and supplies `TTS_WORKER_TOKEN` only when authentication is enabled; users are not asked to provide private deployment URLs.

## References

[1]: https://github.com/hexgrad/kokoro "hexgrad/kokoro official repository"
[2]: https://huggingface.co/coqui/XTTS-v2 "Coqui XTTS-v2 model card"
[3]: https://github.com/SWivid/F5-TTS "F5-TTS official repository"
[4]: https://github.com/OHF-Voice/piper1-gpl "OHF Voice Piper1-GPL official repository"
[5]: https://huggingface.co/docs/huggingface.js/en/inference/README "Hugging Face JavaScript Inference documentation"
[6]: https://huggingface.co/hexgrad/Kokoro-82M "hexgrad/Kokoro-82M official model page"
