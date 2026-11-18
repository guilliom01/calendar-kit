import { error } from "@sveltejs/kit";
import { examples } from "#lib/docs/examples/index.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => examples.map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
  const index = examples.findIndex((example) => example.slug === params.slug);
  if (index === -1) error(404, "Example not found");
  return { example: examples[index]!, previous: examples[index - 1], next: examples[index + 1] };
};
