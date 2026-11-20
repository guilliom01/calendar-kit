import type { HighlighterCore } from "shiki/core";

export type CodeLang = "svelte" | "typescript" | "bash";

let highlighter: Promise<HighlighterCore> | undefined;

/** Code as HTML with light and dark colors. Shiki loads on first use, in its own chunk. */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  highlighter ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [
          import("shiki/themes/github-light-default.mjs"),
          import("shiki/themes/github-dark-default.mjs"),
        ],
        langs: [
          import("shiki/langs/svelte.mjs"),
          import("shiki/langs/typescript.mjs"),
          import("shiki/langs/bash.mjs"),
        ],
        engine: createJavaScriptRegexEngine(),
      }),
  );
  return (await highlighter).codeToHtml(code, {
    lang,
    themes: { light: "github-light-default", dark: "github-dark-default" },
    defaultColor: false,
  });
}
