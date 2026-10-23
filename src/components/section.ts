/** Which top-level section an internal pathname ("/pub/[slug]", "/map", …) belongs to. */
export function sectionOf(pathname: string) {
  const first = pathname.split("/")[1] ?? "";
  const map: Record<string, string> = {
    "": "/",
    map: "/map",
    pubs: "/pubs",
    pub: "/pubs",
    regions: "/regions",
    region: "/regions",
    lines: "/lines",
    line: "/lines",
    about: "/about",
  };
  return map[first] ?? "";
}
