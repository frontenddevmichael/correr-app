Correr — coding agent notes
----------------

Stack
- Expo + expo-router + expo-splash-screen
- React Native 0.86ish, Reanimated 4, react-native-worklets
- Convex for real backend; mock backends live in src/api for kill-switch
- Design system in src/design-system; tokens, theme, motion, components
- Auth: Convex auth (Password + Google stub), token storage in SecureStore
- AI: OpenRouter via Convex server action; never client side

Build / check commands
- typecheck:  npx tsc --noEmit
- lint:       npx expo lint
- install:    npm install
- dev:        npx expo start
- web preview: expo start --web --https --port 8081
  then forward tunnel 8081 -> 443 and accept the self-signed WebKit CA
  (AppleWebData CA material lives in src/design-system/AppleWebdataCa.ts)

Onboarding flow today
- welcome screen with three illustrator slides + dots + Sign in / Google / Create account
- signup: name, email, password
- welcome: (not implemented yet — falls through to index gate)
- onboarding profile-setup screen
- index gate: loading -> welcome, no profile -> profile setup, onboardingState vision -> /vision/new, else tabs

Known gaps
- onboarding wizard after signup is brief; spec wants short multi-step wizard here with progress + skip/resume + persistence
- account screen (More tab) is still the generic three-card profile + appearance chips + explore tiles + notifications + sign out
- customization surface exists only as theme mode chips; full appearance settings not built
- splash on web only; native splash exists in app.json, boot splash exists in _layout
- empty states exist on home, notifications, progress, vision via EmptyState; vision empty art is the animated folder stack now

Convex env vars
- OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_SITE_URL, OPENROUTER_APP_NAME
- set with `npx convex env set KEY VALUE` then deploy
- dev mode fallback: if OPENROUTER_API_KEY missing the server falls back to the local StubAi

Design direction
- dark base is true black; elevated surfaces are near-black steps
- ink is the accent, not hue; color carries meaning
- typography is Poppins display + Inter body
- icon art is custom line-art/wordmark, not stock Material symbols

Legal text
- All POLICY/* pages are marked draft for lawyer review
- Third-party AI disclosure required in onboarding + account + coach surface
- Consent capture required at signup

Do not do
- do not hardcode the live OpenRouter key anywhere
- do not commit .env* or the AppleWebData CA file in a product build
- do not add unit tests until build + fix work is done
