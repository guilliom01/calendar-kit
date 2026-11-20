import { error } from "@sveltejs/kit";
import { examples } from "#lib/docs/examples/index.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => examples.map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
  const example = examples.find((example) => example.slug === params.slug);
  if (!example) error(404, "Example not found");
  return { example };
};
