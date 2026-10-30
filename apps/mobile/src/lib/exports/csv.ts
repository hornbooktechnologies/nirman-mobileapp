import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function shareCsv(csv: string, filename: string, title: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`);
  try {
    file.create(); file.write(csv);
    if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable.');
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: title });
  } finally { if (file.exists) file.delete(); }
}
