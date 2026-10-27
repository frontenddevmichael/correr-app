Onboarding notes
--------------

Current funnel
- welcome slides
- signup: name, email, password
- onboarding profile setup
- index gate redirects based on onboardingState

What onboardingState does today
- profile: needs profile setup
- vision: needs vision creation
- otherwise: send to tabs

What the wizard ref images show
- short one-question-per-screen flow
- progress indicator
- skip at each step and as a whole
- permissive, friendly copy
- app-specific artwork and icons
- visual progress and completion state

What we will build
- a short wizard that can be triggered after signup
- skip/resume behavior
- persistence mid-wizard
- a home prompt for users who skipped entirely
- a settings entry to resume
- rebuilt to the reference layout but using the app's own tokens

Consent
- consent capture is required at signup
- this is draft for lawyer review until legal text is finalized
