export type ApiEnvelope<TData> = {
  readonly data: TData;
  readonly message?: string;
};

export type PaginatedResult<TItem> = {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
};
