# Implementation Status

## What Is Implemented

The application has a functional multi-tenant production workspace foundation. It provisions a private organization and workspace when a signed-in user opens the application, scopes projects, assets, jobs, Copilot actions, research records, transcripts, and other domain objects to that workspace, and applies owner, admin, editor, reviewer, viewer, and client roles through tenant-aware server checks.

The creator workflow supports project creation, structured AI script generation, source-recorded research, provenance-labelled claim extraction, AI image generation, S3-backed asset upload, asset-rights status, Whisper-based transcription, SRT/VTT export, asynchronous job records, cancellation and retry controls, and an action-only Copilot. The Copilot uses a constrained tool schema and persists the selected tool, JSON parameters, approval state, job reference, and audit event rather than emitting an unstructured conversational answer.

The user interface includes a responsive dark/light production shell, workspace switching, dashboard, Script Studio, Research workspace, Media Library, Scene Editor foundation, Voice & Captions, job operations, agency/client workspace controls, and the action log for executable Copilot commands. Voice & Captions now lets a creator select an approved workspace voice, see whether it has a ready allowed provider, submit narration text, and preview the persisted audio asset after synthesis; the server remains responsible for provider mapping and verified commercial-consent enforcement.

## Deliberate Integration Boundaries

The application does **not** fabricate social connections, publishing success, analytics, render output, commercial model rights, or provider availability. The Publishing workspace now provides a project-linked calendar and agenda, governed platform-copy adaptation, account readiness, review-state visibility, persisted editable variants, approval records, account assignment, idempotent dispatch attempts, and a protected scheduled-dispatch callback. Direct production actions still require the corresponding official APIs, secure OAuth credentials, platform approvals, a published callback deployment, and worker deployment.

Production FFmpeg rendering, open-source TTS deployment, local-model inference, GPU video generation, scheduled publication, and social analytics synchronization must run in separate worker infrastructure. They cannot be safely performed as long-running work inside a request-scoped web process. Their interfaces, job types, data model, and user-visible status states are already represented in the product foundation.

## Provider and Credential Requirements

| Capability | Required configuration before use |
|---|---|
| Script generation, research synthesis, Copilot | Built-in server-side LLM access is already configured; consumption is tracked by the hosting platform. |
| Image generation | Built-in server-side image access is already configured; generated images are stored through the platform storage service. |
| Audio transcription | Built-in Whisper access is already configured. Audio must be reachable by URL and meet service limits. |
| Public model inference | The official Hugging Face Inference Providers router is configured with a validated server-side `HF_TOKEN`. Registry adapters attach the token only to `https://router.huggingface.co/` requests; see `docs/CREDENTIAL_REQUIREMENTS.md`. |
| Public TTS and open-weight models | The official Hugging Face InferenceClient path is implemented for approved public-provider voices using the validated server-side `HF_TOKEN`. It normalizes audio, persists a tenant-scoped asset, and retains free-first and verified-consent checks. Public output is treated as the model default and does not expose private voice controls. See `docs/CREDENTIAL_REQUIREMENTS.md`. |
| Private Kokoro TTS | The researched free-first production baseline is a private adapter around Apache-licensed Kokoro-82M. Deploy it in a user-controlled environment, record model and voice licensing, then register approved capabilities and optional authentication. The private worker is the path for catalog-level gender, tone, accent, speed, and emotion controls. XTTS-v2, F5-TTS, and GPL Piper variants require separate licence review before use. See `docs/SELF_HOSTED_TTS_RESEARCH.md`. |
| FFmpeg rendering and GPU jobs | Deploy a dedicated CPU/GPU worker environment with private object-storage access and a queue consumer. |
| YouTube, TikTok, Facebook Pages, Instagram, LinkedIn, and X publishing | Official API, OAuth, media-upload, and webhook capabilities have been researched and captured in `docs/INTEGRATION_API_RESEARCH.md`. The product now contains connection readiness, provider-contract, publishing-plan, approval, scheduling, callback, idempotency, and audit scaffolding. Consolidated application credentials, configured redirect URLs, required platform review, and final provider-execution adapters remain the activation requirement. |
| Payment processing | Select and configure a payment provider through the provider boundary; do not put payment logic in the production core. |

## Download-first export scope

Cross-platform publishing now has a safe workflow foundation but is not activated until official application credentials are provided. The current product exposes export presets for landscape, vertical, and square output; submits versioned video documents to a private render-worker boundary; records completed worker-returned video files as tenant-scoped video assets; and generates signed download URLs only after access checks. A render worker must return a `storageKey` in its JSON response for an export to become downloadable.

For immediate use without credentials or a worker, the Scene Editor provides a **quick-draft WebM workflow**. Users choose Preview, Standard, or High quality, create the browser-local WebM, monitor visible rendering progress, inspect it directly in an in-browser video player, then explicitly download it. The active render can be cancelled; cancellation stops the recorder and canvas-media tracks, and unmount cleanup aborts an in-flight preview to prevent stale UI updates. The fallback is intentionally labelled as a draft: it renders scene cards and text, is capped at 24 seconds, does not synthesize a natural voice or photoreal footage, and never uploads video to the server. The worker path remains the production route for final MP4 assets.

## Realistic and long-form production boundary

The local browser renderer is deliberately not presented as a model-tuned, hyper-realistic video system. Natural speech, photoreal generated footage, lip synchronization, music mixing, and exports approaching one hour require a private, asynchronous production worker. That worker must combine approved image/video generation models, a licensed neural TTS provider or self-hosted speech model, FFmpeg-based composition, object storage, resumable job orchestration, and tenant-scoped render callbacks.

For responsible operation, the production worker must retain model identifiers, voice and asset licences, prompt and source provenance, quality settings, job timing, and the output checksum. The application already provides the provider registry, free-first policy gate, render job boundary, approval states, and signed-download records required to attach that worker later. Model fine-tuning or voice cloning must remain opt-in, rights-checked, and implemented only after the chosen provider and deployment environment are configured.

## Next Engineering Steps

The complete implementation backlog is maintained in `todo.md`. The highest-priority activation work is supplying the consolidated official social credentials, completing each provider OAuth adapter against its configured application, and deploying the optional private render and natural-voice workers. Public TTS integration and focused production coverage are complete; private realistic long-form voice and video remain worker-delivery work.
