# Free-First Provider Research

## Recommended direction

The first TTS implementation should prefer a self-hosted, CPU-friendly engine rather than requesting a paid API key. Piper is positioned as a fast local neural text-to-speech system and has a public project repository [1]. Voice checkpoints still require individual license review; the software license and the voice/model license must not be treated as interchangeable.

Whisper is already available through the managed transcription helper in this project. For a fully self-hosted deployment, the project can later register a private ASR endpoint and preserve the same provider interface.

## Licensing cautions

Coqui XTTS-v2 should not be selected as the default commercial provider without a separate legal review. Its published model license states that it permits non-commercial use only [2]. Search results also identify other open TTS projects, but their model and voice licenses vary, so the registry must require an explicit commercial-use status before a model can be enabled.

The application uses the following free-first rule: register self-hosted endpoints as disabled until the model, voice, dataset, and output-use terms are recorded; allow commercial production only when the registry marks the capability as `allowed`; and retain a `review` or `restricted` state for uncertain models. The provider registry now stores cost tier and hosting mode, lists free and self-hosted entries first, exposes preferred enabled providers by capability, and blocks TTS selection of a paid or metered provider while an approved free TTS provider is available.

## References

[1]: https://github.com/rhasspy/piper "rhasspy/piper — Fast, local neural text to speech system"
[2]: https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt "XTTS-v2 model license"

## Runtime enforcement contract

Every registry-driven execution path must load enabled model-provider rows and call the shared `assertBuiltInOrFreeFirst(providers, capability)` gate before creating a job or invoking a provider. When no eligible registry row exists, the current managed built-in service is permitted as a fallback. When eligible rows exist, the preferred free or self-hosted commercially allowed provider is selected; a paid-only configuration is rejected rather than silently used. New adapters must use this gate and add a capability-specific procedure test before being enabled.

## Future adapter contract

New capability adapters must be created through `createProviderExecutor`. The factory accepts a capability name, a registry executor, and a built-in fallback, then performs provider-row normalization and `selectPreferredProvider` before either branch executes. This prevents a new modality from accidentally bypassing free-first policy. The contract is covered by `server/providerAdapter.test.ts`.
