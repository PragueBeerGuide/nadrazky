// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import { StationSign } from "./StationSign";
import { StatusChip } from "./StatusChip";

afterEach(cleanup);

describe("StatusChip", () => {
  it("shows the translated status with its colour class", () => {
    render(
      <NextIntlClientProvider locale="cs" messages={cs}>
        <StatusChip status="open" />
      </NextIntlClientProvider>,
    );
    const chip = screen.getByText("V provozu");
    expect(chip.className).toContain("chip-open");
  });

  it("uses the English label in English", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <StatusChip status="maybe_open" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Maybe open").className).toContain("chip-maybe_open");
  });
});

describe("StationSign", () => {
  it("shows the station name", () => {
    render(<StationSign name="Davle" />);
    expect(screen.getByText("Davle")).toBeTruthy();
  });
});
