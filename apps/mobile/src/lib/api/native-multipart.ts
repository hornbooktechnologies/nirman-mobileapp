/** Native networking reads picker URIs directly instead of Expo File.bytes(). */
export function nativeMultipartRequest(
  url: string,
  init: RequestInit,
  headers: Headers,
) {
  return new Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const signal = init.signal;
    const abort = () => request.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    request.open(init.method ?? 'POST', url);
    headers.forEach((value, key) => {
      // Native networking supplies the multipart boundary.
      if (key.toLowerCase() !== 'content-type') request.setRequestHeader(key, value);
    });
    request.onload = () => {
      cleanup();
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        json: async () => JSON.parse(request.responseText) as unknown,
      });
    };
    request.onerror = () => { cleanup(); reject(new Error('Unable to upload. Check your connection and retry.')); };
    request.onabort = () => { cleanup(); reject(new Error('Upload cancelled')); };
    if (signal?.aborted) { reject(new Error('Upload cancelled')); return; }
    signal?.addEventListener('abort', abort, { once: true });
    request.send(init.body as FormData);
  });
}
