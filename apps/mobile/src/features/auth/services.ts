import { apiRequest } from '../../lib/api';

type ApiEnvelope<T> = { success: boolean; data: T };

export async function requestPasswordReset(email: string) {
  await apiRequest<ApiEnvelope<null>>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  await apiRequest<ApiEnvelope<null>>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  await apiRequest<ApiEnvelope<null>>(
    '/auth/change-password',
    {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    { accessToken },
  );
}
