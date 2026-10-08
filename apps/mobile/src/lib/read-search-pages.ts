export async function readSearchPages<T, R extends { data: T[]; meta: { pageCount: number } }>(read: (page: number) => Promise<R>): Promise<R> {
  const first = await read(1);
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.pageCount; page += 1) rows.push(...(await read(page)).data);
  return { ...first, data: rows };
}
