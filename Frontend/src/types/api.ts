// Generic API envelope shared by every backend endpoint (assessment sessions and auth alike).
// Mirrors Backend/.../common/response/ApiResponse.java + ApiError.java.

export interface ApiError {
  code: string;
  message: string;
  details: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}
