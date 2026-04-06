const PATH_PARAM_PATTERN = /:([A-Za-z0-9_]+)/g;

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | Record<string, QueryPrimitive | undefined> | undefined;

function isPlainRecord(value: unknown): value is Record<string, QueryPrimitive | undefined> {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function buildPath(template: string, params: Record<string, string>): string {
  return template.replace(PATH_PARAM_PATTERN, (_match, key: string) => {
    if (!Object.hasOwn(params, key)) {
      throw new Error(`Missing path parameter "${key}".`);
    }

    const value = params[key];
    if (typeof value !== "string") {
      throw new Error(`Missing path parameter "${key}".`);
    }

    return encodeURIComponent(value);
  });
}

function buildQuery(params: Record<string, QueryValue>): string {
  const entries: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    appendQueryEntries(entries, key, value);
  }

  return entries.length > 0 ? `?${entries.join("&")}` : "";
}

/**
 * Builds a request URL from a trusted template plus optional path/query params.
 *
 * Handlers should prefer this over manual string interpolation so path segments
 * and query values are encoded consistently in one place. Callers are expected
 * to use this from the normal `wrapHandler()` execution path, where
 * `sanitizeParams()` performs field-aware input sanitization and validation
 * before any transport call is made.
 */
export function buildUrl(
  template: string,
  options?: {
    path?: Record<string, string>;
    query?: Record<string, QueryValue>;
  },
): string {
  const path = options?.path ? buildPath(template, options.path) : template;
  const query = options?.query ? buildQuery(options.query) : "";
  return `${path}${query}`;
}

function appendQueryEntries(entries: string[], key: string, value: QueryValue): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    return;
  }

  if (!isPlainRecord(value)) {
    throw new Error(`Invalid query parameter "${key}". Expected a plain object.`);
  }

  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) {
      continue;
    }

    if (
      typeof nestedValue !== "string" &&
      typeof nestedValue !== "number" &&
      typeof nestedValue !== "boolean"
    ) {
      throw new Error(`Invalid query parameter "${key}[${nestedKey}]".`);
    }

    entries.push(
      `${encodeURIComponent(`${key}[${nestedKey}]`)}=${encodeURIComponent(String(nestedValue))}`,
    );
  }
}
