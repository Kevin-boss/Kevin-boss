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
- [ ] Complete the social-account manager with official OAuth connect, callback, disconnect, and account-selection actions. Calendar, review, and adaptation workspace foundations are complete.
- [x] Build the analytics, agency/client, approvals, and admin workspace foundations.
- [x] Add database migrations and apply the schema changes.
- [x] Add automated workflow coverage for authorization, AI task validation, structured scripts, job transitions, Copilot tools, and rights checks.
- [x] Add a dedicated rights-enforcement test beyond asset metadata normalization and map each workflow test category to its test module.
- [x] Verify API behavior, responsive UI, loading and error states, build quality, and core interaction flows.
- [x] Add state and interaction verification for Script Studio, Research, Assets, Editor, Voice, Jobs, and Copilot workflows.
- [x] Add an approved-voice synthesis control to the Voice & Captions workspace and cover selection, submission, pending, success, and failure states.
- [x] Add explicit loading, success, and error-state tests for creator workflow queries and mutations, plus a documented verification matrix.
- [x] Add explicit research citation records and source-grounded summaries to the research API and workspace.
- [ ] Activate the deployed private Kokoro worker for catalog-level synthesis after administrator deployment. The supported speed and delivery-direction controls, consent guard, provenance, and public-model-default boundary are implemented; gender, tone, accent, speed, and emotion remain catalog selection data until the private worker is configured.
- [x] Implement actual public-provider TTS generation with the validated Hugging Face InferenceClient path and documented public/private voice-control boundary.
- [x] Verify whether the validated public Hugging Face provider contract supports an authorized natural-voice TTS route before replacing or extending the private Kokoro path.
- [x] Add an official Hugging Face InferenceClient TTS adapter for approved public-provider voices while retaining consent and provenance checks.
- [ ] Complete official social-account connection and provider-execution adapters after credential activation. Verified provider contracts, approval gates, idempotent attempts, and durable callback scaffolding are complete.
- [x] Add plan, usage, notifications, and administrative health procedures and supporting UI.
- [x] Add scene editing, scene-level regeneration, research citations, and platform-copy panels to Script Studio.
- [x] Add folder/tag and licensing editing controls to the asset library.
- [x] Persist editable timeline tracks and scene properties instead of read-only timeline visualization.
- [x] Add caption-style controls and complete voice filter interaction in the Voice & Caption workspace.
- [x] Add API, integration, and UI flow tests for the implemented production workflows.
- [x] Document local configuration, implementation limitations, provider setup, and next steps for external credentials and production workers.
- [x] Continue credential-independent completion before requesting external keys.
- [ ] Request and validate the required official application credentials only when the user elects to publish to the corresponding platform, then store them server-side and activate that platform's OAuth/provider adapter.
- [x] Record credential setup status and provider validation results in project documentation.
- [x] Verify official API, OAuth, post-publication, webhook, and licensing requirements for the selected social platforms before integration.
- [x] Build the content calendar with calendar, agenda, status, approval, and project-linked publishing-plan views.
- [x] Surface platform-specific copy adaptation in the Publishing workspace using the existing governed generation procedure.
- [ ] Implement secure social-account OAuth start, callback, connection, disconnect, and account-selection procedures only for verified API contracts.
- [x] Add a dedicated failed-dispatch retry procedure with approval, account-readiness, unique-idempotency, audit, and integration-test coverage.
- [x] Add integration coverage for schedule, reschedule, and cancel transitions without provider execution; live platform activation remains separately credential- and adapter-dependent.
- [x] Add explicit integration coverage for the approved ready-plan queue transition without invoking an external provider.
- [ ] Activate the private-worker controls for deployed catalog-level voice parameters and final-render lifecycle without exposing worker URLs or credentials.
- [ ] Extend API, integration, and user-flow tests for OAuth connection management and the full scheduling/dispatch lifecycle alongside calendar, adaptation, and private-worker boundaries.
- [x] Consolidate all verified remaining external API-key requirements into one final collection request after implementation scaffolding is complete.

---

## Continuation slice

- [x] Add explicit research citation records, source-grounded summaries, and Research workspace display.
- [x] Add persistent editor track/property mutations and caption styling controls.
- [x] Add provider-backed TTS boundary and complete voice catalog filtering.
- [x] Add approval, notification, usage, and admin-health workflows.
- [x] Add editable persisted track operations in the Timeline Editor.
- [x] Implement a private render-worker endpoint boundary with tracked render jobs and safe unavailable states.
- [x] Add broad API and UI integration tests for completed production workflows.
- [x] Add a targeted UI integration test for publishing-plan creation and approval-required status without official social account credentials.
- [x] Assert the rendered publishing-plan list displays an awaiting-approval status after a scheduled plan is created without an official account.
- [x] Add a focused production-workflow integration test covering the public-provider adapter’s secure authorization boundary alongside existing creator workflow contracts.

## External integration sequence

