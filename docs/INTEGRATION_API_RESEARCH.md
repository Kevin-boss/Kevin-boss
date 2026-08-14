# Official Integration API Research

This working record distinguishes verified official capabilities from product assumptions. An adapter is not enabled until its applicable official contract, authorization requirement, and operational boundary are documented here.

## YouTube

| Capability | Verified official contract | Product decision |
|---|---|---|
| Upload and publication | The YouTube Data API `Videos.insert` operation accepts media upload and video metadata. The documented endpoint is `POST https://www.googleapis.com/upload/youtube/v3/videos`; its published limits include `video/*` or `application/octet-stream` media and a maximum 256 GB file size.[1] | **Eligible for an official adapter.** Use only after a connected account completes the required Google OAuth flow and a final video asset is available in storage. |
| Post updates | The same video resource API supports metadata updates after upload.[1] | Model the outbound post as a durable record with an external video ID and a retryable status lifecycle. |
| Webhooks | YouTube Data API supports PubSubHubbub HTTP push notifications for a channel's uploads and video title/description updates.[2] | **Webhook-capable.** A future subscriber must expose an authenticated callback endpoint and retain subscription state. This is not a substitute for reliable scheduled publication execution. |

## Sources

[1]: https://developers.google.com/youtube/v3/docs/videos/insert "YouTube Data API: Videos.insert"
[2]: https://developers.google.com/youtube/v3/guides/push_notifications "YouTube Data API: Subscribe to Push Notifications"

## TikTok

| Capability | Verified official contract | Product decision |
|---|---|---|
| Direct publishing | TikTok's Content Posting API is documented to post videos and photos to a creator account. The official guidance distinguishes direct posting from upload flows and requires a registered developer application and the applicable user authorization scopes.[3] | **Eligible for an official adapter.** The product must persist a provider upload state and avoid claiming a post is published until the official status response confirms it. |
| Media source | The official guide requires supported media and, for URL-based media, a verified domain or URL prefix.[3] | Final exported assets must be served through an administrator-verified media origin before a TikTok direct-post adapter can be activated. |
| Webhooks | TikTok documents HTTPS JSON webhooks configured in the Developer Portal. Delivery is at least once, needs an immediate 200 response, and may be retried for up to 72 hours.[4] | **Webhook-capable.** Use idempotent event processing and verify signatures according to the selected event documentation before enabling inbound synchronization. |

## Sources

[3]: https://developers.tiktok.com/doc/content-posting-api-get-started "TikTok Content Posting API: Get Started"
[4]: https://developers.tiktok.com/doc/webhooks-overview/ "TikTok Webhooks Overview"

## Meta: Instagram and Facebook Pages

| Capability | Verified official contract | Product decision |
|---|---|---|
| Instagram professional publishing | The official Instagram Content Publishing API supports images, videos, reels, stories, and carousels for eligible professional accounts connected to a Page with Page Publishing Authorization. It uses a create-container then publish-container model and requires media to be publicly accessible.[5] | **Eligible for an official adapter.** Require explicit professional-account eligibility and completed Page Publishing Authorization before any post can move beyond approval. |
| Instagram AI provenance | Meta documents an `is_ai_generated=true` publication parameter.[5] | Pass the application's AI-generated provenance to the official platform field when an eligible post contains generated material and the platform capability is enabled. |
| Instagram limits | The official documentation states a 100 API-published-post limit per account over 24 hours and exposes a publishing-limit query endpoint.[5] | Check the available quota before dispatch and show a deterministic held status rather than retrying blindly. |
| Facebook Page video publishing | Meta's Video API allows publishing existing videos to Pages administered by the app user. The documented flow is access token and permissions, eligible Page selection, resumable upload, then publication using the Video ID.[6] | **Eligible for an official adapter.** Require a final stored video and an account with the required Page task or administrator role before dispatch. |

## Sources

[5]: https://developers.facebook.com/documentation/instagram-platform/content-publishing "Meta Instagram Content Publishing API"
[6]: https://developers.facebook.com/documentation/video-api/overview "Meta Video API Overview"

## LinkedIn

| Capability | Verified official contract | Product decision |
|---|---|---|
| Video upload and post media | LinkedIn's official Videos API documents initialize, upload, and finalize steps. The finalized video can be referenced by a post; organization uploads require appropriate access such as `w_organization_social` and relevant organization rights.[7] | **Eligible for an official adapter.** Treat upload as a resumable multi-step provider workflow and publish only after finalization succeeds. |
| Webhooks | LinkedIn's Developer Webhooks documentation describes provisioning and webhook-status management for specific partner integrations, including Apply Connect and Job Posting. It does not establish a generally available post-status callback contract for ordinary social publishing apps.[8] | **Do not enable a generic LinkedIn post webhook.** Synchronize post state using a bounded, user-initiated refresh and supported API status queries until an applicable approved event contract is verified. |

## Sources

[7]: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-07 "LinkedIn Videos API"
[8]: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/developer-webhooks "LinkedIn Developer Webhooks Overview"

## X

| Capability | Verified official contract | Product decision |
|---|---|---|
| Post creation | X documents `POST /2/tweets` for creating posts, with media attachment references in the request body. It requires user-context OAuth authorization using the access token received through the OAuth 2.0 flow.[9] | **Eligible for an official adapter.** Publish only with a connected user account and treat media attachment upload as a separate verified provider step. |
| Webhooks | X documents a v2 Webhooks API for real-time account activity, with HTTPS delivery, challenge-response validation, signature verification, and replay support. Registration endpoints require OAuth 2 app-only bearer authorization.[10] | **Webhook-capable.** Implement challenge response and signature verification before enabling an account activity subscription; process events idempotently. |

## Sources

[9]: https://docs.x.com/x-api/posts/create-post "X API: Create Posts"
[10]: https://docs.x.com/x-api/webhooks/introduction "X API v2 Webhooks"
