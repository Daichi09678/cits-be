export type UserRole = "Super Admin" | "Editor";

export interface AdminPayload {
  sub: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  source?: "database" | "cache";
}
