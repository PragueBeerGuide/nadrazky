"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canEditRailData } from "@/lib/auth/roles";
import { addStationLines, findStationByName, removeStationLine } from "@/lib/railAdmin";
import { lineStationsSchema, parseLineNumbers, stationLinesSchema, type LinkResult } from "@/lib/railLinks";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !canEditRailData(user.role)) throw new Error("Only admins can edit stations and rail lines.");
}

/** Lines change on pub pages, line pages, the lines list and the map, so everything is revalidated. */
function revalidateRailData() {
  revalidatePath("/", "layout");
}

/** On a station's admin page: adds lines to the station ("010, 230" or a picked option) or removes one. */
export async function editStationLines(_: LinkResult, formData: FormData): Promise<LinkResult> {
  await requireAdmin();
  const input = stationLinesSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "invalid" };
  if (input.data.op === "remove") {
    await removeStationLine(input.data.stationId, input.data.line);
    revalidateRailData();
    return { removed: input.data.line };
  }
  const numbers = parseLineNumbers(input.data.lines);
  if (!numbers.length) return { unknown: [input.data.lines] };
  const result = await addStationLines(input.data.stationId, numbers);
  if (result.added.length) revalidateRailData();
  return result;
}

/** On a line's admin page: adds a station to the line by its name, or removes one. */
export async function editLineStations(_: LinkResult, formData: FormData): Promise<LinkResult> {
  await requireAdmin();
  const input = lineStationsSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "invalid" };
  if (input.data.op === "remove") {
    await removeStationLine(input.data.stationId, input.data.line);
    revalidateRailData();
    return { removed: String(input.data.stationId) };
  }
  const station = await findStationByName(input.data.station);
  if (!station) return { unknown: [input.data.station] };
  const { added } = await addStationLines(station.id, [input.data.line]);
  if (!added.length) return { error: "invalid" };
  revalidateRailData();
  return { added: [station.name] };
}
