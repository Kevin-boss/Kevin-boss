export const socialPlatforms = ["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];

export type SocialProviderContract = {
  displayName: string;
  documentationUrl: string;
  oauth: { authorizationUrl: string; tokenUrl: string; scopes: string[]; requiresPkce: boolean };
  publication: { supported: boolean; requiresPublicMediaUrl: boolean; prerequisite: string };
  webhook: { supported: boolean; mode: "signed" | "challenge" | "feed" | "manual_refresh"; prerequisite: string };
  credentialKeys: { clientId: string; clientSecret: string; webhookSecret?: string };
};

export const socialProviderContracts: Record<SocialPlatform, SocialProviderContract> = {
  youtube: {
    displayName: "YouTube", documentationUrl: "https://developers.google.com/youtube/v3/docs/videos/insert",
    oauth: { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", scopes: ["https://www.googleapis.com/auth/youtube.upload"], requiresPkce: true },
    publication: { supported: true, requiresPublicMediaUrl: false, prerequisite: "A final supported video asset and the connected account's YouTube upload authorization." },
    webhook: { supported: true, mode: "feed", prerequisite: "A publicly reachable verified callback subscription for the selected channel." },
    credentialKeys: { clientId: "YOUTUBE_CLIENT_ID", clientSecret: "YOUTUBE_CLIENT_SECRET" },
  },
  tiktok: {
    displayName: "TikTok", documentationUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    oauth: { authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/", tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/", scopes: ["video.publish", "video.upload"], requiresPkce: true },
    publication: { supported: true, requiresPublicMediaUrl: true, prerequisite: "A registered Content Posting API application and a verified media domain or URL prefix when posting by URL." },
    webhook: { supported: true, mode: "signed", prerequisite: "An HTTPS callback registered in the TikTok Developer Portal with idempotent event processing." },
    credentialKeys: { clientId: "TIKTOK_CLIENT_KEY", clientSecret: "TIKTOK_CLIENT_SECRET", webhookSecret: "TIKTOK_WEBHOOK_SECRET" },
  },
  facebook: {
    displayName: "Facebook Pages", documentationUrl: "https://developers.facebook.com/documentation/video-api/overview",
    oauth: { authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth", tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token", scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"], requiresPkce: false },
    publication: { supported: true, requiresPublicMediaUrl: false, prerequisite: "A Page that the connected account can administer and a completed resumable video upload." },
    webhook: { supported: true, mode: "challenge", prerequisite: "A TLS-enabled Meta webhook endpoint and the permissions relevant to subscribed Page fields." },
    credentialKeys: { clientId: "META_APP_ID", clientSecret: "META_APP_SECRET", webhookSecret: "META_WEBHOOK_VERIFY_TOKEN" },
  },
  instagram: {
    displayName: "Instagram", documentationUrl: "https://developers.facebook.com/documentation/instagram-platform/content-publishing",
    oauth: { authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth", tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token", scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"], requiresPkce: false },
    publication: { supported: true, requiresPublicMediaUrl: true, prerequisite: "An eligible professional account connected to a Page with Page Publishing Authorization and publicly accessible media." },
    webhook: { supported: true, mode: "challenge", prerequisite: "A TLS-enabled Meta webhook endpoint and the permissions relevant to subscribed Instagram fields." },
    credentialKeys: { clientId: "META_APP_ID", clientSecret: "META_APP_SECRET", webhookSecret: "META_WEBHOOK_VERIFY_TOKEN" },
  },
  linkedin: {
    displayName: "LinkedIn", documentationUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-07",
    oauth: { authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization", tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken", scopes: ["w_organization_social"], requiresPkce: false },
    publication: { supported: true, requiresPublicMediaUrl: false, prerequisite: "An application granted the required organization permission and an uploaded/finalized LinkedIn video asset." },
    webhook: { supported: false, mode: "manual_refresh", prerequisite: "Use bounded manual status refresh because ordinary social post webhooks are not established by the applicable official documentation." },
    credentialKeys: { clientId: "LINKEDIN_CLIENT_ID", clientSecret: "LINKEDIN_CLIENT_SECRET" },
  },
  x: {
    displayName: "X", documentationUrl: "https://docs.x.com/x-api/posts/create-post",
    oauth: { authorizationUrl: "https://x.com/i/oauth2/authorize", tokenUrl: "https://api.x.com/2/oauth2/token", scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"], requiresPkce: true },
    publication: { supported: true, requiresPublicMediaUrl: false, prerequisite: "A connected user-context OAuth account and a separately uploaded supported media attachment when needed." },
    webhook: { supported: true, mode: "signed", prerequisite: "An HTTPS webhook with challenge-response and signature verification." },
    credentialKeys: { clientId: "X_CLIENT_ID", clientSecret: "X_CLIENT_SECRET", webhookSecret: "X_WEBHOOK_SECRET" },
  },
};

export function getSocialProviderContract(platform: SocialPlatform) { return socialProviderContracts[platform]; }

export function getMissingSocialProviderCredentials(platform: SocialPlatform, env: NodeJS.ProcessEnv = process.env) {
  const keys = socialProviderContracts[platform].credentialKeys;
  return [keys.clientId, keys.clientSecret, keys.webhookSecret].filter((key): key is string => typeof key === "string" && !env[key]);
}
