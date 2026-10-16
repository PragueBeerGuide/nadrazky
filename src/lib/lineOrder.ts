import { fold } from "./slug";

type Point = { lat: number; lon: number; station: string };

export type LineRoute<T> = {
  /** The main line, from the end named first in the line's name. */
  main: T[];
  /** Side branches, each leaving the main line at `from`. */
  branches: { from: T; stops: T[] }[];
};

/**
 * Lays out a rail line's stations from their positions alone (the data has no stop sequence).
 * The minimum spanning tree of the stations approximates the track; its longest path is the
 * main line, side subtrees of two or more stations are branches, and single stray stations
 * are slotted into the main line where they add the least distance.
 */
export function orderAlongLine<T extends Point>(stops: T[], lineName: string): LineRoute<T> {
  const n = stops.length;
  if (n < 3) return { main: orient(stops, lineName), branches: [] };
  const k = Math.cos((stops.reduce((a, s) => a + s.lat, 0) / n) * (Math.PI / 180));
  const d = (i: number, j: number) => Math.hypot((stops[i].lon - stops[j].lon) * k, stops[i].lat - stops[j].lat);

  // Prim's minimum spanning tree.
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inTree = new Array(n).fill(false);
  const best = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  best[0] = 0;
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = true;
    if (parent[u] >= 0) {
      adj[u].push(parent[u]);
      adj[parent[u]].push(u);
    }
    for (let v = 0; v < n; v++) {
      if (!inTree[v] && d(u, v) < best[v]) {
        best[v] = d(u, v);
        parent[v] = u;
      }
    }
  }

  // Tree diameter: the farthest node from any node, then the farthest from that one.
  const walk = (from: number) => {
    const dist = new Array(n).fill(-1);
    const prev = new Array(n).fill(-1);
    dist[from] = 0;
    const stack = [from];
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj[u]) {
        if (dist[v] < 0) {
          dist[v] = dist[u] + d(u, v);
          prev[v] = u;
          stack.push(v);
        }
      }
    }
    const far = dist.indexOf(Math.max(...dist));
    return { far, prev, dist };
  };
  // Prefer the ends the line's name gives ("Praha – … – Čerčany/Dobříš") when stations match them.
  const [firstNames, lastNames] = endNames(lineName);
  const matching = (names: string[]) =>
    stops.flatMap((s, i) => (names.some((nm) => fold(s.station).startsWith(nm)) ? [i] : []));
  const starts = matching(firstNames);
  const ends = matching(lastNames).filter((i) => !starts.includes(i));
  let a = walk(0).far;
  let pathFrom = walk(a);
  let b = pathFrom.far;
  let longest = -1;
  for (const s of starts) {
    const w = walk(s);
    for (const e of ends) {
      const len = pathLength(w.prev, e, d);
      if (len > longest) {
        longest = len;
        a = s;
        b = e;
        pathFrom = w;
      }
    }
  }
  const { prev } = pathFrom;
  const main: number[] = [];
  for (let v = b; v >= 0; v = prev[v]) main.push(v);
  main.reverse();
  const onMain = new Set(main);

  // Collect side subtrees hanging off each main-line station, ordered outwards.
  const branches: { from: number; stops: number[] }[] = [];
  for (const junction of [...main]) {
    for (const start of adj[junction]) {
      if (onMain.has(start)) continue;
      const sub: number[] = [];
      const seen = new Set([junction]);
      const queue = [start];
      while (queue.length) {
        const u = queue.shift()!;
        if (seen.has(u)) continue;
        seen.add(u);
        sub.push(u);
        queue.push(...adj[u].filter((v) => !seen.has(v)));
      }
      sub.sort((x, y) => d(junction, x) - d(junction, y));
      if (sub.length >= 2) branches.push({ from: junction, stops: sub });
      else {
        // A lone station beside the line: insert it where it lengthens the main line least.
        const s = sub[0];
        let at = 0;
        let cost = Infinity;
        for (let i = 0; i <= main.length; i++) {
          const prevStop = main[i - 1];
          const nextStop = main[i];
          const c =
            (prevStop !== undefined ? d(prevStop, s) : 0) +
            (nextStop !== undefined ? d(s, nextStop) : 0) -
            (prevStop !== undefined && nextStop !== undefined ? d(prevStop, nextStop) : 0);
          if (c < cost) {
            cost = c;
            at = i;
          }
        }
        main.splice(at, 0, s);
      }
    }
  }

  return {
    main: orient(
      main.map((i) => stops[i]),
      lineName,
    ),
    branches: branches.map((br) => ({ from: stops[br.from], stops: br.stops.map((i) => stops[i]) })),
  };
}

/** Flattens a route into one list: the main line, then each branch. */
export function routeStops<T>(route: LineRoute<T>): T[] {
  return [...route.main, ...route.branches.flatMap((b) => b.stops)];
}

function pathLength(prev: number[], to: number, d: (i: number, j: number) => number) {
  let len = 0;
  for (let v = to; prev[v] >= 0; v = prev[v]) len += d(v, prev[v]);
  return len;
}

/** "Praha – Vrané – Čerčany/Dobříš" -> [["praha"], ["cercany", "dobris"]], folded. */
function endNames(lineName: string): [string[], string[]] {
  const parts = lineName.split(/\s*–\s*|\s+-\s+/).filter((p) => p.trim());
  const alts = (p: string | undefined) => (p ?? "").split("/").map((x) => fold(x).trim()).filter(Boolean);
  return [alts(parts[0]), parts.length > 1 ? alts(parts[parts.length - 1]) : []];
}

/** Puts the end named first in "Praha – … – Čerčany" at the start. */
function orient<T extends Point>(stops: T[], lineName: string): T[] {
  if (stops.length < 2) return stops;
  const [firstNames, lastNames] = endNames(lineName);
  const is = (s: T, names: string[]) => names.some((nm) => fold(s.station).startsWith(nm));
  const head = stops[0];
  const tail = stops[stops.length - 1];
  const reverse =
    (!is(head, firstNames) && is(tail, firstNames)) ||
    (!is(head, firstNames) && !is(tail, firstNames) && is(head, lastNames) && !is(tail, lastNames));
  return reverse ? [...stops].reverse() : stops;
}
