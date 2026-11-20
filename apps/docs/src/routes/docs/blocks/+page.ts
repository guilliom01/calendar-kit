import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

// The old single page, split into one page per component.
export const load = () => redirect(308, resolve("/docs/components"));
