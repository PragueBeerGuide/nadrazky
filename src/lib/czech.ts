/** Czech alphabet initial: Č, Ch, Ř, Š and Ž are letters of their own; Á, Ú, Ů… file under A, U. */
export function czechInitial(name: string) {
  if (/^ch/i.test(name)) return "CH";
  const first = name.charAt(0).toLocaleUpperCase("cs");
  return "ČŘŠŽ".includes(first) ? first : first.normalize("NFD").charAt(0);
}
