# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Backend

The app uses Convex through `src/api/convexCorrerApi.ts`. This checkout is connected to the cloud dev deployment in `.env.local`.

Start the Convex dev watcher before the app:

```bash
npm run convex:dev
```

Then run the app in a second terminal:

```bash
npm run web
```

Useful commands:

```bash
npm run convex:once       # push functions once without watching
npx convex env list       # list deployment environment variables
npx convex data circles   # inspect data in the connected deployment
```

To use a different project or a local anonymous backend, run:

```bash
npx convex dev --configure new
```

The production deployment is already created. Deploy backend changes with:

```bash
npx convex deploy
```

Point a production client at the production `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL`. Restart Expo after changing either value. Auth currently supports email and password only. Google sign-in and billing are still stubbed. AI runs through OpenRouter on the server.

### Scheduled work and timezones

`convex/crons.ts` runs three jobs:

- Every 15 minutes, open commitments past their due date become missed.
- Every 15 minutes, daily check-in and weekly review reminders are created using each profile's timezone and quiet hours.
- Daily, expired rate-limit windows are removed.

Day boundaries use `profile.timezone`, so a check-in made at 8pm in Lagos counts for the Lagos day, not the UTC day. The client syncs its detected timezone when the profile loads.

### AI

AI calls run in Convex actions and use OpenRouter. The key lives only in the Convex deployment, never in `EXPO_PUBLIC_*` variables or the client bundle.

```bash
npx convex env set OPENROUTER_API_KEY        # paste the key when prompted
npx convex env set --prod OPENROUTER_API_KEY
npx convex env set OPENROUTER_MODEL openai/gpt-oss-20b
npx convex env set --prod OPENROUTER_MODEL openai/gpt-oss-20b
```

`OPENROUTER_MODEL` is optional and defaults to `openai/gpt-oss-20b`. Coach replies and roadmap generation share the model. Roadmap requests use a strict JSON schema, retry once if the response is malformed or truncated, and fall back to the local stub if OpenRouter is unavailable. Coach replies include recent conversation history and today's commitments.

Check the server connection without opening the app:

```bash
npx convex run ai:openRouterHealth
npx convex run ai:openRouterRoadmapHealth
npx convex run --prod ai:openRouterHealth
```

### Auth storage

- Web keeps the Convex Auth token in AsyncStorage (browser localStorage).
- iOS and Android keep it in the platform keychain through `expo-secure-store`.

### Checks

```bash
npm test                  # timezone, reminder-window, and AI text unit tests
npx tsc --noEmit          # app + Convex typecheck
npx expo lint             # lint
```

The same checks run in `.github/workflows/ci.yml`.

### Builds

`app.json` now includes the iOS bundle ID, Android package, and build numbers. `eas.json` defines development, preview, and production profiles. The first EAS build still needs the Expo project ID:

```bash
npx eas-cli@latest init
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
