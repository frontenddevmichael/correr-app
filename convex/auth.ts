import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Schemes the native app finishes the OAuth round trip on: the browser hands
 * `?code=` back through the app deep link (`correr://` in standalone builds,
 * `exp://`/`exps://` inside Expo Go). Everything else keeps the default
 * policy: relative paths resolved against SITE_URL, or SITE_URL itself.
 */
const APP_SCHEME = /^(correr|exp|exps):\/\//;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return { email: (params.email as string).trim().toLowerCase() };
      },
    }),
    // Google OAuth — client id/secret come from the deployment environment
    // (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET), never from code.
    Google,
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      if (APP_SCHEME.test(redirectTo)) {
        return redirectTo;
      }
      const site = process.env.SITE_URL?.replace(/\/$/, "");
      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${site ?? ""}${redirectTo}`;
      }
      if (
        site &&
        (redirectTo === site ||
          redirectTo.startsWith(`${site}/`) ||
          redirectTo.startsWith(`${site}?`))
      ) {
        return redirectTo;
      }
      // Unvalidated destination — never echo it back (open redirect). Falls
      // back to this deployment's own site root.
      return process.env.CONVEX_SITE_URL ?? "/";
    },
  },
});
