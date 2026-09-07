// Helpers for the image <-> base64 data-URI tool. The actual file reading uses
// FileReader in the component; these are the pure bits.

export interface DataUri {
  mime: string;
  base64: string;
  bytes: number; // decoded byte length
}

export function parseDataUri(s: string): DataUri | null {
  const m = /^data:([^;,]*)(;charset=[^;,]*)?(;base64)?,(.*)$/is.exec(s.trim());
  if (!m) return null;
  const mime = m[1] || 'text/plain';
  const isB64 = !!m[3];
  let base64: string;
  let bytes: number;
  try {
    if (isB64) {
      base64 = m[4].replace(/\s/g, '');
      bytes = atob(base64).length;
    } else {
      const decoded = decodeURIComponent(m[4]);
      base64 = btoa(unescape(encodeURIComponent(decoded)));
      bytes = decoded.length;
    }
  } catch {
    return null;
  }
  return { mime, base64, bytes };
}

export function buildDataUri(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

export function imgTag(dataUri: string, alt = ''): string {
  return `<img src="${dataUri}" alt="${alt}" />`;
}

export function cssRule(dataUri: string): string {
  return `.element {\n  background-image: url("${dataUri}");\n}`;
}

export function cssBg(dataUri: string): string {
  return `background-image: url("${dataUri}");`;
}

export function markdown(dataUri: string, alt = 'image'): string {
  return `![${alt}](${dataUri})`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// base64 payload is ~4/3 of the raw bytes, plus the data: prefix
export function encodedSize(rawBytes: number, mime: string): number {
  const b64 = Math.ceil(rawBytes / 3) * 4;
  return `data:${mime};base64,`.length + b64;
}

export const OUTPUTS = ['Data URI', 'HTML <img>', 'CSS background', 'CSS rule', 'Markdown'] as const;
export type OutputKind = (typeof OUTPUTS)[number];

export function renderOutput(kind: OutputKind, dataUri: string, alt: string): string {
  switch (kind) {
    case 'Data URI':
      return dataUri;
    case 'HTML <img>':
      return imgTag(dataUri, alt);
    case 'CSS background':
      return cssBg(dataUri);
    case 'CSS rule':
      return cssRule(dataUri);
    case 'Markdown':
      return markdown(dataUri, alt || 'image');
  }
}
