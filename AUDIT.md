Audit
-----

How onboarding and auth work today
- welcome screen: three illustrator slides, dots, Sign in / Google / Create account
- signup: name, email, password
- onboarding profile setup: display name, timezone, notifications
- index gate: loading -> welcome, no profile -> profile setup,
  onboardingState vision -> /vision/new, else tabs
- auth provider: Convex Password; Google route exists but currently throws a clear
  "not connected yet" error

Stack
- Expo + expo-router
- React Native 0.86 family, Reanimated 4, react-native-worklets
- Convex with a mock kill-switch; the app still runs locally on mocks until
  Convex is enabled
- design system in src/design-system with tokens, theme, motion, components
- auth tokens in SecureStore
- OpenRouter AI is server-side Convex only; client never sees the key
- fallback to StubAi when the key is absent

Main risks I see
- onboarding funnel is short and has no wizard, no skip/resume, and no consent
  capture step
- account surface is generic and does not match the account ref image
- customization surface is thin: only theme mode chips today
- dark mode is near-black but not explicitly true black with checked contrast
- empty states exist but are generic; some screens could be more guided
- a few routes have placeholder or unimplemented surfaces that currently return
  a basic screen or an error boundary default
- the OpenRouter key must stay strictly server-side; the repo must not contain it

What reference images are accessible
- wizard: ~/Downloads/wizard ref.zip (extracted to ~/Downloads/_wizard_extract)
- account: ~/Downloads/account ref.jpg

Immediate next step
- build the short post-signup wizard, then redesign the account surface, then
  expand customization, then the bug sweep and production readiness pass, then
  tests for critical paths last.
