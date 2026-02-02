import { api } from './api';

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
  };
}

export interface LoginResponse {
    id: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api<ApiResponse<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.data;
};

export const register = async (email: string, password: string, firstName?: string, lastName?: string): Promise<LoginResponse> => {
  const response = await api<ApiResponse<LoginResponse>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  return response.data;
};

export const getCurrentUser = async (): Promise<LoginResponse> => {
  const response = await api<ApiResponse<LoginResponse>>('/auth/me');
  return response.data;
};
