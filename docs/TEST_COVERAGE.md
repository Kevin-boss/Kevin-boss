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
| Creator empty and guard states | `client/src/pages/creatorEmptyStates.test.tsx` | Script Studio, Research, Assets, Editor, Voice, Jobs, and Copilot render safe empty states; project-dependent creation controls remain disabled before project selection. |
| Creator mutation feedback | `client/src/pages/ScriptStudio.interaction.test.tsx`, `client/src/pages/Research.interaction.test.tsx`, `client/src/pages/AssetLibrary.interaction.test.tsx`, `client/src/pages/VoiceCaptions.interaction.test.tsx`, `client/src/pages/Copilot.interaction.test.tsx`, `client/src/pages/Jobs.interaction.test.tsx` | Project selection enables the action; successful mutations refresh or update review state and notify; rejected mutations preserve context and surface an actionable error. Script Studio disables repeat generation with an explicit pending label; Jobs retry verifies tenant-scoped query invalidation after successful requeue, and its refresh indicator is rendered while the query is fetching. |
| Timeline editing and export | `client/src/pages/TimelineEditor.interaction.test.tsx`, `client/src/components/QuickDraftExportButton.test.tsx`, `client/src/lib/draftVideoExport.test.ts` | Scene-property edits become dirty and persist through the editor procedure; save failures retain the draft; final MP4 submissions refresh export records; the credential-free quick-draft path covers browser recording and download-anchor behavior. |

The suite intentionally uses controlled test doubles for storage, provider endpoints, the database, and the language model. It validates the application's decisions and persistence contracts without making external network calls or requiring credentials.
