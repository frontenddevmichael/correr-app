Production readiness checklist
------------------------------

Security
- secrets only in env, never in client bundle or repo files
- input validation parity with existing LIMITS helpers
- every private route checks auth and scopes by user
- secure headers / CSP / CORS notes for web surfaces
- dependency audit notes captured

Performance
- bundle notes
- lazy loading where it helps
- image optimization notes
- caching notes

Reliability
- error boundaries
- an error monitoring hook
- env validation at startup

Web surfaces
- meta and favicon notes
- 404 and 500 pages

Legal/compliance
- Privacy Policy, draft for lawyer review
- Terms of Service, draft for lawyer review
- cookie/consent handling, draft for lawyer review
- account deletion and data export
- consent at signup
- third-party AI disclosure for OpenRouter
- dependency/font/asset license check, with flags for anything unlicensed
- GDPR/NDPR-aware notes where relevant

Tests
- only after build and fix work
- critical paths first
