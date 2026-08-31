export type User = {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthSessionResponse = {
  user: User;
};

export type LogoutResponse = {
  message: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
