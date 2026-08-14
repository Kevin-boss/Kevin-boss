# Completion Architecture

## Decision Summary

AI Content OS will use one **approval-first, provider-adapter publishing lifecycle** for every social platform. A creator can prepare platform-specific variants and choose a calendar slot without publishing immediately. A reviewer approves the selected variant. A durable, platform-managed schedule then dispatches only an approved plan whose account is connected and whose final video asset has passed all preflight checks. Direct network calls are isolated in provider adapters and remain unavailable until the corresponding official OAuth application credentials have been collected and validated.

| Area | Chosen approach | Safety and operational boundary |
|---|---|---|
| Content calendar | Extend project-linked `scheduledPosts` with agenda, calendar, account, approval, and delivery state. Keep timestamps in UTC and render in the creator's local time. | A planned date is not publication authority. It remains an `awaiting_approval` plan until reviewed and connection-ready. |
| Platform adaptation | Store one editable, provenance-labelled variant per planned platform post. Reuse the existing governed `script.generatePlatformCopy` procedure to generate a draft variant. | Generated text is clearly marked as AI-generated and must be reviewed before dispatch. |
| Social accounts | Store public provider/account metadata and an encrypted secret reference only. OAuth callback code performs no post action. | Tokens, refresh tokens, and app credentials remain server-only and are never rendered in the browser or stored in plain database fields. |
| Publishing lifecycle | Persist dispatch attempts separately from the logical post plan. Each attempt has an idempotency key, provider request ID, status, timestamp, and sanitized error state. | Re-dispatch is guarded by the plan status and provider-result identity; a retry cannot silently create duplicate posts. |
| Scheduled dispatch | Use the platform-managed HTTP schedule callback for end-user scheduling, with an idempotent handler keyed by the durable schedule task ID. | No in-process timers or polling loops. A live schedule cannot be created until a checkpoint is published and the callback endpoint is deployed.[1] |
| Provider synchronization | Prefer verified webhooks for YouTube, TikTok, Meta, and X; expose a bounded manual refresh fallback for LinkedIn because ordinary post-publishing webhook access is not established by its developer docs. | All incoming events require provider verification, signature or challenge handling where documented, and idempotent event persistence. |
| Private realistic output | Preserve the public TTS/browser draft boundary while extending private-worker request metadata for voice controls and final render jobs. | The web app does not host model weights or expose worker endpoints. Actual GPU rendering remains a separately deployed authenticated worker. |

## Integration Route Comparison

| Approach | Trade-offs | Cost | Setup complexity |
|---|---|---:|---|
| **Manual publish after approval** | Works immediately with no external credentials, but the creator completes each final platform action outside AI Content OS. | No incremental API cost. | Low. |
| **Official OAuth adapters with durable scheduled dispatch** | Delivers in-product account connection, approved scheduling, auditability, status tracking, and verified webhook synchronization. Requires platform application review and provider credentials. | Depends on the social platforms; application hosting remains in the existing product. | Moderate. |
| **Private end-to-end rendering plus social publishing** | Adds realistic long-form output and direct distribution, but needs separately operated, authenticated GPU/FFmpeg worker infrastructure in addition to official social credentials. | Depends on selected private infrastructure. | High. |

The product will implement the **official OAuth adapter and durable scheduling foundation** now because it provides the necessary data, review, audit, and activation structure. It will defer live provider actions until a single consolidated credential collection provides verified application credentials. It will retain manual approval/download as a usable lightweight path throughout.

## Verified Provider Capability Matrix

| Provider | Official outbound capability | Event path | Integration status |
|---|---|---|---|
| YouTube | `Videos.insert` media upload and metadata updates | PubSubHubbub HTTP callbacks for channel video changes | Adapter-eligible. |
| TikTok | Content Posting API direct post and upload workflows | HTTPS JSON webhooks with at-least-once delivery | Adapter-eligible. |
| Instagram | Professional-account media-container and publish flow | Meta Graph API webhooks | Adapter-eligible. |
| Facebook Pages | Resumable video upload followed by Page publication | Meta Graph API webhooks | Adapter-eligible. |
| LinkedIn | Initialize, upload, and finalize video for post use | Manual refresh fallback; generic post-status webhook is not established for ordinary apps | Adapter-eligible with polling-free manual refresh. |
| X | OAuth user-context `POST /2/tweets` | X v2 signed webhooks with challenge-response checks | Adapter-eligible. |

## Data Model Vocabulary

| Entity | Responsibility |
|---|---|
| `scheduledPosts` | Logical platform plan: project, platform, final delivery asset, selected account, schedule time, review and dispatch state, durable schedule task ID. |
| `socialPostVariants` | One editable AI-generated or user-edited title/copy/hashtags payload per platform plan, with provenance and selected state. |
| `socialPublishAttempts` | Immutable execution trail: idempotency key, provider request and post IDs, attempt state, dispatched/completed timestamps, and sanitized error code. |
| `socialAccounts` | Public account identity, provider status, selected capabilities, and server-only credential reference; no raw token material. |
| `socialWebhookEvents` | Idempotently recorded verified inbound event envelope and provider event identity, decoupled from provider-specific processing. |

## Activation Prerequisites

The user will be asked for all required provider application credentials **once**, after the OAuth and provider-scaffolding code is complete. The only required inputs will be verified API client keys, client secrets, and webhook signing secrets; private deployment URLs will not be requested. Before any end-user schedule is activated, the saved checkpoint must be published so the protected callback is reachable.[1]

## References

[1]: https://developers.manus.im/ "Platform-managed scheduled callback deployment requirement; implementation follows the project Heartbeat contract."
