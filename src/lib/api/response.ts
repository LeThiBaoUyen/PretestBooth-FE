export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function normalizeArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) {
    return input as T[];
  }

  if (
    input &&
    typeof input === "object" &&
    Array.isArray((input as { data?: unknown }).data)
  ) {
    return (input as { data: T[] }).data;
  }

  return [];
}

export function normalizePaginated<T>(
  input: unknown,
  defaults?: { page?: number; limit?: number },
): PaginatedResult<T> {
  const data = normalizeArray<T>(input);

  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const total = Number(source.total ?? data.length ?? 0);
  const page = Number(source.page ?? defaults?.page ?? 1);
  const limit = Number(source.limit ?? defaults?.limit ?? Math.max(data.length, 1));
  const totalPages = Number(
    source.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 0),
  );

  return { data, total, page, limit, totalPages };
}
