import { MapIcon, TextAlignStartIcon } from "lucide-react";
import { asLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ago } from "@/components/Ago";
import { DeletePubButton } from "@/components/DeletePubButton";
import { LineChip } from "@/components/LineChip";
import { StatusChip } from "@/components/StatusChip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { canDeletePubs } from "@/lib/auth/roles";
import { listLines, listPubs, listRegions, type PubListItem, type PubStatus } from "@/lib/queries";
import { czechInitial } from "@/lib/czech";
import { PIN } from "@/lib/map";

const STATUSES: PubStatus[] = ["open", "unknown", "closed"];
// A label stacked above its control
const field = "flex-col items-stretch gap-1.5 leading-normal";
// Two selects share a phone-width row; a tighter inset keeps "Všechny kraje" whole.
const halfSelect = "w-full font-normal max-md:[&_select]:pr-8 max-md:[&_select]:pl-3 max-md:[&_svg]:right-2.5";
const head = "label h-auto px-4 py-3.5 font-semibold text-muted-foreground";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pubs");
  return { title: t("title") };
}

export default async function PubsPage({ params, searchParams }: PageProps<"/[locale]/pubs">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = one(sp.q);
  const region = one(sp.region);
  const line = one(sp.line);
  const status = STATUSES.find((s) => s === sp.status);

  const t = await getTranslations("pubs");
  const st = await getTranslations("status");
  const kt = await getTranslations("kind");
  const [all, regions, lines, user] = await Promise.all([
    listPubs({ q, region: region || undefined, line: line || undefined }),
    listRegions(locale),
    listLines(),
    getCurrentUser(),
  ]);
  // Moderators and admins get a delete button on every row.
  const canDelete = canDeletePubs(user?.role);
  const isCs = locale === "cs";
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((p) => p.status === s).length])) as Record<PubStatus, number>;
  // listPubs already returns them in Czech alphabetical order.
  const pubs = status ? all.filter((p) => p.status === status) : all;
  const groups: { letter: string; pubs: PubListItem[] }[] = [];
  for (const p of pubs) {
    const letter = czechInitial(p.station);
    const group = groups.find((g) => g.letter === letter);
    if (group) group.pubs.push(p);
    else groups.push({ letter, pubs: [p] });
  }
  const stationCount = new Set(pubs.map((p) => p.stationId)).size;
  const filtered = Boolean(q || region || line || status);
  const query = (s?: PubStatus) => ({
    ...(q && { q }),
    ...(region && { region }),
    ...(line && { line }),
    ...(s && { status: s }),
  });
  const anchor = (letter: string) => `letter-${letter.toLowerCase()}`;

  return (
    <div className="page-column flex flex-col gap-5 pt-6 pb-12 md:gap-6 md:pt-10 md:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-5xl md:text-[64px]">{t("title")}</h1>
          <p className="text-muted-foreground md:text-[17px]">{t("subtitle", { pubs: pubs.length, stations: stationCount })}</p>
        </div>
        <nav aria-label={t("viewLabel")} className="flex gap-1 rounded-[10px] border border-rule bg-white p-1">
          <span aria-current="page" className={cn(buttonVariants({ size: "md" }), "rounded-[7px] text-[15px] hover:bg-primary")}>
            <TextAlignStartIcon className="size-4.5" />
            {t("viewList")}
          </span>
          <Link
            href={line ? { pathname: "/map", query: { line } } : "/map"}
            className={cn(buttonVariants({ variant: "ghost", size: "md" }), "rounded-[7px] text-[15px] hover:bg-platform")}
          >
            <MapIcon className="size-4.5" />
            {t("viewMap")}
          </Link>
        </nav>
      </div>

      <Card render={<form role="search" />} className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:items-end md:gap-4 md:p-5">
        <Label className={cn(field, "col-span-2")}>
          {t("searchLabel")}
          <Input name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} className="font-normal" />
        </Label>
        <Label className={cn(field, "min-w-0 max-[359px]:col-span-2")}>
          {t("region")}
          <NativeSelect name="region" defaultValue={region} className={halfSelect}>
            <NativeSelectOption value="">{t("anyRegion")}</NativeSelectOption>
            {regions.map((r) => (
              <NativeSelectOption key={r.slug} value={r.slug}>
                {isCs ? r.nameCs : r.nameEn}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Label className={cn(field, "min-w-0 max-[359px]:col-span-2")}>
          {t("line")}
          <NativeSelect name="line" defaultValue={line} className={halfSelect}>
            <NativeSelectOption value="">{t("anyLine")}</NativeSelectOption>
            {lines.map((l) => (
              <NativeSelectOption key={l.number} value={l.number}>
                {l.number} · {l.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        {status && <input type="hidden" name="status" value={status} />}
        <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-4">
          <span className="w-full text-sm font-medium">{t("status")}</span>
          <StatusLink href={query()} current={!status}>
            {t("anyStatus")} · {all.length}
          </StatusLink>
          {STATUSES.filter((s) => counts[s] > 0 || s === status).map((s) => (
            <StatusLink key={s} href={query(s)} current={status === s} dot={PIN[s]}>
              {st(s)} · {counts[s]}
            </StatusLink>
          ))}
          <span className="ml-auto flex gap-2 max-md:mt-1 max-md:w-full max-md:[&>*]:flex-1">
            {filtered && (
              <Link href="/pubs" className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("clear")}
              </Link>
            )}
            <Button type="submit" size="md" className="px-5">
              {t("search")}
            </Button>
          </span>
        </div>
      </Card>

      {groups.length > 1 && (
        <nav aria-label={t("jump")} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 font-mono text-sm font-semibold md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {groups.map((g) => (
            <a
              key={g.letter}
              href={`#${anchor(g.letter)}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-lg" }),
                "min-w-9 shrink-0 rounded-sm border-rule px-1.5 font-mono text-sm hover:border-sign hover:bg-sign hover:text-white",
              )}
            >
              {g.letter}
            </a>
          ))}
        </nav>
      )}

      {pubs.length ? (
        <Card className="gap-0 py-0">
          <Table className="border-collapse text-[15px]">
            <TableCaption className="sr-only">{t("results", { count: pubs.length })}</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={cn(head, "md:pl-6")}>
                  {t("colPub")}
                </TableHead>
                <TableHead scope="col" className={cn(head, "hidden md:table-cell")}>
                  {t("colStation")}
                </TableHead>
                <TableHead scope="col" className={cn(head, "hidden lg:table-cell")}>
                  {t("colLines")}
                </TableHead>
                <TableHead scope="col" className={cn(head, "hidden xl:table-cell")}>
                  {t("colRegion")}
                </TableHead>
                <TableHead scope="col" className={cn(head, "hidden lg:table-cell")}>
                  {t("colType")}
                </TableHead>
                <TableHead scope="col" className={head}>
                  <span className="sr-only md:not-sr-only">{t("colStatus")}</span>
                </TableHead>
                <TableHead scope="col" className={cn(head, "hidden text-right md:table-cell", canDelete ? "pr-4" : "pr-6")}>
                  {t("colConfirmed")}
                </TableHead>
                {canDelete && (
                  <TableHead scope="col" className={cn(head, "pr-4 md:pr-6")}>
                    <span className="sr-only">{t("colActions")}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            {groups.map((g) => (
              <TableBody key={g.letter} id={anchor(g.letter)} className="scroll-mt-4">
                <TableRow className="border-t border-b-rule-soft hover:bg-transparent">
                  <TableHead
                    colSpan={canDelete ? 8 : 7}
                    scope="rowgroup"
                    className="h-auto bg-platform px-4 py-2.5 font-display text-[28px] leading-none font-bold text-sign md:px-6"
                  >
                    {g.letter}
                  </TableHead>
                </TableRow>
                {g.pubs.map((p) => (
                  <TableRow key={p.slug} className="border-rule-soft hover:bg-[#f7f9fd]">
                    <TableCell className="py-3 pr-4 pl-4 whitespace-normal md:pl-6">
                      <Link href={{ pathname: "/pub/[slug]", params: { slug: p.slug } }} className="font-semibold hover:text-sign hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-sm text-muted-foreground md:hidden">
                        {p.station} · {kt(p.kind)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 whitespace-normal md:table-cell">{p.station}</TableCell>
                    <TableCell className="hidden px-4 py-3 lg:table-cell">
                      <span className="inline-flex gap-1">
                        {p.lines.slice(0, 4).map((n) => (
                          <LineChip key={n} number={n} className="text-xs" />
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 whitespace-normal text-muted-foreground xl:table-cell">
                      {(isCs ? p.regionCs : p.regionEn) ?? "—"}
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 whitespace-normal text-muted-foreground lg:table-cell">{kt(p.kind)}</TableCell>
                    <TableCell className="px-4 py-3 text-right md:text-left">
                      <StatusChip status={p.status} />
                    </TableCell>
                    <TableCell className={cn("hidden py-3 pl-4 text-right font-mono text-[13px] text-muted-foreground md:table-cell", canDelete ? "pr-4" : "pr-6")}>
                      <Ago months={p.monthsAgo} date={p.lastConfirmedAt} />
                    </TableCell>
                    {canDelete && (
                      <TableCell className="py-2 pr-4 pl-0 text-right md:pr-6">
                        <DeletePubButton id={p.id} name={p.name} compact />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            ))}
          </Table>
        </Card>
      ) : (
        <Card render={<p />} className="p-6">
          {t("empty")}
        </Card>
      )}
    </div>
  );
}

function StatusLink({
  href,
  current,
  dot,
  children,
}: {
  href: Record<string, string>;
  current: boolean;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={{ pathname: "/pubs", query: href }}
      aria-current={current ? "true" : undefined}
      className={cn(buttonVariants({ variant: current ? "default" : "outline", size: "md" }), "rounded-full")}
    >
      {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: current ? "0 0 0 2px #fff" : undefined }} />}
      {children}
    </Link>
  );
}
