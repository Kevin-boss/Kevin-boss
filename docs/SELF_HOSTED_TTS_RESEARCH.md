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

## Deployment Recommendation

Deploy the model and adapter as an isolated private service rather than inside the request-scoped web application. The adapter should load approved Kokoro voices, write generated WAV files to tenant-scoped object storage, and return a signed or private storage reference to the existing render worker. The private worker can then join voice, captions, licensed media, and scene timing into final MP4 output.

> The credential-free browser WebM workflow remains available immediately. It intentionally does not claim natural speech, cloned voices, photoreal footage, or hour-long production rendering.

## Required User-Controlled Input

To validate this integration, the next required item is the base URL of the deployed private adapter. If the adapter requires a token, request it separately only after the URL is reachable. A public model repository or hosted demonstration is not a substitute for a tenant-controlled production endpoint.

## References

[1]: https://github.com/hexgrad/kokoro "hexgrad/kokoro official repository"
[2]: https://huggingface.co/coqui/XTTS-v2 "Coqui XTTS-v2 model card"
[3]: https://github.com/SWivid/F5-TTS "F5-TTS official repository"
[4]: https://github.com/OHF-Voice/piper1-gpl "OHF Voice Piper1-GPL official repository"
