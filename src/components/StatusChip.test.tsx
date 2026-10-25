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
  it("shows the translated status and marks which one it is", () => {
    render(
      <NextIntlClientProvider locale="cs" messages={cs}>
        <StatusChip status="open" />
      </NextIntlClientProvider>,
    );
    const chip = screen.getByText("V provozu");
    expect(chip.dataset.status).toBe("open");
  });

  it("uses the English label in English", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <StatusChip status="unknown" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Status unknown").dataset.status).toBe("unknown");
  });
});

describe("StationSign", () => {
  it("shows the station name", () => {
    render(<StationSign name="Davle" />);
    expect(screen.getByText("Davle")).toBeTruthy();
  });
});
