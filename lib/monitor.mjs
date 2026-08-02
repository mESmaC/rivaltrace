const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_NORMALIZED_CHARACTERS = 250_000;
const MAX_DIFF_BLOCKS = 600;
const MAX_EVIDENCE_BLOCKS = 24;
const MAX_REDIRECTS = 3;

const HTML_ENTITY_MAP = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  nbsp: " ",
  quot: '"',
  raquo: "»",
  rdquo: "”",
  rsquo: "’",
};

export class MonitorInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "MonitorInputError";
    this.status = status;
  }
}

function parseIpv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return null;
  return octets;
}

function isReservedIpv4(octets) {
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

export function canonicalizeTarget(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate) throw new MonitorInputError("A public HTTPS URL is required.");

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new MonitorInputError("Enter a complete public HTTPS URL.");
  }

  if (url.protocol !== "https:") {
    throw new MonitorInputError("Only HTTPS pages can be monitored.");
  }
  if (url.username || url.password) {
    throw new MonitorInputError("URLs containing credentials are not allowed.");
  }
  if (url.port && url.port !== "443") {
    throw new MonitorInputError("Custom network ports are not allowed.");
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "")
    .toLowerCase();
  if (!hostname || hostname.includes(":")) {
    throw new MonitorInputError("IP-literal and IPv6 targets are not supported.");
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data.ec2.internal" ||
    hostname.endsWith(".nip.io") ||
    hostname.endsWith(".sslip.io")
  ) {
    throw new MonitorInputError("Private and local network targets are not allowed.");
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4 && isReservedIpv4(ipv4)) {
    throw new MonitorInputError("Private and reserved IP targets are not allowed.");
  }

  url.hash = "";
  url.hostname = hostname;
  if (url.port === "443") url.port = "";
  return url.toString();
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
      const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(digits, radix);
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return HTML_ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

function cleanInline(value) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHtml(html) {
  const source = String(html ?? "");
  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanInline(titleMatch[1]) : "";

  let text = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, " ")
    .replace(/<(script|style|noscript|svg|template|canvas)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(address|article|aside|blockquote|div|dl|fieldset|figure|footer|form|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tr|ul)>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  text = decodeHtmlEntities(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter((line) => line.length >= 2)
    .filter((line, index, lines) => index === 0 || line !== lines[index - 1])
    .join("\n")
    .slice(0, MAX_NORMALIZED_CHARACTERS);

  if (!text) throw new MonitorInputError("The page did not expose monitorable HTML text.", 422);
  return { title, text };
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readLimitedBody(body, maxBytes) {
  if (!body) throw new MonitorInputError("The page returned an empty response.", 422);
  const reader = body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new MonitorInputError("The page is larger than the 1 MB preview limit.", 422);
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export async function fetchPageSnapshot(value, fetchImpl = fetch) {
  const sourceUrl = canonicalizeTarget(value);
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response;
    try {
      response = await fetchImpl(currentUrl, {
        redirect: "manual",
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9",
          "user-agent": "RivalTrace-Preview/0.1 (+https://www.yycore.ai)",
        },
      });
    } catch {
      throw new MonitorInputError("The page could not be reached from the monitor.", 422);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new MonitorInputError("The page returned an invalid redirect.", 422);
      if (redirectCount === MAX_REDIRECTS) {
        throw new MonitorInputError("The page exceeded the redirect limit.", 422);
      }
      currentUrl = canonicalizeTarget(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new MonitorInputError(`The page returned HTTP ${response.status}.`, 422);
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new MonitorInputError("The URL did not return an HTML page.", 422);
    }
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new MonitorInputError("The page is larger than the 1 MB preview limit.", 422);
    }

    const bytes = await readLimitedBody(response.body, MAX_RESPONSE_BYTES);
    const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const normalized = normalizeHtml(html);
    const finalUrl = canonicalizeTarget(response.url || currentUrl);
    return {
      sourceUrl,
      finalUrl,
      pageTitle: normalized.title || new URL(finalUrl).hostname,
      statusCode: response.status,
      byteLength: bytes.byteLength,
      normalizedText: normalized.text,
      contentHash: await sha256(normalized.text),
    };
  }

  throw new MonitorInputError("The page could not be captured.", 422);
}

function splitBlocks(text) {
  const blocks = [];
  for (const line of String(text).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 220) {
      blocks.push(trimmed);
      continue;
    }
    const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [trimmed];
    for (const sentence of sentences) {
      const clean = sentence.trim();
      if (clean.length >= 2) blocks.push(clean.slice(0, 500));
    }
  }
  return {
    blocks: blocks.slice(0, MAX_DIFF_BLOCKS),
    truncated: blocks.length > MAX_DIFF_BLOCKS,
  };
}

function classifyChange(added, removed) {
  const all = [...added, ...removed].join(" ").toLowerCase();
  if (/[$€£¥]|\b(price|pricing|plan|billed|billing|month|annual|seat|credit)\b/.test(all)) return "pricing";
  if (/\b(feature|release|launch|available|integration|api|model|version|changelog)\b/.test(all)) return "product";
  if (/\b(terms|privacy|policy|legal|agreement|retention|security)\b/.test(all)) return "policy";
  if (/\b(customer|position|platform|solution|team|enterprise|built for)\b/.test(all)) return "positioning";
  return "content";
}

export function diffSnapshots(previousText, currentText) {
  if (previousText === currentText) {
    return {
      changed: false,
      kind: "none",
      summary: "No normalized text change detected.",
      added: [],
      removed: [],
      omittedAdded: 0,
      omittedRemoved: 0,
      evidenceLimited: false,
    };
  }

  const beforeResult = splitBlocks(previousText);
  const afterResult = splitBlocks(currentText);
  const before = beforeResult.blocks;
  const after = afterResult.blocks;
  const matrix = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = before[i] === after[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const added = [];
  const removed = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      removed.push(before[i]);
      i += 1;
    } else {
      added.push(after[j]);
      j += 1;
    }
  }
  while (i < before.length) removed.push(before[i++]);
  while (j < after.length) added.push(after[j++]);

  if (
    added.length === 0 &&
    removed.length === 0 &&
    (beforeResult.truncated || afterResult.truncated)
  ) {
    return {
      changed: true,
      kind: "unclassified",
      summary: "Change detected outside the bounded evidence window; exact added and removed blocks are unavailable in this preview.",
      added: [],
      removed: [],
      omittedAdded: 0,
      omittedRemoved: 0,
      evidenceLimited: true,
    };
  }

  const kind = classifyChange(added, removed);
  const summary = `${added.length} added and ${removed.length} removed text block${added.length + removed.length === 1 ? "" : "s"}; classified as ${kind}.`;
  return {
    changed: true,
    kind,
    summary,
    added: added.slice(0, MAX_EVIDENCE_BLOCKS),
    removed: removed.slice(0, MAX_EVIDENCE_BLOCKS),
    omittedAdded: Math.max(0, added.length - MAX_EVIDENCE_BLOCKS),
    omittedRemoved: Math.max(0, removed.length - MAX_EVIDENCE_BLOCKS),
    evidenceLimited: false,
  };
}

export function publicMonitorError(error) {
  if (error instanceof MonitorInputError) {
    return { message: error.message, status: error.status };
  }
  const message = error instanceof Error ? error.message : "Unexpected monitor error";
  if (message.includes("UNIQUE constraint failed")) {
    return { message: "That exact page is already in this watchlist.", status: 409 };
  }
  if (message.includes("no such table")) {
    return { message: "The private preview database is still being prepared.", status: 503 };
  }
  return { message: "The monitor could not complete this check.", status: 500 };
}
