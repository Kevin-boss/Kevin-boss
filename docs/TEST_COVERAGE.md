# Workflow Test Coverage Map

The production test suite separates policy assertions from procedure-level contracts so that the system checks both pure decision logic and the boundaries where data is persisted or external work is requested.

| Coverage category | Primary test module | What is asserted |
|---|---|---|
| Authorization | `server/platform.integration.test.ts` | Active membership is required; editors can edit; clients can review but cannot edit. |
| AI task validation | `server/taskPolicy.test.ts` | Capability contracts, fallbacks, enabled-state, commercial-use, and capability matching rules. |
| Structured scripts | `server/scriptPolicy.test.ts` | Scene structure and approval-aware regeneration rules. |
| Job transitions | `server/platform.integration.test.ts` | Job updates persist and emit a matching job-event record. |
| Copilot tools | `server/copilot.integration.test.ts` | Only executable whitelisted tools are accepted; malformed outputs are rejected; publication plans require approval. |
| Asset rights | `server/assetRights.integration.test.ts` | Licensed assets are routed to manual review and unlicensed assets remain `unknown`; neither is silently marked verified. |
| Export worker safety | `server/exportPolicy.test.ts` | Missing workers are explicit and malformed worker responses are normalized safely. |
| Provider governance | `server/provider.integration.test.ts`, `server/providerPolicy.test.ts` | Free/self-hosted selection and paid-only rejection for all current modalities. |
| Public provider authorization | `server/provider.integration.test.ts`, `server/huggingFaceCredential.test.ts` | A production Script Studio workflow verifies server-only authorization on the official Hugging Face router, while the configured token is separately validated against Hugging Face's official account endpoint. |
| Creator empty and guard states | `client/src/pages/creatorEmptyStates.test.tsx` | Script Studio, Research, Assets, Editor, Voice, Jobs, and Copilot render safe empty states; project-dependent creation controls remain disabled before project selection. |
| Creator mutation and query feedback | `client/src/pages/ScriptStudio.interaction.test.tsx`, `client/src/pages/Research.interaction.test.tsx`, `client/src/pages/AssetLibrary.interaction.test.tsx`, `client/src/pages/VoiceCaptions.interaction.test.tsx`, `client/src/pages/Copilot.interaction.test.tsx`, `client/src/pages/Jobs.interaction.test.tsx` | Project selection enables the action; successful mutations refresh or update review state and notify; rejected mutations preserve context and surface an actionable error. Every covered creator mutation disables repeat submission while pending. Query-loading states are explicitly rendered and tested for Research sources, Media Library assets, Voice catalog, Copilot action log, and Jobs refresh. |
| Timeline editing and export | `client/src/pages/TimelineEditor.interaction.test.tsx`, `client/src/components/QuickDraftExportButton.test.tsx`, `client/src/lib/draftVideoExport.test.ts` | Scene-property edits become dirty and persist through the editor procedure; save failures retain the draft; final MP4 submissions refresh export records and disable repeat submission while pending; the credential-free quick-draft path covers browser recording and download-anchor behavior. |

The suite intentionally uses controlled test doubles for storage, provider endpoints, the database, and the language model. It validates the application's decisions and persistence contracts without making external network calls or requiring credentials.

## Route State Matrix

| Route / workspace | Empty or initial state | Pending or loading state | Success state | Error state | Boundary note |
|---|---|---|---|---|---|
| Dashboard / projects | Responsive visual smoke coverage | Dashboard live-job refresh is covered by server contracts | Project and job procedures are contract-tested | Authorization and request failures are covered by platform procedures | Presentation-level dashboard controls are not duplicated as DOM tests. |
| Script Studio | `creatorEmptyStates.test.tsx` | `ScriptStudio.interaction.test.tsx` | `ScriptStudio.interaction.test.tsx` | `ScriptStudio.interaction.test.tsx` | Structured scene-policy contracts are server-tested. |
| Research | `creatorEmptyStates.test.tsx` | `Research.interaction.test.tsx` | `Research.interaction.test.tsx` | `Research.interaction.test.tsx` | Citation and provenance behavior is covered by script and research contracts. |
| Media Library | `creatorEmptyStates.test.tsx` | `AssetLibrary.interaction.test.tsx` asserts the workspace-assets loading status | `AssetLibrary.interaction.test.tsx` | `AssetLibrary.interaction.test.tsx` | Rights classification is covered by `assetRights.integration.test.ts`. |
| Timeline Editor | `creatorEmptyStates.test.tsx` | `TimelineEditor.interaction.test.tsx` | `TimelineEditor.interaction.test.tsx` | `TimelineEditor.interaction.test.tsx` | Quick-draft browser export and worker-bound final export are separately covered. |
| Voice & Captions | `creatorEmptyStates.test.tsx` | `VoiceCaptions.interaction.test.tsx` asserts the approved-voice catalog loading status | `VoiceCaptions.interaction.test.tsx` | `VoiceCaptions.interaction.test.tsx` | Provider and ASR governance are covered at the server boundary. |
| Jobs | `creatorEmptyStates.test.tsx` | `Jobs.interaction.test.tsx` | `Jobs.interaction.test.tsx` | `Jobs.interaction.test.tsx` | Retry and cancellation permissions remain procedure-gated. |
| AI Copilot | `creatorEmptyStates.test.tsx` | `Copilot.interaction.test.tsx` asserts the selected-project action-log loading status | `Copilot.interaction.test.tsx` | `Copilot.interaction.test.tsx` | Whitelisted executable tools and approval rules are integration-tested. |
| Workspace / operations | Responsive visual smoke coverage | N/A for current read-only summary states | `platform.integration.test.ts`, `operations.contract.test.ts` | Role and contract rejection paths are covered server-side | These are management foundations rather than a credential-free creation flow. |
| Publishing / analytics / provider settings | Deferred or boundary-state presentation | N/A until official connections are configured | Provider policy and registry contracts are covered | Missing-provider and paid-only rejections are covered | Official social action flows remain deliberately deferred. |
