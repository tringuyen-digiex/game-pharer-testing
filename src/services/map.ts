import { api } from './api';

export interface Map {
  id: string;
  name: string;
  width: number;
  height: number;
  workspaceId: string;
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

export const getMaps = async (workspaceId: string): Promise<Map[]> => {
  const response = await api<ApiResponse<Map[]>>(`/maps?workspaceId=${workspaceId}`);
  return response.data;
};

export const createMap = async (workspaceId: string, name: string): Promise<Map> => {
  // Default values for map creation as per plan
  const defaultWidth = 20;
  const defaultHeight = 20;
  const defaultTileData = {}; 

  const response = await api<ApiResponse<Map>>('/maps', {
    method: 'POST',
    body: JSON.stringify({
      name,
      width: defaultWidth,
      height: defaultHeight,
      tileData: defaultTileData,
      workspaceId
    }),
  });
  return response.data;
};

export const getMap = async (id: string): Promise<Map> => {
  const response = await api<ApiResponse<Map>>(`/maps/${id}`);
  return response.data;
};
