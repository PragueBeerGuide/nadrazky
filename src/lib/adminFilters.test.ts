import { describe, expect, it } from "vitest";
import { dashboardQuery, parseDashboardFilters, rangeStart, userStatus } from "./adminFilters";

describe("parseDashboardFilters", () => {
  it("defaults to everyone and the last 7 days", () => {
    expect(parseDashboardFilters({})).toEqual({
      users: { status: null, role: null, q: "", page: 1 },
      activity: { kind: null, range: "7d", q: "", page: 1 },
    });
  });

  it("reads known values and ignores unknown ones", () => {
    const f = parseDashboardFilters({ status: "active", role: "boss", kind: "checkin", range: "forever", uq: "  pivo ", apage: "3", upage: "-2" });
    expect(f.users).toEqual({ status: "active", role: null, q: "pivo", page: 1 });
    expect(f.activity).toEqual({ kind: "checkin", range: "7d", q: "", page: 3 });
  });

  it("ignores repeated parameters", () => {
    expect(parseDashboardFilters({ status: ["active", "inactive"] }).users.status).toBeNull();
  });

  it("round-trips through the query string without defaults", () => {
    const query = { status: "unfinished", role: "moderator", uq: "a", upage: "2", kind: "badge", range: "all", q: "b", apage: "4" };
    expect(dashboardQuery(parseDashboardFilters(query))).toEqual(query);
    expect(dashboardQuery(parseDashboardFilters({ range: "7d", upage: "1" }))).toEqual({});
  });
});

describe("userStatus", () => {
  const now = new Date("2026-10-28T12:00:00Z");

  it("is unfinished until sign-up is finished, whatever the activity", () => {
    expect(userStatus({ finished: false, lastActiveAt: now }, now)).toBe("unfinished");
  });

  it("is active with activity in the last 30 days, else inactive", () => {
    expect(userStatus({ finished: true, lastActiveAt: new Date("2026-10-01T12:00:00Z") }, now)).toBe("active");
    expect(userStatus({ finished: true, lastActiveAt: new Date("2026-09-20T12:00:00Z") }, now)).toBe("inactive");
    expect(userStatus({ finished: true, lastActiveAt: null }, now)).toBe("inactive");
  });
});

describe("rangeStart", () => {
  it("goes back by the range, or nowhere for all time", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(rangeStart("24h", now)).toEqual(new Date("2026-10-27T12:00:00Z"));
    expect(rangeStart("all", now)).toBeNull();
  });
});
