import { Platform } from "react-native";
import { File } from "expo-file-system";
import { apiRequest } from "./api";

export async function appendUploadFile(
  form: FormData,
  file: { uri: string; name: string; type: string },
) {
  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    if (!response.ok) throw new Error("Unable to read the selected file");
    form.append("file", await response.blob(), file.name);
  } else {
    const localFile = new File(file.uri);
    // Expo's fetch requires bytes(), while React Native's fetch uses uri.
    // Preserve the chosen filename/MIME for both transports without reading
    // the entire file into JS memory before the request is submitted.
    form.append("file", {
      ...file,
      bytes: () => localFile.bytes(),
    } as unknown as Blob);
  }
}

export async function multipartUpload<T>(
  path: string,
  token: string,
  body: FormData,
) {
  const response = await apiRequest<{
    success?: boolean;
    data?: T;
    message?: string;
  }>(path, { method: "POST", body }, { accessToken: token });
  if (!response || response.success === false || response.data == null) {
    throw new Error(
      response?.message ||
        "The server returned an invalid upload response. Please refresh before retrying.",
    );
  }
  return response.data;
}
