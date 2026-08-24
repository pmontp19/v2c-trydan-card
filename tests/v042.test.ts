import { beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { V2cTrydanCard } from "../src/card/v2c-trydan-card";
import { normalizeConfig } from "../src/config";
import { formatDuration, formatEnergy, formatMeasure } from "../src/services/format";
import { SUPPORTED_LANGUAGES } from "../src/localization";
import { getLcdCopy } from "../src/localization/lcd-copy";
import { VISUAL_STATE_KEYS, type HomeAssistant } from "../src/models/types";

describe("v0.4.2 localization and defaults", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("defaults energy flow off while preserving explicit opt-in and artwork config", () => {
    const base = { type:"custom:v2c-trydan-card" as const, entity:"binary_sensor.trydan" };
    expect(normalizeConfig(base).show_energy_flow).toBe(false);
    expect(normalizeConfig({ ...base, show_energy_flow:true }).show_energy_flow).toBe(true);
    expect(normalizeConfig({ ...base, display_mode:"ultra_compact", show_charger:true }).show_charger).toBe(true);
  });

  it("keeps missing values unknown and hardens malformed runtime config", () => {
    expect(formatEnergy(null,"en")).toBe("—");
    expect(formatDuration(null)).toBe("—");
    expect(formatMeasure(null,"A","en")).toBeUndefined();
    const normalized=normalizeConfig({ type:"custom:v2c-trydan-card", entity:"binary_sensor.trydan", current_presets:"6" as unknown as number[], flow_threshold_w:Number.NaN, theme:"pink" as "auto" });
    expect(normalized.current_presets).toEqual([6,10,13,16,20,25,32]);
    expect(normalized.flow_threshold_w).toBe(50);
    expect(normalized.theme).toBe("auto");
  });
  it("contains localized LCD copy for every state and language", () => {
    for (const language of SUPPORTED_LANGUAGES) for (const state of VISUAL_STATE_KEYS) {
      const copy = getLcdCopy(language,state);
      expect(copy.primary.trim()).not.toBe("");
      expect(copy.secondary.trim()).not.toBe("");
    }
    expect(getLcdCopy("de","complete").primary).toBe("Ladevorgang abgeschlossen");
    expect(getLcdCopy("es","complete",{ energy:"8,6 kWh" }).secondary).toBe("8,6 kWh");
  });

  it("renders real LCD measurements and never renders artwork in ultra compact", async () => {
    const hass = {
      language:"en",
      states:{
        "binary_sensor.trydan":{ entity_id:"binary_sensor.trydan", state:"on", attributes:{} },
        "binary_sensor.charging":{ entity_id:"binary_sensor.charging", state:"on", attributes:{} },
        "sensor.power":{ entity_id:"sensor.power", state:"4200", attributes:{ unit_of_measurement:"W" } },
        "sensor.energy":{ entity_id:"sensor.energy", state:"8.6", attributes:{ unit_of_measurement:"kWh" } },
        "sensor.voltage":{ entity_id:"sensor.voltage", state:"236.7", attributes:{ unit_of_measurement:"V" } },
        "number.intensity":{ entity_id:"number.intensity", state:"18", attributes:{ unit_of_measurement:"A" } },
      },
      callService:vi.fn(),
    } as unknown as HomeAssistant;
    const card=document.createElement("v2c-trydan-card") as V2cTrydanCard;
    card.setConfig({ type:"custom:v2c-trydan-card", entity:"binary_sensor.trydan", language:"en", entities:{ connected:"binary_sensor.trydan", charging:"binary_sensor.charging", charge_power:"sensor.power", charge_energy:"sensor.energy", voltage:"sensor.voltage", intensity:"number.intensity" } });
    card.hass=hass;document.body.append(card);await card.updateComplete;await new Promise((resolve)=>setTimeout(resolve,0));await card.updateComplete;
    const art=card.shadowRoot?.querySelector(".charger-art");
    // Decorative: the status text and the metric tiles carry this for a screen reader.
    expect(art?.getAttribute("aria-hidden")).toBe("true");
    // No live text in the artwork - the LCD is dot-matrix paths.
    expect(art?.querySelectorAll("text").length).toBe(0);
    const lcd=art?.querySelector(".charger-display")?.getAttribute("data-lcd") ?? "";
    expect(lcd).toContain("Charging 4.2 kW");
    expect(lcd).toContain("18 A · 236.7 V");
    // The product photo the body layer came from had its own screen lit, reading
    // "WAITING EV / INTENSITY 8 A". It must have been erased, not merely covered.
    expect(lcd).not.toMatch(/WAITING EV|INTENSITY 8/i);
    card.setConfig({ type:"custom:v2c-trydan-card", entity:"binary_sensor.trydan", display_mode:"ultra_compact", show_charger:true });
    card.hass=hass;await card.updateComplete;
    expect(card.shadowRoot?.querySelector(".charger-stage")).toBeNull();
  });

  it("holsters the connector whenever the card says there is no vehicle", async () => {
    const hass = {
      language: "en",
      states: {
        "binary_sensor.trydan": { entity_id: "binary_sensor.trydan", state: "off", attributes: {} },
      },
      callService: vi.fn(),
    } as unknown as HomeAssistant;
    const card = document.createElement("v2c-trydan-card") as V2cTrydanCard;
    card.setConfig({
      type: "custom:v2c-trydan-card",
      entity: "binary_sensor.trydan",
      language: "en",
      show_connector: true,
      charger_art: "full",
      entities: { connected: "binary_sensor.trydan" },
    });
    card.hass = hass;
    document.body.append(card);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;
    const art = card.shadowRoot?.querySelector(".charger-art");
    expect(art?.getAttribute("data-state")).toBe("disconnected");
    // Nothing is plugged in, so the connector hangs in its holster.
    expect(art?.getAttribute("data-connector")).toBe("in");
    expect(art?.querySelectorAll("image").length).toBe(2);
  });
});