- [x] Configure and validate the first required external provider key individually, then record its actual validation result.
- [ ] Configure and validate each selected social publishing platform only when the user asks to publish to it; store that platform's credentials server-side for future authorized publishing.
- [ ] Configure and validate worker/render credentials or private endpoints individually after worker deployment is selected.
- [x] Configure and validate TTS credentials individually after the approved TTS provider is selected.
- [x] Research and document a current self-hosted natural-voice TTS deployment path before requesting its private endpoint or credentials.
- [x] Add a Kokoro-compatible private TTS adapter contract with voice-consent and provider provenance safeguards, plus controlled integration coverage.
- [x] Persist explicit voice consent and approved-use scope, then reject synthesis unless the selected voice has verified commercial rights and consent.
- [x] Add an admin-supported voice-consent recording procedure and prove synthesis succeeds only after verified commercial consent is persisted through that flow.
- [x] Incorporate the official Kokoro inference tooling as a private worker package and document its model-weight deployment boundary.
- [x] Add direct procedure-level coverage for administrator-recorded consent and the required before/after synthesis safety boundary.
- [x] Add one end-to-end guarded flow test proving private TTS is blocked before consent is recorded and succeeds after `recordConsent` persists verified commercial consent.
- [x] Add a deployment-readiness checklist for the private Kokoro worker, including health, authentication, consent, storage, and rollback controls.
- [x] Complete all provider link and configuration scaffolding before requesting remaining credentials together in a single consolidated step.
- [x] Add server-side private worker configuration status checks and an administrator-facing readiness surface for TTS and final render workers.
- [x] Distinguish endpoint, token, and fully-ready worker states; render explicit administrator-restricted and health-error states with UI coverage.
- [ ] Align final-render configuration with a verified official public render contract, if one is selected. (Deferred: final MP4 composition currently requires an administrator-registered private worker URL.)
- [x] Align public TTS configuration with a verified official endpoint so the public provider requires only the validated server-side API token.
- [x] Explicitly distinguish public-token provider calls from the final MP4 render worker, which remains a private service URL requirement until a verified public render contract is implemented.

---

## History note

The remaining unchecked items are deliberately deferred social-publishing or optional private-worker work that require external credentials, platform approvals, or administrator-controlled infrastructure. They must not be reported as finished until activated and validated.

The user-directed delivery path remains **credential-free draft download**. Public Hugging Face TTS is validated; unchecked private-worker and social-publishing entries remain deferred integration work and do not block the Scene Editor's browser-local quick-draft WebM download.
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
- [x] Map each implemented workflow to its loading, empty, success, and error test coverage before closing broad verification.
- [x] Add explicit pending/loading interaction tests for Research, Media Library, Voice & Captions, and Copilot mutations.
- [x] Add explicit query-loading UI coverage for Research, Media Library, Voice & Captions, and Copilot data queries.
- [x] Add selectable resolution and quality profiles to the browser-local WebM quick-draft renderer.
- [x] Add an in-browser WebM quick-draft preview with an explicit download action after generation.
- [x] Add accessible draft-rendering progress feedback and cancellation-safe cleanup for browser-local export.
- [x] Add production quality-profile controls that clearly distinguish the local draft renderer from natural-voice, realistic long-form worker rendering.
- [x] Document the private-worker, licensed TTS, and GPU rendering requirements for realistic videos and natural voices approaching one hour.
- [x] Add abort support and unmount-safe cleanup for in-flight browser-local WebM rendering, with automated coverage.
- [ ] Diagnose and fix the reported failure to create and download a credential-free WebM draft video from the Scene Editor. Generated Script Studio scenes now remain available when the persisted editor document is empty, and the direct handoff selects the project in Scene Editor; a real browser preview/download exercise remains required.
- [ ] Exercise the real quick-draft creation and download path after the generated-project handoff. The type check, 131-test suite, and production build pass; a full browser-level preview/download confirmation remains required before closing the repair.
- [x] Prevent provider authorization redirects until the corresponding server-side token-exchange adapter is implemented and validated.
- [x] Add a sign-in-free guest quick-draft creator that generates, previews, and downloads a browser-local WebM without creating or persisting a project.
- [x] Add guest-flow tests proving anonymous video drafts remain local while saved projects, social publishing, provider-backed voice, and private production workers remain authentication-gated.
- [x] Directly exercise anonymous guest WebM preview and download in the browser and resolve any browser-specific failure found. A one-scene, three-second local WebM preview rendered without authentication and the browser confirmed download of `My-browser-local-draft-standard.webm`.
- [x] Add an integrated Scene Editor regression that uses the real QuickDraftExportButton after the generated-project handoff rather than mocking the preview component.
- [x] Audit and improve production-quality video controls, natural-voice selection, and provenance while preserving the credential-free browser-draft fallback. Production MP4 now carries an explicit standard or high-fidelity worker manifest; Voice & Captions labels public model-default fallback versus private neural quality and retains consent-controlled delivery controls.
- [x] Add regression coverage proving the quality tier, natural-voice boundary, and private-worker activation requirements are communicated and enforced correctly.
- [x] Push the latest validated AI Content OS project state to the connected GitHub repository.
- [x] Review each remaining deferred item autonomously, complete any credential-independent portion, and record exact user-authentication, credential, or administrator-deployment dependencies for the rest.
- [x] Code-split noncritical authenticated workspace routes while keeping the public guest quick-draft route immediately available.
- [x] Split stable third-party client dependencies into cacheable production chunks to reduce the initial entry bundle warning.
- [x] Add a role-gated social-account disconnection action that revokes the server-side credential reference and invalidates linked scheduled plans without calling an external provider.
- [x] Add an accessible Publishing workspace control for disconnecting a currently connected account and refreshing readiness state.
- [x] Preserve published and cancelled social plan history when disconnecting an account, while invalidating only dispatchable plans.
- [x] Add server-only validation and single-use consumption of social OAuth callback state without token exchange or browser exposure of the PKCE verifier.
- [x] Synchronize the subsequent validated autonomous hardening checkpoints to the connected GitHub repository.
- [x] Add a Publishing review-queue control that assigns only a matching connected official account to a plan and refreshes its readiness state.
- [x] Add a guarded cancellation action for unpublished social plans that removes an associated Heartbeat task by persisted task UID and preserves terminal history.
- [x] Add a confirmed Publishing review-queue cancellation control for eligible local plans and refresh plan state after cancellation.
- [x] Add a local rescheduling control for eligible publishing plans that preserves approval and uses the existing schedule lifecycle safely.
- [x] Add a guarded Publishing review-queue retry control for failed plans that refreshes state without representing external publication as complete.
