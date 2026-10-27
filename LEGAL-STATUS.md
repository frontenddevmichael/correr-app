Legal status
-----------

All policy and consent text in this repo is draft for lawyer review.
That includes Privacy, Terms, cookie/consent handling, account deletion and data
export flows, and the third-party AI disclosure for OpenRouter.

Nothing here is final legal advice.

Google OAuth consent screen — fill-in sheet
--------------------------------------------

Field values for [Google Cloud Console → APIs & Services → OAuth consent
screen](https://console.cloud.google.com/apis/credentials/consent). Source of
truth for the policy text itself is the in-app draft (`src/app/legal.tsx`,
Draft v0.1).

| Console field | Value |
| --- | --- |
| App name | `Correr` |
| User support email | Your Google account email (the app has no support address yet — create one before publishing) |
| Developer contact email | Same as above |
| App logo | `assets/images/icon.png` (square PNG; Google needs ≥ 120×120) |
| App homepage (optional) | `https://correr.app` — only fill this once the domain actually resolves; it is referenced as the product URL in `convex/openrouter.ts` but is not verified as live |
| Privacy policy URL | **Required to publish; nothing is hosted yet.** The text exists only in-app (`src/app/legal.tsx`, “Privacy Policy” section). Host it at e.g. `https://correr.app/privacy` before moving out of Testing |
| Authorized domains | `correr.app` (must be domain-verified to publish) |
| User type | **External**, status **Testing** — add your Google addresses as test users. Staying in Testing is fine for development sign-in |
| Scopes | None to add manually. The flow requests exactly `openid profile email` (verified in the live 302 from the deployment) — basic scopes, no verification video needed |

OAuth client (Credentials → Create credentials → OAuth client ID):

- Type: **Web application**
- Authorized redirect URI: `https://zealous-poodle-706.convex.site/api/auth/callback/google`
- Authorized JavaScript origin (local web dev): `http://localhost:8081`
- The client id/secret go to the Convex deployment, never into the repo:
  `npx convex env set AUTH_GOOGLE_ID …` / `AUTH_GOOGLE_SECRET …`
- Per Convex Auth docs, production needs its **own** OAuth client with the
  production deployment's `.convex.site` callback URL.

Open gaps before publishing the consent screen: hosted privacy policy URL,
support email, domain verification. Same review caveat as everything in this
file: draft, for lawyer review.
