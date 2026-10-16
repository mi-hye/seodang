# Seodang mascot animation

The renderer uses intact standing and smiling poses from `assets/mascot/seodang-cartoon-atlas-v1.png`, plus `assets/mascot/seodang-sitting-v1.png`. One Rive image mesh animates head turns, blinking, ear tips and the tail. The torso and front paws remain fixed; there are no separate arm layers or arm gestures.

`src/onboarding-character.js` lazily loads the pinned, locally vendored canvas-lite runtime and WASM. Onboarding keeps one canvas across next/back navigation and swaps decoded pose images with a short crossfade. Reduced-motion settings disable playback and crossfades. Hidden documents pause playback; disposal releases image references and observers.

The learning map renders exactly one mascot at the current node. Standing and seated poses use Rive; the running pose is a static illustration. Stage order determines pose and a stable left/right/top position. Side positions face the inside of the S bend to stay within narrow viewports.

## Editable sources

- `scripts/onboarding-motion.mjs`: continuous vertex positions, neutral endpoints and fixed torso geometry.
- `scripts/build-onboarding-rive.mjs`: deterministic Rive v7 writer; compacted keyframes use a 0.035-pixel error bound.
- `scripts/sync-rive-runtime.mjs`: copies the pinned runtime from the npm dependency.

State machines: Welcome (Greet → Idle), Rest (Idle), Speaking (Talk → Idle), Sitting (Sit), Listening (Listen → Sit), Happy (Cheer).

From `prototype/`, run `npm run build:rive` after changing animation sources, then `npm run check`. Tests verify reproducibility, neutral endpoints, fixed feet/torso, positive mesh triangle areas and bounded per-frame movement. Browser validation covers mobile layout, replay, navigation and map placement; physical-device performance is not covered by those checks.
