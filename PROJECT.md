---
title: "PRD — Project scope and decisions"
status: review
---

# Correr — current project scope and decisions

This is the current working scope, not a full product document. It is the
source of truth for what we are and are not doing this session.

## What exists today

- Expo + expo-router app with Convex wired in as a real backend behind a mock
  kill-switch
- Auth: Convex Password provider plus a Google stub that currently throws a clear
  "not connected yet" error
- AI: OpenRouter server-side flow in Convex, with a local StubAi fallback when
  the key is absent
- Design system with tokens, theme, motion, components, and an auth-aligned
  screen language
- Onboarding: welcome slides, signup, profile setup, and an index gate
- A vision empty state that is now a folder stack plus an arrow that lands on the
  plus button

## What we are doing now

1. Audit done. Main risks are the short onboarding funnel, missing wizard and
   consent capture, a generic account screen that does not match the account ref,
   and a thin customization surface.
2. Build a short post-signup wizard that is skippable, resumable, persisted, and
   rebuilt in the app's own tokens to match the wizard ref images.
3. Confirm the OpenRouter AI flow end to end, with timeouts, retries, rate
   limiting, and graceful error states, while keeping the key strictly server-side.
4. Redesign the account surface to match the account ref image in the app's visual
   language.
5. Add a real customization surface, including true-black dark mode and the fuller
   appearance, motion, haptics, accessibility, and home-preferences controls.
6. Targeted bug sweep.
7. Production-readiness pass, with draft legal pages marked for lawyer review.
8. Add tests only after build and fix work.

## What we are not doing now

- Hardcoding the live OpenRouter key anywhere
- Reworking the whole app to a different framework
- Building a different auth provider just to match a design reference
- Writing tests before the build and fix work is done

## Reference images

- Wizard: ~/Downloads/wizard ref.zip (extracted to ~/Downloads/_wizard_extract)
- Account: ~/Downloads/account ref.jpg

## Status

In progress. Next concrete step is the onboarding wizard.
