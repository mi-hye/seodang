# Prototype UI preferences

- A group of two action buttons must use `display: flex`, `flex-direction: row`, and `flex-wrap: nowrap`. Never stack the two buttons vertically, including mobile or large-text layouts.
- Reuse the shared `.button-pair` wrapper. Give both buttons equal flexible width, `min-width: 0`, and zero outer margins. Keep labels short; text may wrap inside a button, but the buttons must remain side by side.
- Preserve this rule when adding lessons, completion actions, or dialogs. Verify narrow mobile widths before shipping.

- Wrap prose at words or meaningful phrases. Preserve Korean words with `word-break: keep-all`; render Japanese learning sentences through `phraseText` with explicit phrase boundaries when no spaces exist. Keep original text and audio unchanged. Allow emergency wrapping only when a single unit cannot fit, and check narrow screens with large text.
