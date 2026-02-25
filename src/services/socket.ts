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
    private lastSnapshot: any[] | null = null;
    // Store listeners to re-attach on reconnection or if added before connection
    private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

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
            this.lastSnapshot = null;
        });

        this.socket.on('map:snapshot', (data: any[]) => {
            this.lastSnapshot = data;
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        // Debug: Log all incoming events
        this.socket.onAny((event, ...args) => {
            console.log(`[Socket IN] [${namespaceUrl}] [ID:${this.socket?.id}] ${event}:`, args);
        });

        // Re-attach all stored listeners
        this.eventListeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback);
            });
        });
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    getLastSnapshot(): any[] | null {
        return this.lastSnapshot;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.lastSnapshot = null;
        }
    }

    // Emit helpers
    emit(event: string, data: any) {
        if (this.socket) {
            console.log(`[Socket OUT] [ID:${this.socket.id}] ${event}:`, data);
            this.socket.emit(event, data);
        } else {
             console.warn(`[Socket OUT] Cannot emit ${event}, socket not connected.`);
        }
    }

    // Listener helpers
    on(event: string, callback: (...args: any[]) => void) {
        // 1. Store locally
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        const listeners = this.eventListeners.get(event);
        if (listeners && !listeners.includes(callback)) {
            listeners.push(callback);
        }

        // 2. Attach to socket if exists
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string, callback?: (...args: any[]) => void) {
        // 1. Remove locally
        if (callback) {
             const listeners = this.eventListeners.get(event);
             if (listeners) {
                 const index = listeners.indexOf(callback);
                 if (index !== -1) {
                     listeners.splice(index, 1);
                 }
             }
        } else {
             // Remove all for this event
             this.eventListeners.delete(event);
        }

        // 2. Remove from socket if exists
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
            } else {
                this.socket.off(event);
            }
        }
    }
}

export const socketService = new SocketService();
