import { resolve } from "$app/paths";
import { components } from "./components/index.js";
import { examples } from "./examples/index.js";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

/** The docs sidebar, in reading order. Previous/next links follow the same order. */
export const navGroups: NavGroup[] = [
  {
    title: "Getting Started",
    links: [{ href: resolve("/docs"), label: "Introduction" }],
  },
  {
    title: "Components",
    links: [
      { href: resolve("/docs/components"), label: "Overview" },
      ...components.map((component) => ({
        href: resolve("/docs/components/[name]", { name: component.name }),
        label: component.name,
      })),
    ],
  },
  {
    title: "Guides",
    links: [
      { href: resolve("/docs/state"), label: "State and hooks" },
      { href: resolve("/docs/recurrence"), label: "Recurring events" },
      { href: resolve("/docs/customizing"), label: "Customizing views" },
      { href: resolve("/docs/external-drag"), label: "Dragging your own items in" },
      { href: resolve("/docs/import-export"), label: "Import and export" },
      {
        href: resolve("/docs/i18n-a11y"),
        label: "Languages and accessibility",
      },
    ],
  },
  {
    title: "Examples",
    links: [
      { href: resolve("/docs/examples"), label: "Overview" },
      ...examples.map((example) => ({
        href: resolve("/docs/examples/[slug]", { slug: example.slug }),
        label: example.title,
      })),
    ],
  },
];

const allLinks = navGroups.flatMap((group) => group.links);

/** The pages before and after `pathname` in the sidebar. */
export function neighbours(pathname: string) {
  const index = allLinks.findIndex((link) => link.href === pathname);
  return {
    previous: allLinks[index - 1],
    next: index < 0 ? undefined : allLinks[index + 1],
  };
}
