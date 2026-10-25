<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI components

Build the front end from [shadcn/ui](https://ui.shadcn.com) (Base UI flavour, `base-nova` style). The generated components live in `src/components/ui/`; add new ones with `npx shadcn@latest add <name>` rather than hand-rolling buttons, inputs, cards and so on. Pass `render={<Link … />}` to make a `Card`, `Badge` or `BreadcrumbLink` a link, and use `buttonVariants()` for links that look like buttons.

The shadcn theme tokens (`--primary`, `--muted-foreground`, …) are mapped onto the "Departures" palette in `src/app/globals.css`, and the components carry a few brand variants (`yellow`, `ink`, `ghost-dark` buttons; status and `line` badges). Keep new colours in that file rather than in components.
