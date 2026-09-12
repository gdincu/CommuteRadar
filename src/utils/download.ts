/** Triggers a browser download for an in-memory Blob — no server round-trip needed. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Wraps a CSV field in quotes and escapes any embedded quotes, per RFC 4180. */
export function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
