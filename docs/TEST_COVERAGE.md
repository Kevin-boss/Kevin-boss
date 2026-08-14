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

The suite intentionally uses controlled test doubles for storage, provider endpoints, the database, and the language model. It validates the application's decisions and persistence contracts without making external network calls or requiring credentials.
