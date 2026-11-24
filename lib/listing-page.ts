import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

const maxBytes = 1_500_000;

export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export function checkedListingUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw Error("Cole um link HTTPS válido do anúncio.");
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !url.hostname.includes(".") ||
    isIP(url.hostname) ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost")
  )
    throw Error(
      "Use um link HTTPS público do anúncio, sem porta personalizada.",
    );
  return url;
}

function decodeEntities(text: string) {
  return text.replace(
    /&(#(?:x[\da-f]+|\d+)|amp|nbsp|quot|apos|lt|gt);/gi,
    (_, entity: string) => {
      const named: Record<string, string> = {
        amp: "&",
        nbsp: " ",
        quot: '"',
        apos: "'",
        lt: "<",
        gt: ">",
      };
      if (entity[0] !== "#") return named[entity.toLowerCase()] ?? " ";
      const value =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
    },
  );
}

export function listingTextFromHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const description =
    html.match(
      /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i,
    )?.[1] ?? "";
  const jsonLd = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => match[1])
    .join(" ");
  const visible = html
    .replace(
      /<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      " ",
    )
    .replace(/<\/(?:p|div|li|h[1-6]|section|article|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities([title, description, jsonLd, visible].join("\n"))
    .replace(/[\t\r ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 50000);
}

async function download(url: URL): Promise<{
  status: number;
  location?: string;
  contentType?: string;
  html: string;
}> {
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (
    !addresses.length ||
    addresses.some((entry) => !publicIPv4(entry.address))
  )
    throw Error("Este endereço não pode ser lido com segurança.");
  const address = addresses[0].address;
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        family: 4,
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [{ address, family: 4 }])
            : callback(null, address, 4),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NossoLar/1.0)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
        },
        timeout: 8000,
      },
      (response) => {
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(Error("A página é grande demais para importar."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
            contentType: response.headers["content-type"],
            html: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("timeout", () =>
      req.destroy(Error("O site demorou demais para responder.")),
    );
    req.on("error", reject);
    req.end();
  });
}

export function mansurPartnerUrl(url: URL) {
  if (
    url.hostname !== "www.mansurimoveis.com.br" &&
    url.hostname !== "mansurimoveis.com.br"
  )
    return null;
  const code = url.pathname.match(/^\/imovel\/[^/]+\/(\d{5,12})\/?$/)?.[1];
  return code
    ? { code, url: `https://www.netimoveis.com/imovel/anuncio/${code}` }
    : null;
}

async function readPublicPage(input: string) {
  let url = checkedListingUrl(input);
  for (let redirect = 0; redirect < 3; redirect++) {
    const result = await download(url);
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      url = checkedListingUrl(new URL(result.location, url).href);
      continue;
    }
    if (result.status === 401 || result.status === 403 || result.status === 429)
      throw Error(
        "O portal bloqueou a leitura automática. Cole o texto do anúncio abaixo.",
      );
    if (
      result.status < 200 ||
      result.status >= 300 ||
      !result.contentType?.includes("text/html")
    )
      throw Error(
        "Não foi possível ler esta página. Cole o texto do anúncio abaixo.",
      );
    const text = listingTextFromHtml(result.html);
    if (
      /just a moment|performing security verification|verificando se voc[eê] [eé] humano|captcha/i.test(
        text,
      )
    )
      throw Error(
        "O portal bloqueou a leitura automática. Cole o texto do anúncio abaixo.",
      );
    if (text.length < 100)
      throw Error(
        "O anúncio não trouxe texto suficiente. Cole o texto da página abaixo.",
      );
    return text;
  }
  throw Error(
    "O anúncio redirecionou muitas vezes. Cole o texto da página abaixo.",
  );
}

export async function readListingPage(
  input: string,
  readPage: (url: string) => Promise<string> = readPublicPage,
) {
  const original = checkedListingUrl(input);
  const partner = mansurPartnerUrl(original);
  try {
    return await readPage(original.href);
  } catch (originalError) {
    if (!partner) throw originalError;
    try {
      const text = await readPage(partner.url);
      if (new RegExp(`\\b${partner.code}\\b`).test(text)) return text;
    } catch {
      // The original error is more useful when both public pages are unavailable.
    }
    throw Error(
      "Não consegui ler o anúncio nem a cópia pública do mesmo imóvel. Cole o texto da página abaixo.",
    );
  }
}
