# UI v2 background generation

Built-in `image_gen` was used for two backgrounds. These remain provisional artwork, not user-approved final assets. UI, title, controls and gameplay objects are separate HTML/SVG elements.

## Hanok

Runtime: `assets/hanok-dusk-v2.jpg`. Full original: `docs/design/art-source/hanok-dusk-v2.png`.

Use case: illustration-story. Create a premium mobile visual-novel environment background, portrait 1024x1536. A quiet Korean hanok alley descending toward distant Seoul at dusk, beautifully hand-painted cinematic animation background with realistic architectural detail, wood-grain beams, curving charcoal tiled eaves, worn stone stairs, warm paper lanterns, small flowering branch near upper edge, layered tiled roofs in the distance, hazy peach sunset and dusky sage blue sky. Intimate lived-in atmosphere, understated narrative mystery, painterly texture and believable natural light, sophisticated warm amber and deep forest shadows, NOT flat vector art, NOT cartoon geometry, NOT glossy 3D, NOT a photograph. Composition: street and architecture frame both sides, airy understated sky and haze in upper middle where app title will be overlaid later, perspective alley through center lower half. Bottom may be darker for overlay. Very beautiful, restrained, detailed. No people, no animals, no bags. No written characters, no sign lettering, no text whatsoever, no app UI, no title, no borders, no logos, no watermark. Background only, edge-to-edge.

## Cafe

Runtime: `assets/cafe-dusk-v2.jpg`. Full original: `docs/design/art-source/cafe-dusk-v2.png`.

Use case: illustration-story. Create a beautiful premium visual-novel background environment for a mobile language learning mystery, landscape 1536x1024. Inside an intimate Korean neighborhood hanok cafe at golden hour. Hand-painted cinematic animation background with realistic lighting and fine architectural detail, sophisticated painterly textures, restrained deep forest green, walnut brown, honey gold, parchment tones. A large wood-framed WINDOW occupies the LEFT third showing green trees and golden afternoon light; a clearly separate wood-framed glass EXIT DOOR on RIGHT third. Middle rear has shelves with ceramic cups, books and coffee equipment, muted dark sage walls, exposed timber beams, hanging warm lamps. Several warm wooden chairs and small wooden tables, foreground low stools and tabletops provide room for later interactive objects; inviting warm sunbeams in left foreground. Eye-level wide interior, strong believable depth, cozy narrative illustration, NOT flat vector geometric graphics, NOT toy-like 3D, not a cafe advertisement. No people, no animals, no bags, no luggage, no notebooks, no letters or text anywhere, no signs, no UI, no borders, no logos, no watermark. Keep both left window and right door clearly visible even inside center 80 percent crop. Environment only, no baked gameplay clues.

The runtime JPEGs are quality-82 encoding copies of the original pixels, without cropping or repainting. Only JPEGs enter the build. The original SVG backgrounds remain available for rollback. No external image requests are made by the running app.
