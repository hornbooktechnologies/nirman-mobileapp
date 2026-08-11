export interface ProfileRole {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  role: ProfileRole;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  avatar?: string | null;
}

export interface ChangePasswordInput {
  password: string;
}
