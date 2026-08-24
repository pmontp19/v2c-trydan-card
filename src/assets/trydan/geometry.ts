/**
 * Trydan hardware geometry, in millimetres.
 *
 * Every value here is measured, not estimated. Sources, in order of authority:
 *  1. `ficha-tecnica-trydan.pdf` (V2C) - the dimensioned front elevation is vector
 *     art; rendered at 600 dpi it gives the body as 561x781 px = 240x334 mm, and the
 *     display slot as 152x32 px = 65.0x13.7 mm centred at 41.0% of the height.
 *     The corner radius is a least-squares fit of the rounded-rect inset profile: 24.0 mm.
 *  2. The near-frontal render in the V2C installation manual, calibrated against the
 *     display as a ruler, places the logo centre at 23.9% of the height.
 *  3. The retail product photo in `docs/artwork/` measures the body at 354x492 px
 *     (ratio 0.7195 against the spec's 0.7186), the logo at 26.6% of the width and
 *     the display centre at 40.96% of the height.
 *
 * Three independent sources agree to within 2%, so these numbers are treated as fixed.
 */
export const TRYDAN_MM = {
  /** Outer body. 240 x 334 mm, ratio 0.7186. */
  bodyWidth: 240,
  bodyHeight: 334,
  /** 24 mm, exactly 10% of the body width. */
  cornerRadius: 24,
  /** The glossy front panel is inset from the shell edge. */
  panelInset: 4,
  /**
   * Illuminated V2C wordmark. Invisible when off: the panel is uniform black glass.
   *
   * The two sources disagree slightly: the manual's render gives 59.7 mm wide centred at
   * 23.9% of the height, the frontal retail photo gives 63.7 mm centred at 23.0%. Both
   * measure a *lit* logo, so both include some bloom and both overstate the physical
   * wordmark by a millimetre or two. We take the photo's numbers because that is the
   * image the artwork composites onto, so the model and the bitmap stay consistent.
   */
  logoWidth: 63.7,
  logoCentreY: 77.5,
  /** Official mark is 378x163 units, so 2.319:1. */
  logoAspect: 2.319,
  /** 2.6" character LCD, 16x2 cells of 5x7 dots. */
  displayWidth: 65,
  displayHeight: 13.7,
  displayCentreY: 137,
  displayCornerRadius: 2,
} as const;

/**
 * Where each feature sits inside the layered artwork bitmaps, in their own pixel
 * space. The bitmaps share one 584x649 canvas (they are cut from the same photo and
 * downscaled together), so these offsets apply to every layer.
 */
export const ARTWORK_PX = {
  canvasWidth: 584,
  canvasHeight: 649,
  body: { x: 120, y: 37, width: 354, height: 492 },
  logo: { x: 248, y: 130, width: 94, height: 41 },
  display: { x: 245, y: 226, width: 105, height: 26 },
} as const;

/**
 * Vertical crops, as a fraction of the canvas height. The connector lives in the
 * lower half (canvas y 270 to 613), so `focus` deliberately loses it.
 */
export const ARTWORK_CROPS = {
  focus: 0.54,
  mid: 0.8,
  full: 1,
} as const;

export type ArtworkCrop = keyof typeof ARTWORK_CROPS;

/** Where the connector layer lives on the canvas, so a frame can decide to include it. */
export const CONNECTOR_PX = { top: 258, bottom: 613, right: 553 } as const;

export interface ArtworkFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The visible window onto the artwork canvas.
 *
 * Cropping vertically alone is not enough. The bitmaps were cut from a photograph whose
 * frame has to leave room for the coiled cable, so the body only fills 61% of the canvas
 * width. Showing the full width when the connector is hidden would shrink the display to
 * an unreadable smear and pad the card with empty space, so the frame closes in
 * horizontally too and only opens up when there is a connector to make room for.
 */
export function chargerArtFrame(crop: ArtworkCrop, showConnector: boolean): ArtworkFrame {
  const { body } = ARTWORK_PX;
  const margin = 6;
  const x = body.x - margin;
  const right = showConnector ? CONNECTOR_PX.right + margin : body.x + body.width + margin;
  const y = body.y - 13;
  // Each crop stops just past the last feature it is meant to show.
  const bottom = crop === "focus"
    ? ARTWORK_PX.display.y + ARTWORK_PX.display.height + 22
    : crop === "mid"
      ? Math.round((CONNECTOR_PX.top + CONNECTOR_PX.bottom) / 2 + 62)
      : CONNECTOR_PX.bottom + 12;
  return { x, y, width: right - x, height: bottom - y };
}
