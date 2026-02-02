import { api } from './api';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta: {
    timestamp: string;
    path: string;
    method: string;
  };
}

export const getWorkspaces = async (): Promise<Workspace[]> => {
  const response = await api<ApiResponse<Workspace[]>>('/workspaces');
  return response.data;
};

export const createWorkspace = async (name: string): Promise<Workspace> => {
  const response = await api<ApiResponse<Workspace>>('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.data;
};
