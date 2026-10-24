/** Czech alphabet initial: Č, Ch, Ř, Š and Ž are letters of their own; Á, Ú, Ů… file under A, U. */
export function czechInitial(name: string) {
  if (/^ch/i.test(name)) return "CH";
  const first = name.charAt(0).toLocaleUpperCase("cs");
  return "ČŘŠŽ".includes(first) ? first : first.normalize("NFD").charAt(0);
}

const collator = new Intl.Collator("cs");

/**
 * Orders Czech names by the Czech alphabet: C, Č, D … H, Ch, I … R, Ř, S, Š … Z, Ž,
 * with accents such as á or é not breaking the order. The database's own ORDER BY
 * compares bytes, which puts Č, Ř, Š and Ž after Z.
 */
export function compareCzech(a: string, b: string) {
  return collator.compare(a, b);
}
