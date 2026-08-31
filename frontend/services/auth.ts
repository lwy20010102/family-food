import { ApiError, apiRequest } from "@/lib/api";
import type {
  AuthSessionResponse,
  LoginPayload,
  LogoutResponse,
  RegisterPayload,
  User,
} from "@/types/auth";

export async function registerUser(payload: RegisterPayload) {
  const response = await apiRequest<AuthSessionResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.user;
}

export async function loginUser(payload: LoginPayload) {
  const response = await apiRequest<AuthSessionResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.user;
}

export async function getCurrentUser() {
  try {
    return await apiRequest<User>("/api/v1/auth/me", {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logoutUser() {
  const response = await apiRequest<LogoutResponse>("/api/v1/auth/logout", {
    method: "POST",
  });

  return response.message;
}
