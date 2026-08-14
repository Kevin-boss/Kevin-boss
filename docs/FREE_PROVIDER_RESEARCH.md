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
