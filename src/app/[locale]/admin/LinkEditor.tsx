"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { LinkResult } from "@/lib/railLinks";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  /** Posted as `removeField` to remove the item. */
  value: string;
  /** Read out by the remove button. */
  name: string;
  content: React.ReactNode;
};

type Props = {
  action: (state: LinkResult, formData: FormData) => Promise<LinkResult>;
  /** The station or line being edited, as a hidden field: ["stationId", "4"] or ["line", "010"]. */
  owner: [string, string];
  removeField: "line" | "stationId";
  addField: "lines" | "station";
  title: string;
  empty: string;
  addLabel: string;
  addHint: string;
  /** Offered while typing in the add field. */
  options: string[];
  items: Item[];
};

/**
 * A list of linked lines or stations, each with a remove button, and a field to add
 * more. Both go through the same server action, so its result shows under the field.
 */
export function LinkEditor({ action, owner, removeField, addField, title, empty, addLabel, addHint, options, items }: Props) {
  const t = useTranslations("admin");
  const [state, formAction, pending] = useActionState(action, {});
  const id = useId();
  const owned = <input type="hidden" name={owner[0]} value={owner[1]} />;

  // "010, 999" adds one and reports the other, so both can show.
  const messages = [
    state.error && t("invalid"),
    state.added?.length && t("added", { items: state.added.join(", ") }),
    state.unknown?.length && t("unknown", { items: state.unknown.join(", ") }),
    state.removed && t("removed"),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="text-[28px] md:text-[32px]">
          {title} <span className="font-mono text-lg text-muted-foreground">({items.length})</span>
        </h2>
        {items.length === 0 ? (
          <Card render={<p />} className="p-5 text-muted-foreground">
            {empty}
          </Card>
        ) : (
          <Card render={<ul />} className="gap-0 divide-y divide-rule-soft py-0">
            {items.map((item) => (
              <li key={item.value} className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-4 md:pl-5">
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{item.content}</span>
                <form action={formAction}>
                  {owned}
                  <input type="hidden" name="op" value="remove" />
                  <input type="hidden" name={removeField} value={item.value} />
                  <Button type="submit" variant="ghost" size="icon-lg" className="size-11" disabled={pending} aria-label={t("removeLabel", { name: item.name })}>
                    <X />
                  </Button>
                </form>
              </li>
            ))}
          </Card>
        )}
      </section>

      <Card render={<form action={formAction} />} className="flex flex-col gap-3 p-5">
        {owned}
        <input type="hidden" name="op" value="add" />
        <Label htmlFor={`${id}-add`} className="font-display text-[22px] font-bold">
          {addLabel}
        </Label>
        <p id={`${id}-hint`} className="-mt-1 text-sm text-muted-foreground">
          {addHint}
        </p>
        <div className="flex gap-2">
          <Input id={`${id}-add`} name={addField} list={`${id}-options`} required autoComplete="off" aria-describedby={`${id}-hint`} />
          <datalist id={`${id}-options`}>
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <Button type="submit" size="xl" className="h-11.5" disabled={pending}>
            {t("add")}
          </Button>
        </div>
        {messages.length > 0 && (
          <Alert role="status" variant={state.error || state.unknown?.length ? "destructive" : "default"} className="py-2.5">
            {messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </Alert>
        )}
      </Card>
    </div>
  );
}
