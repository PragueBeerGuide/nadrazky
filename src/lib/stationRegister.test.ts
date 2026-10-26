import { describe, expect, it } from "vitest";
import { parseCsv, parseRegister, stationKey, stationMatcher } from "./stationRegister";

const CSV = `﻿sr70_id,name,name_timetable,type,type_detail_cz,lat,lon,region,operator,node
330159,Adamov,Adamov,Station (stanice),Železniční stanice,49.295415,16.663198,Jihomoravský kraj,SŽ,
330258,Adamov zastávka,Adamov zastávka,Stop (zastávka),Zastávka,49.301993,16.648105,Jihomoravský kraj,SŽ,
570861,Praha-Hlubočepy,Praha-Hlubočepy,Station (stanice),"Zastávka v obvodu stanice, výhybny",50.04,14.39,Hlavní město Praha,SŽ,
551069,Benešov u Prahy,Benešov u Prahy,Station (stanice),Železniční stanice,49.78,14.68,Středočeský kraj,SŽ,
330142,Albrechtice u Českého Těšína,Albrechtice u Č.Těš.,Station (stanice),Železniční stanice,49.79,18.52,Moravskoslezský kraj,SŽ,
`;

describe("parseCsv", () => {
  it("keeps commas and doubled quotes inside quoted fields", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });

  it("skips blank lines and a missing final newline", () => {
    expect(parseCsv("a,b\n\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseRegister", () => {
  const register = parseRegister(CSV);

  it("reads every row by column name, past the BOM", () => {
    expect(register).toHaveLength(5);
    expect(register[1]).toEqual({
      sr70: "330258",
      name: "Adamov zastávka",
      timetableName: "Adamov zastávka",
      kind: "stop",
      lat: 49.301993,
      lon: 16.648105,
      region: "Jihomoravský kraj",
    });
  });

  it("reads a row whose detail column has a quoted comma", () => {
    expect(register[2]).toMatchObject({ sr70: "570861", name: "Praha-Hlubočepy", kind: "station", region: "Hlavní město Praha" });
  });
});

describe("stationMatcher", () => {
  const match = stationMatcher(parseRegister(CSV), { Benešov: "551069" });

  it("matches names written with dashes, other case or no accents", () => {
    expect(stationKey("Adamov - Zastávka")).toBe(stationKey("Adamov zastávka"));
    expect(match("Adamov - Zastávka")).toBe("330258");
    expect(match("praha hlubocepy")).toBe("570861");
  });

  it("matches the timetable's shortened name and an alias", () => {
    expect(match("Albrechtice u Č. Těš.")).toBe("330142");
    expect(match("Benešov")).toBe("551069");
  });

  it("doesn't guess for a name the register doesn't list", () => {
    expect(match("Polná")).toBeNull();
  });
});
