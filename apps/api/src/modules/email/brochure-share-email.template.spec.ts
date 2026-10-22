import { buildBrochureShareEmail } from "./brochure-share-email.template";

describe("buildBrochureShareEmail", () => {
  it("renders a branded link email and escapes customer-controlled content", () => {
    const result = buildBrochureShareEmail({
      recipientName: '<script>alert("x")</script>',
      organizationName: "Nirman & Sons",
      projectName: "Lake <View>",
      senderName: 'Asha "Sales"',
      assetCount: 2,
      shareUrl: "https://example.test/brochure-share/token?a=1&b=2",
      expiresAt: "2026-11-21T12:00:00.000Z",
    });

    expect(result.subject).toBe(
      "Lake <View> brochures and property information",
    );
    expect(result.text).toContain(
      "View brochures: https://example.test/brochure-share/token?a=1&b=2",
    );
    expect(result.html).toContain("Lake &lt;View&gt;");
    expect(result.html).toContain("Nirman &amp; Sons");
    expect(result.html).toContain("a=1&amp;b=2");
    expect(result.html).not.toContain("<script>");
  });
});
