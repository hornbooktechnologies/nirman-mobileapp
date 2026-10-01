import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework, EncodingType, readAsStringAsync, writeAsStringAsync, deleteAsync } from 'expo-file-system/legacy';
import { appConfig } from '../../config';
import { ApiRequestError } from '../api';

/** Download API-generated PDF bytes into app cache; no client PDF rendering. */
export async function requestPdf(path: string, accessToken: string, signal?: AbortSignal): Promise<File> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, { signal, headers: { Accept: 'application/pdf', Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string }; code?: string; message?: string } | null;
    throw new ApiRequestError(body?.error?.message ?? body?.message ?? 'PDF export failed.', response.status, body?.error?.code ?? body?.code);
  }
  if (!response.headers.get('content-type')?.startsWith('application/pdf')) throw new Error('The server did not return a PDF.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (signal?.aborted) throw new Error('Cancelled');
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('The server returned an invalid PDF.');
  const name = /filename="([^"]+)"/i.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'report.pdf';
  const filename = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const file = new File(Paths.cache, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`);
  try { file.create(); file.write(bytes); return file; }
  catch (error) { if (file.exists) file.delete(); throw error; }
}

export async function shareExportPdf(file: File, title: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('PDF file sharing is unavailable on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}

/** Android's folder picker lets the user save to Downloads or another folder. */
export async function saveExportPdf(file: File): Promise<boolean> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;
  const base64 = await readAsStringAsync(file.uri, { encoding: EncodingType.Base64 });
  const uri = await StorageAccessFramework.createFileAsync(permission.directoryUri, file.name.replace(/^\d+-[a-z0-9]+-/, ''), 'application/pdf');
  try { await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 }); }
  catch (error) { await deleteAsync(uri, { idempotent: true }).catch(() => undefined); throw error; }
  return true;
}
