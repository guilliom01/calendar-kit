import { error } from "@sveltejs/kit";
import { components } from "#lib/docs/components/index.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => components.map(({ name }) => ({ name }));

export const load: PageLoad = ({ params }) => {
  const component = components.find((component) => component.name === params.name);
  if (!component) error(404, "Component not found");
  return { component };
};
