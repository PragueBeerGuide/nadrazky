import { describe, expect, it } from "vitest";
import { orderAlongLine, routeStops } from "./lineOrder";

// Stations on a grid near Prague: x steps east along the line, y steps north.
const at = (station: string, x: number, y = 0) => ({ station, lon: 14 + x * 0.05, lat: 50 + y * 0.01 });
const names = (stops: { station: string }[]) => stops.map((s) => s.station);
/** A fixed scrambled order, so tests never rely on the input already being sorted. */
const shuffle = <T>(xs: T[]) => xs.map((x, i) => [x, (i * 5 + 3) % xs.length] as const).sort((a, b) => a[1] - b[1]).map(([x]) => x);

const straight = [at("Alfa", 0), at("Brod", 1), at("Cerhovice", 2), at("Dolany", 3), at("Erdinov", 4), at("Omega", 5)];

describe("orderAlongLine", () => {
  it("puts shuffled stations of a straight line in order", () => {
    const route = orderAlongLine(shuffle(straight), "Alfa – Omega");
    expect(names(route.main)).toEqual(["Alfa", "Brod", "Cerhovice", "Dolany", "Erdinov", "Omega"]);
    expect(route.branches).toEqual([]);
  });

  it("starts at the end named first in the line's name", () => {
    expect(names(orderAlongLine(straight, "Omega – Alfa").main)[0]).toBe("Omega");
    // Name parts without spaces around the dash, and accents, still match.
    expect(names(orderAlongLine(straight, "Omegá–Alfa").main)[0]).toBe("Omega");
  });

  it("separates a branch of two or more stations", () => {
    const stops = [...straight, at("Beta 1", 2, 4), at("Beta", 2, 7)];
    const route = orderAlongLine(shuffle(stops), "Alfa – Omega/Beta");
    expect(names(route.main)).toEqual(["Alfa", "Brod", "Cerhovice", "Dolany", "Erdinov", "Omega"]);
    expect(route.branches).toHaveLength(1);
    expect(route.branches[0].from.station).toBe("Cerhovice");
    expect(names(route.branches[0].stops)).toEqual(["Beta 1", "Beta"]);
    expect(routeStops(route)).toHaveLength(stops.length);
  });

  it("slots a lone station beside the line into the main line", () => {
    const route = orderAlongLine([...straight, at("Stray", 3, 3)], "Alfa – Omega");
    expect(route.branches).toEqual([]);
    expect(route.main).toHaveLength(7);
    const i = names(route.main).indexOf("Stray");
    expect(["Dolany", "Erdinov", "Cerhovice"]).toContain(route.main[i - 1].station);
  });

  it("handles lines with fewer than three stations", () => {
    expect(orderAlongLine([], "Alfa – Omega").main).toEqual([]);
    expect(names(orderAlongLine([at("Omega", 1), at("Alfa", 0)], "Alfa – Omega").main)).toEqual(["Alfa", "Omega"]);
  });
});
