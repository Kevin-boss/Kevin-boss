"""Private Kokoro adapter for AI Content OS.

Run outside the web deployment, for example:
  uvicorn app:app --host 0.0.0.0 --port 8000

The first synthesis can download/cache model assets in the worker environment.
Do not place model weights or generated tenant audio in the web project.
"""

import base64
import io
import os
from functools import lru_cache

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Header, HTTPException
from kokoro import KPipeline
from pydantic import BaseModel, Field

app = FastAPI(title="AI Content OS Kokoro Worker")
TOKEN = os.environ.get("TTS_WORKER_TOKEN")
LANGUAGE_CODES = {"en": "a", "fr": "f"}


class SpeechRequest(BaseModel):
    model: str = Field(min_length=1, max_length=191)
    voice: str = Field(min_length=1, max_length=191)
    input: str = Field(min_length=1, max_length=12_000)
    language: str = Field(pattern="^(en|fr)$")
    speed: float = Field(default=1, ge=0.5, le=2)
    response_format: str = "wav"
    emotion: str | None = Field(default=None, max_length=80)


def require_bearer(authorization: str | None) -> None:
    if not TOKEN:
        return
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@lru_cache(maxsize=2)
def pipeline(language: str) -> KPipeline:
    return KPipeline(lang_code=LANGUAGE_CODES[language])


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "kokoro", "model": "Kokoro-82M"}


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest, authorization: str | None = Header(default=None)) -> dict[str, str]:
    require_bearer(authorization)
    if request.response_format != "wav":
        raise HTTPException(status_code=400, detail="Only wav output is supported by this private adapter.")
    segments = [audio for _, _, audio in pipeline(request.language)(request.input, voice=request.voice, speed=request.speed, split_pattern=r"\n+")]
    if not segments:
        raise HTTPException(status_code=422, detail="Kokoro returned no audio segments.")
    audio = np.concatenate(segments)
    buffer = io.BytesIO()
    sf.write(buffer, audio, 24_000, format="WAV")
    return {"audioBase64": base64.b64encode(buffer.getvalue()).decode("ascii"), "mimeType": "audio/wav"}
