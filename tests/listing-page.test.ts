import { describe, expect, it } from "vitest";
import {
  checkedListingUrl,
  listingTextFromHtml,
  publicIPv4,
} from "../lib/listing-page";

describe("leitura de anúncio público", () => {
  it("bloqueia destinos internos, portas e protocolos inseguros", () => {
    for (const url of [
      "http://example.com/a",
      "https://localhost/a",
      "https://127.0.0.1/a",
      "https://example.com:8443/a",
      "https://user:pass@example.com/a",
    ]) {
      expect(() => checkedListingUrl(url)).toThrow();
    }
    expect(
      checkedListingUrl("https://www.example.com/imovel/123").hostname,
    ).toBe("www.example.com");
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "192.0.2.1",
      "203.0.113.1",
    ])
      expect(publicIPv4(ip)).toBe(false);
    expect(publicIPv4("8.8.8.8")).toBe(true);
  });

  it("extrai texto visível e dados estruturados sem scripts comuns", () => {
    const text = listingTextFromHtml(
      '<html><head><title>Apartamento no Cambuí</title><meta name="description" content="82 m² e 2 vagas"><script type="application/ld+json">{"name":"Residencial"}</script><script>segredo</script></head><body><nav>menu</nav><article><h1>Apartamento</h1><p>Varanda gourmet &amp; piscina.</p></article></body></html>',
    );
    expect(text).toContain("82 m² e 2 vagas");
    expect(text).toContain("Residencial");
    expect(text).toContain("Varanda gourmet & piscina.");
    expect(text).not.toContain("segredo");
    expect(text).not.toContain("menu");
  });
});
