import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountMenuTriggerContent } from "@/components/account-menu";

describe("AccountMenuTriggerContent", () => {
  it("renders avatar initials, user name, and role label", () => {
    const html = renderToStaticMarkup(
      createElement(AccountMenuTriggerContent, {
        userName: "Nguyễn Văn A",
        userEmail: "a@example.com",
        userRoleLabel: "Manager",
      }),
    );

    expect(html).toContain("NA");
    expect(html).toContain("Nguyễn Văn A");
    expect(html).toContain("Manager");
  });
});
