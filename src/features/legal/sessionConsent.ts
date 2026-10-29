/**
 * A tiny in-memory hand-off between the consent screen and the signup form.
 *
 * Signup is the only place that needs this before an account exists. Signed-in
 * consent is persisted through `recordConsent`; this flag just lets the form
 * reflect the review the user completed a moment ago.
 */
let agreedInThisSession = false;

export function setSessionConsent(value: boolean) {
  agreedInThisSession = value;
}

export function hasSessionConsent() {
  return agreedInThisSession;
}
