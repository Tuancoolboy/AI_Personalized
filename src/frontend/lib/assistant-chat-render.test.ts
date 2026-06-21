import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("assistant chat link render safety", () => {
  it("escapes HTML-like strings when rendered as React text children", () => {
    const maliciousLabel = '<img src=x onerror=alert(1)>';
    const html = renderToStaticMarkup(
      createElement(
        "a",
        {
          href: "/lo-trinh/marketing-m1",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        maliciousLabel,
      ),
    );

    expect(html).not.toMatch(/<img[\s>]/);
    expect(html).toContain("&lt;img");
    expect(html).toContain('href="/lo-trinh/marketing-m1"');
  });
});
