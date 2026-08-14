# Project TODO

- [x] Establish multi-tenant domain model for organizations, workspaces, clients, memberships, and scoped roles.
- [x] Add tenant-aware authorization helpers that enforce owner, admin, editor, reviewer, viewer, and client permissions.
- [x] Implement project, video, version, scene, track, and structured-script persistence with tenant boundaries.
- [x] Implement the asset library data model with folders, tags, search metadata, derivatives, licensing, attribution, and rights status.
- [x] Implement provider registry and AI task contracts for LLM, TTS, transcription, image generation, and media generation fallbacks.
- [x] Implement the AI Script Studio API with structured scene JSON, hook, visual prompt, B-roll, transition, SFX, and CTA output.
- [x] Implement the research workspace API with source records, claim classification, citations, and verified-versus-AI-generated visual status.
- [x] Implement TTS voice-catalog filters, transcription records, word-level timing, and SRT/VTT caption artifacts.
- [x] Implement durable asynchronous job records with progress, retries, cancellation, errors, and job-event activity history.
- [x] Implement the video render manifest, export presets, render quality checks, and output-download metadata.
- [x] Implement social account, post, schedule, and integration-status models using official API adapter boundaries.
- [x] Implement AI Copilot command parsing into auditable executable tool actions with approval-aware state changes.
- [x] Implement usage, plan, notification, audit-log, and admin-system-health foundations.
- [x] Create a premium, responsive application shell with workspace switcher, command launcher, theme support, and accessible navigation.
- [x] Build the dashboard and project workspace with live job status, content pipeline stages, creation entry points, and progress states.
- [x] Build the Script Studio with structured scene editing, research citations, regeneration controls, and platform-copy panels.
- [x] Build the research workspace with clear verified, user-provided, and AI-generated information distinctions.
- [x] Build the media asset library with search, filter, licensing, rights, and upload-ready empty states.
- [x] Build the timeline editor foundation with video, audio, caption, overlay, and scene tracks plus property editing.
- [x] Build the Voice and Caption workspace with voice filtering, transcript review, caption styling, and subtitle export controls.
- [ ] Build the content calendar, social account manager, publishing review, and platform-specific adaptation workspace.
- [x] Build the analytics, agency/client, approvals, and admin workspace foundations.
- [x] Add database migrations and apply the schema changes.
- [x] Add automated workflow coverage for authorization, AI task validation, structured scripts, job transitions, Copilot tools, and rights checks.
- [x] Add a dedicated rights-enforcement test beyond asset metadata normalization and map each workflow test category to its test module.
- [ ] Verify API behavior, responsive UI, loading and error states, build quality, and core interaction flows.
- [ ] Add state and interaction verification for Script Studio, Research, Assets, Editor, Voice, Jobs, and Copilot workflows.
- [ ] Add explicit loading, success, and error-state tests for creator workflow queries and mutations, plus a documented verification matrix.
- [x] Add explicit research citation records and source-grounded summaries to the research API and workspace.
- [ ] Implement actual TTS generation and apply all catalog filters for gender, tone, accent, speed, and emotion.
- [ ] Build official social-account, post, and scheduled-publishing procedures with provider adapters and approval gates. (Deferred by user; not part of current delivery scope.)
- [x] Add plan, usage, notifications, and administrative health procedures and supporting UI.
- [x] Add scene editing, scene-level regeneration, research citations, and platform-copy panels to Script Studio.
- [x] Add folder/tag and licensing editing controls to the asset library.
- [x] Persist editable timeline tracks and scene properties instead of read-only timeline visualization.
- [x] Add caption-style controls and complete voice filter interaction in the Voice & Caption workspace.
- [ ] Add API, integration, and UI flow tests for the implemented production workflows.
- [x] Document local configuration, implementation limitations, provider setup, and next steps for external credentials and production workers.
- [x] Continue credential-independent completion before requesting external keys.
- [ ] Request and validate required external API credentials one at a time, in integration dependency order.
- [ ] Record credential setup status and provider validation results in project documentation.

---

## Continuation slice

- [x] Add explicit research citation records, source-grounded summaries, and Research workspace display.
- [x] Add persistent editor track/property mutations and caption styling controls.
- [x] Add provider-backed TTS boundary and complete voice catalog filtering.
- [x] Add approval, notification, usage, and admin-health workflows.
- [x] Add editable persisted track operations in the Timeline Editor.
- [x] Implement a private render-worker endpoint boundary with tracked render jobs and safe unavailable states.
- [ ] Add broad API and UI integration tests for completed production workflows.

## External integration sequence

- [ ] Configure and validate the first required external provider key individually, then record its actual validation result.
- [ ] Configure and validate social publishing credentials individually after the provider boundary is implemented.
- [ ] Configure and validate worker/render credentials or private endpoints individually after worker deployment is selected.
- [ ] Configure and validate TTS credentials individually after the approved TTS provider is selected.

---

## History note

The remaining unchecked items represent work that is not yet complete or requires external credentials, workers, platform approvals, or provider-specific implementation. They must not be reported as finished until validated.
- [x] Prioritize free-tier, open-source, and self-hostable providers before paid APIs.
- [x] Prefer local or private-endpoint TTS and rendering boundaries where practical.
- [x] Do not request an external API key when a validated free or self-hosted alternative exists.
- [x] Document the selected free-first provider path and any unavoidable credential requirements.
- [x] Enforce free/self-hosted provider preference across current registry-driven capability flows: LLM, image, ASR, TTS, and video/render.
- [x] Add capability-specific provider selection and execution for current text, image, ASR, TTS, and render adapters, blocking paid-only registry configurations.
- [x] Add automated tests for free-first ordering and paid-provider blocking across current supported capabilities.
- [x] Defer cross-platform publishing, social OAuth, and platform analytics integrations until a later phase.
- [x] Prioritize downloadable video exports with explicit render completion, signed downloads, and export presets.
- [x] Add completed-export records and download access to the Jobs and Editor workspaces.
- [x] Add render-worker callback or completion handling for produced video files.
- [x] Test export submission, unavailable-worker states, and signed download access.
- [x] Add completed-export download cards or links to the Jobs workspace.
- [x] Add verification coverage for export submission, worker-unavailable state, and signed-download access from Editor and Jobs.
- [x] Add research citation context to Script Studio scenes and expose source provenance alongside script claims.
- [x] Add scene-level regeneration controls with auditable jobs and approval-aware replacement behavior.
- [x] Attach citation IDs or provenance records to specific script scenes or claims.
- [x] Stage regenerated scene variants for approval before replacing the active scene.
- [x] Add targeted Script Studio tests for scene editing, citation mapping, and regeneration approval.
- [x] Add procedure-level tests for provider selection and free-first blocking in text, image, ASR, TTS, and render paths.
- [x] Add a branded shared adapter factory and registration boundary that makes free-first enforcement mandatory for future capability adapters.
- [x] Add a browser-based downloadable draft-video fallback that works without render-worker credentials or external provider setup.
- [x] Add fallback-export tests and UI verification for no-configuration downloads.
- [x] Exercise the browser recording and anchor-download path for the quick-draft export with controlled test doubles.
- [x] Fix the Media Library mobile layout overflow observed during responsive verification.
- [x] Add the missing React key to rendered Jobs workspace rows identified during interaction testing.
- [x] Add Timeline Editor property-mutation and final-export interaction coverage beyond the quick-draft fallback.
- [ ] Map each implemented workflow to its loading, empty, success, and error test coverage before closing broad verification.
