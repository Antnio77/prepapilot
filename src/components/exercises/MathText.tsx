"use client";

import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

/**
 * Renders text with LaTeX in it: `$$…$$` as a centred block, `$…$` inline.
 *
 * Splitting on the delimiters rather than handing the whole string to a markdown pipeline keeps
 * the non-maths parts as plain React text — nothing in an énoncé is ever interpreted as markup,
 * so a stray `*` or `<` in a statement stays exactly what the student typed. KaTeX is called in
 * `throwOnError: false` mode: a half-finished formula renders in red rather than blowing up the
 * page while you are still typing it.
 */
const SEGMENT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function renderMath(source: string, displayMode: boolean): string {
  return katex.renderToString(source, {
    displayMode,
    throwOnError: false,
    errorColor: "var(--danger)",
    output: "html",
  });
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    const segments = text.split(SEGMENT).filter((s) => s !== "");
    return segments.map((segment, i) => {
      if (segment.startsWith("$$") && segment.endsWith("$$") && segment.length >= 4) {
        return { key: i, kind: "block" as const, html: renderMath(segment.slice(2, -2).trim(), true) };
      }
      if (segment.startsWith("$") && segment.endsWith("$") && segment.length >= 3) {
        return { key: i, kind: "inline" as const, html: renderMath(segment.slice(1, -1).trim(), false) };
      }
      return { key: i, kind: "text" as const, value: segment };
    });
  }, [text]);

  return (
    <div className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {parts.map((part) =>
        part.kind === "text" ? (
          <span key={part.key}>{part.value}</span>
        ) : part.kind === "inline" ? (
          // KaTeX emits its own markup; the source is the student's own file, not third-party input.
          <span key={part.key} dangerouslySetInnerHTML={{ __html: part.html }} />
        ) : (
          <span key={part.key} className="block my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: part.html }} />
        )
      )}
    </div>
  );
}
