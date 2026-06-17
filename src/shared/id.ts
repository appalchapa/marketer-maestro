// Small id helper. crypto.randomUUID is available in Node 20+ and the browser.
export const newId = (prefix = "id"): string =>
  `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
