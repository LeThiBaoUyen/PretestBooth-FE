const LIST_QUERY_STORAGE_PREFIX = "pretest:list-query:";

export type QueryValue = string | number | boolean | null | undefined;

export function buildQueryString(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    const stringValue = String(value).trim();
    if (!stringValue) return;

    params.set(key, stringValue);
  });

  return params.toString();
}

export function rememberListQuery(pathname: string, queryString: string) {
  if (typeof window === "undefined") return;

  const storageKey = `${LIST_QUERY_STORAGE_PREFIX}${pathname}`;

  if (!queryString) {
    window.sessionStorage.removeItem(storageKey);
    return;
  }

  window.sessionStorage.setItem(storageKey, queryString);
}

export function readRememberedListQuery(pathname: string): string {
  if (typeof window === "undefined") return "";

  return window.sessionStorage.getItem(`${LIST_QUERY_STORAGE_PREFIX}${pathname}`) || "";
}

export function buildPathWithRememberedQuery(pathname: string): string {
  const queryString = readRememberedListQuery(pathname);
  return queryString ? `${pathname}?${queryString}` : pathname;
}