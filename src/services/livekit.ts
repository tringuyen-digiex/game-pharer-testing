import { api } from './api';

interface LiveKitTokenResponse {
  data:{
  token: string;
  }
}

export const getLiveKitToken = async (roomName: string, identity: string, name?: string): Promise<string> => {
  try {
    const params = new URLSearchParams({ 
        room: roomName,
        identity: identity,
    });
    if (name) params.append('name', name);

    // Using standard fetch pattern with GET
    const response = await api<LiveKitTokenResponse>(`/livekit/token?${params.toString()}`, {
      method: 'GET',
    });
    console.log("response", response);
    return response.data.token;
  } catch (error) {
    console.error('Failed to fetch LiveKit token:', error);
    throw error;
  }
};
