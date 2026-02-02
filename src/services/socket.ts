import { io, Socket } from 'socket.io-client';

// Use the origin of the API URL for the socket connection to avoid attaching /api/v1 path
const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
        return new URL(apiUrl).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const SOCKET_URL = getSocketUrl();

class SocketService {
    private socket: Socket | null = null;

    connect(token: string, userId: string) {
        if (this.socket?.connected) return;

        // Namespace is /ws, so we append it to the base URL
        const namespaceUrl = `${SOCKET_URL}/ws`;

        this.socket = io(namespaceUrl, {
            auth: {
                token,
                userId
            },
            transports: ['websocket']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        // Debug: Log all incoming events
        this.socket.onAny((event, ...args) => {
            console.log(`[Socket IN] [${namespaceUrl}] [ID:${this.socket?.id}] ${event}:`, args);
        });
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Emit helpers
    emit(event: string, data: any) {
        if (this.socket) {
            console.log(`[Socket OUT] [ID:${this.socket.id}] ${event}:`, data);
            this.socket.emit(event, data);
        }
    }

    // Listener helpers
    on(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

export const socketService = new SocketService();
