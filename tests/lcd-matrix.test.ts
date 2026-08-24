import { describe, expect, it } from "vitest";
import { LCD_GRIDS, foldForLcd, lcdGeometry, lcdPaths } from "../src/card/lcd-matrix";
import { TRYDAN_MM } from "../src/assets/trydan/geometry";

const GLASS_W = TRYDAN_MM.displayWidth;
const GLASS_H = TRYDAN_MM.displayHeight;

const countSquares = (path: string) => (path.match(/M/g) ?? []).length;

describe("LCD dot matrix", () => {
  it("keeps the dots square and inside the glass", () => {
    for (const grid of Object.keys(LCD_GRIDS) as (keyof typeof LCD_GRIDS)[]) {
      const { pitch, dot, offsetX, offsetY } = lcdGeometry(grid, GLASS_W, GLASS_H);
      const { columns, rows } = LCD_GRIDS[grid];
      expect(dot).toBeGreaterThan(0);
      expect(dot).toBeLessThan(pitch);
      expect(offsetX).toBeGreaterThanOrEqual(0);
      expect(offsetY).toBeGreaterThanOrEqual(0);
      expect(offsetX * 2 + columns * 6 * pitch).toBeLessThanOrEqual(GLASS_W + 1e-9);
      expect(offsetY * 2 + rows * 8 * pitch).toBeLessThanOrEqual(GLASS_H + 1e-9);
    }
  });

  it("gives the authentic 16x2 grid the hardware's 0.64 mm pitch", () => {
    // Measured from the display captures in V2C's installation manual.
    expect(lcdGeometry("authentic", GLASS_W, GLASS_H).pitch).toBeCloseTo(0.64, 2);
  });

  it("trades character count for dot size without changing the glass", () => {
    const authentic = lcdGeometry("authentic", GLASS_W, GLASS_H).pitch;
    const big = lcdGeometry("big", GLASS_W, GLASS_H).pitch;
    expect(big).toBeGreaterThan(authentic * 2);
  });

  it("splits every grid position into exactly one of on or off", () => {
    const { columns, rows } = LCD_GRIDS.mid;
    const { on, off } = lcdPaths(["ESPERANT EV", "T:0.1 FV:1.7"], "mid", GLASS_W, GLASS_H);
    expect(countSquares(on) + countSquares(off)).toBe((columns * 6 - 1) * (rows * 8 - 1));
    expect(countSquares(on)).toBeGreaterThan(0);
  });

  it("lights nothing for blank lines and everything stays on the off grid", () => {
    const { on, off } = lcdPaths(["", ""], "mid", GLASS_W, GLASS_H);
    expect(on).toBe("");
    expect(countSquares(off)).toBeGreaterThan(0);
  });

  it("upper-cases input and falls back to a blank cell for unknown characters", () => {
    const lower = lcdPaths(["kw"], "big", GLASS_W, GLASS_H);
    const upper = lcdPaths(["KW"], "big", GLASS_W, GLASS_H);
    expect(lower.on).toBe(upper.on);
    // An accented character has no glyph; it must degrade to a gap, not throw.
    expect(() => lcdPaths(["POTÈNCIA"], "mid", GLASS_W, GLASS_H)).not.toThrow();
  });

  it("ignores lines beyond the grid instead of overflowing", () => {
    const oneLine = lcdPaths(["4.2 KW"], "big", GLASS_W, GLASS_H);
    const withExtra = lcdPaths(["4.2 KW", "IGNORED"], "big", GLASS_W, GLASS_H);
    expect(withExtra.on).toBe(oneLine.on);
  });

  it("stays cheap enough to rebuild on every render", () => {
    const { on, off } = lcdPaths(["EV      4.2KW", "T/GRID  5.1KW"], "authentic", GLASS_W, GLASS_H);
    // Two path strings, not 1536 elements.
    expect(on.length + off.length).toBeLessThan(80_000);
  });
});

describe("grid choice", () => {
  it("never cuts a word: long copy falls back to the hardware's own 16 cells", () => {
    // "Trydan preparado" is 16 characters and must survive whole.
    const long = lcdPaths(["Trydan preparado", "Sin vehiculo"], "authentic", GLASS_W, GLASS_H);
    const cut = lcdPaths(["Trydan prepa", "Sin vehiculo"], "mid", GLASS_W, GLASS_H);
    expect(countSquares(long.on)).toBeGreaterThan(countSquares(cut.on));
  });
});

describe("accent folding", () => {
  it("strips accents the way the hardware does", () => {
    // V2C's own language menu, photographed in the installation manual, reads "ESPANOL".
    expect(foldForLcd("Español")).toBe("ESPANOL");
    expect(foldForLcd("Sin vehículo")).toBe("SIN VEHICULO");
    expect(foldForLcd("Potència")).toBe("POTENCIA");
    expect(foldForLcd("Carga programada")).toBe("CARGA PROGRAMADA");
  });

  it("renders folded text as fully lit glyphs, not gaps", () => {
    const accented = lcdPaths(["Sin vehículo"], "mid", GLASS_W, GLASS_H);
    const plain = lcdPaths(["Sin vehiculo"], "mid", GLASS_W, GLASS_H);
    expect(accented.on).toBe(plain.on);
  });
});
