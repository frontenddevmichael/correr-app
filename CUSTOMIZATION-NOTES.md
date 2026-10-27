Customization notes
------------------

Dark mode
- true black base
- elevated surfaces use near-black steps
- contrast is checked for every new surface and text pairing

Appearance settings to build
- Theme: light / dark / system, plus an optional AMOLED toggle
- Accent: presets plus a custom picker with contrast safeguards
- Text: font family, size scale, weight, line spacing
- Corner radius
- Density: compact / comfortable
- Reduce motion / animation level
- Haptics: on/off, intensity, and per-event options for taps, success, errors,
  toggles; gated by platform support and OS settings
- Sounds, if the app has any
- Home layout / default landing tab
- Accessibility: high contrast, larger tap targets
- Any other sensible option we identify

Persistence and sync
- persisted locally
- applied instantly
- synced to the account if one exists

Implementation note
- reuse the existing token and theme system
- do not invent a second theming layer
