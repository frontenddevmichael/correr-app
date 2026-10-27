Miscellaneous notes
------------------

- The AppleWebData CA text for the local WKWebView dev-certificate trust test is
  in src/design-system/AppleWebdataCa.ts.
- The OpenRouter key does not exist in this repo. When the user sets it as a
  Convex server env var, the server uses it; the client never sees it.
- The console sink in analytics.ts only logs in non-production. That is intentional
  and not a production leak.
- The repo still has several placeholder/unimplemented surfaces. Treat them as
  design gaps, not finished features.
- Legal text is draft for lawyer review. This includes consent and AI disclosure.
