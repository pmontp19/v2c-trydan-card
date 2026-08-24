# Charger artwork: sources and provenance

The new charger illustration is built from measured hardware geometry plus two layered
transparent bitmaps, with the illuminated logo and the LCD drawn as SVG on top so they
stay recolourable and animatable.

## Where the numbers come from

| Measurement | Value | Source |
| --- | --- | --- |
| Body | 240 x 334 mm, ratio 0.7186 | `ficha-tecnica-trydan.pdf`, dimensioned front elevation |
| Corner radius | 24 mm (10% of width) | least-squares fit of the drawing's rounded-rect inset profile |
| Display glass | 65 x 13.7 mm, centre at 41.0% of height | the drawing's display slot, measured at 600 dpi |
| Logo | 63.7 mm wide, centre at 23.2% of height | frontal retail photo; the manual's render gives 59.7 mm / 23.9% |
| LCD grid | 16 x 2 cells of 5 x 7 dots, 0.64 mm pitch | display captures embedded in the installation manual |
| LCD colours | background `#240FBE`, characters `~#DCE4FF` | photograph of a running unit |

Three independent sources (spec drawing, manual render, retail photo) agree on the body
ratio and the display position to within 2%.

Two things the manual gets wrong about the display: its captures are **positive** (pale
backlight, dark characters) while real hardware is **negative** (deep blue backlight,
light characters), and its idealised screens do not match what a running unit shows.
A real screen reads `ESPERANT EV` over `T:0.1 FV:1.7`.

## The bitmaps

Both layers share one 584 x 649 canvas, downscaled to 408 x 454 for shipping.

| Layer | Size | Contents |
| --- | --- | --- |
| `body.webp` | 2.3 KB | body only; the lit logo and display are removed by multigrid Laplace diffusion so the card can draw its own |
| `plug.webp` | 4.5 KB | the connector hanging at the side, with the cable hook |

6.8 KB together, 9 KB once base64-inlined. `scripts/smoke.mjs` caps the bundle at
307200 bytes and the current build uses 193509, so this fits with room to spare. A
separate bitmap *per state* never would: eleven states at 25 KB is 275 KB on its own.

Cutting an object off a white background needs alpha matting **and** un-premultiplication
(`O = (P - 255(1-a)) / a`), otherwise a white fringe survives every edge and shows up as
a halo on a dark dashboard. Near-zero alpha has to be clamped to zero as well, or the
WebP alpha channel triples in size encoding an invisible drop shadow.

## Licensing: unresolved

`source-product-photo.jpg` is a retailer's product photograph and
`source-connector-cut.png` is a hand cut of it. **Neither is cleared for redistribution.**
Separately, V2C's own brand repository (`V2Charge/v2c-media-kit`) states that "use by
unauthorized third parties is not permitted, nor is modification of the logo", which
covers the traced wordmark in `src/assets/trydan/logo.ts`.

An MIT licence on this repository's code does not license either. Before publishing,
one of these has to happen:

1. written permission from V2C, or
2. the bitmaps replaced with an original render, and the wordmark either cleared or
   abstracted.

The pipeline is source-agnostic: swapping the input photograph and re-running the
extraction reproduces the layers, so option 2 is a substitution, not a rewrite.
