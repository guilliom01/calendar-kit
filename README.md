# calendar-kit

A free, open-source (MIT) full calendar for Svelte, built the shadcn way: you copy the components into your project, own the code, and style it with Tailwind CSS.

- **`@calendar-kit/core`**: framework-agnostic logic (dates, recurrence, layout, interaction, state), installed from npm so fixes reach you.
- **Registry items**: Svelte 5 components you copy and edit freely.

> Status: early development (phase 0). Not published yet.

## Layout

```
packages/core   # @calendar-kit/core, pure TypeScript
apps/docs       # SvelteKit docs site; also builds and serves the registry (static/r)
```

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run test     # core unit tests (Vitest)
bun run check    # type checks
bun run lint     # Prettier + ESLint
bun run build    # builds core, the registry and the docs site
```

Run the docs site with `bun run --filter @calendar-kit/docs dev`.

## Installing a component

```sh
npx shadcn-svelte@latest add <registry-url>/r/month-grid.json
```

Components land in your `ui` alias (for example `src/lib/components/ui/month-grid/`).

## Adding a registry item

1. Put the files in `apps/docs/src/lib/registry/<item>/`.
2. Add the item to `apps/docs/registry.json` with type `registry:ui` (one folder per item) and its npm `dependencies`.
3. Put logic in `packages/core`, not in the component.
4. Run `bun run build`.
