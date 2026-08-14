# Kokoro Private TTS Worker

This package incorporates the official [`kokoro`](https://github.com/hexgrad/kokoro) Python inference library through the declared dependency `kokoro>=0.9.4`. It is intentionally a **separate private worker**: model downloads, Python dependencies, and generated audio must not be embedded in the React/Express web deployment.

## Run the Worker

Create a private Python environment with the dependencies in `requirements.txt`, set a long random `TTS_WORKER_TOKEN`, and run:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Kokoro's official installation uses `pip install kokoro>=0.9.4` and requires `espeak-ng` for English fallback and some non-English languages.[1]

## AI Content OS Contract

The worker exposes `POST /v1/audio/speech` and accepts the private contract already enforced by AI Content OS:

```json
{
  "model": "Kokoro-82M",
  "voice": "af_heart",
  "input": "Approved narration text.",
  "language": "en",
  "speed": 1,
  "response_format": "wav"
}
```

It returns JSON with `audioBase64` and `mimeType: "audio/wav"`. Restrict network access to the application or render worker, set `TTS_WORKER_TOKEN` before exposing the endpoint, and only register voices whose verified commercial consent records are present in AI Content OS.

## Deployment Boundary

Use a dedicated private environment with sufficient memory for the model, its dependencies, and concurrent synthesis. The web application is intentionally limited to calling the private endpoint and storing the returned audio in tenant-scoped object storage. Do not commit cached model files, voice tensors, audio outputs, tokens, or worker environment files to this project.

## Reference

[1]: https://github.com/hexgrad/kokoro "Official Kokoro repository"
