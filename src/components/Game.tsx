import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { socketService } from '../services/socket';

interface GameProps {
    mapId: string;
    width: number;
    height: number;
}

const TILE_SIZE = 32;

class MainScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private otherPlayers: Map<string, Phaser.GameObjects.Rectangle> = new Map();
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private mapWidth: number;
    private mapHeight: number;
    private lastEmitTime: number = 0;

    constructor() {
        super('MainScene');
        this.mapWidth = 20;
        this.mapHeight = 20;
    }

    init(data: { width: number; height: number }) {
        this.mapWidth = data.width;
        this.mapHeight = data.height;
    }

    create() {
        // Draw Grid
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333333, 1);
        
        for (let x = 0; x <= this.mapWidth * TILE_SIZE; x += TILE_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.mapHeight * TILE_SIZE);
        }

        for (let y = 0; y <= this.mapHeight * TILE_SIZE; y += TILE_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.mapWidth * TILE_SIZE, y);
        }
        graphics.strokePath();

        // Create Local Player
        const currentUserId = localStorage.getItem('userId') || 'default';
        const myColor = this.getPlayerColor(currentUserId);
        
        this.player = this.add.rectangle(
            TILE_SIZE * 5 + TILE_SIZE / 2, 
            TILE_SIZE * 5 + TILE_SIZE / 2, 
            TILE_SIZE * 0.8, 
            TILE_SIZE * 0.8, 
            myColor
        );
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);

        // World Bounds & Camera
        this.physics.world.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1.5);

        // Controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // --- Socket Listeners ---
        socketService.on('map:snapshot', (players: any[]) => {
            if (!this.sys) return; // Check if scene is active
            console.log('Map Snapshot:', players);
            this.otherPlayers.forEach((p) => p.destroy());
            this.otherPlayers.clear();

            if (Array.isArray(players)) {
                const currentUserId = localStorage.getItem('userId');
                console.log('Current user ID:', currentUserId);
                
                players.forEach((p) => {
                    console.log('Processing snapshot player:', p);
                    // Handle potential API differences (userId vs id)
                    const id = p.userId || p.id;
                    
                    // Skip the current user - don't render ourselves as "other player"
                    if (id === currentUserId) {
                        console.log('Skipping current user from snapshot');
                        return;
                    }
                    
                    // Handle missing coordinates - default to 0 if not found
                    const x = p.x ?? p.gridX ?? 0;
                    const y = p.y ?? p.gridY ?? 0;
                    
                    if (id) {
                        this.addOtherPlayer(id, x, y);
                    } else {
                        console.warn('Player object missing ID:', p);
                    }
                });
            }
        });

        socketService.on('player:joined', (data: { userId: string, x: number, y: number, [key: string]: any }) => {
            if (!this.sys) return;
            console.log('Player Joined:', data);
            
            // Skip if it's the current user joining (shouldn't happen but defensive)
            const currentUserId = localStorage.getItem('userId');
            if (data.userId === currentUserId) {
                console.log('Skipping self from player:joined event');
                return;
            }
            
            const x = data.x ?? data.gridX ?? 0;
            const y = data.y ?? data.gridY ?? 0;
            
            this.addOtherPlayer(data.userId, x, y);
        });

        socketService.on('player:left', (data: { userId: string }) => {
             if (!this.sys) return;
             console.log('Player Left:', data);
             this.removeOtherPlayer(data.userId);
        });

        socketService.on('player:moved', (data: { userId: string, x: number, y: number, [key: string]: any }) => {
            console.log('Player Moved:', data);
             if (!this.sys) return;
             const id = data.userId || data.id;
             // Check for coordinates in various formats
             const x = data.x ?? data.gridX;
             const y = data.y ?? data.gridY;
             
             console.log('Player Moved Event:', data, 'Extracted:', { id, x, y });

             if (id && x !== undefined && y !== undefined) {
                 this.updateOtherPlayer(id, x, y);
             }
        });

        socketService.on('proximity:update', (nearbyUserIds: string[]) => {
             if (!this.sys) return;
             console.log('Proximity Update:', nearbyUserIds);
        });
    }

    // Predefined color palette for players
    private readonly playerColors = [
        0xff6b6b, // Red
        0x4ecdc4, // Teal
        0xffe66d, // Yellow
        0x95e1d3, // Mint
        0xf38181, // Pink
        0xaa96da, // Purple
        0xfcbad3, // Light Pink
        0xa8dadc, // Light Blue
        0xffd93d, // Gold
        0x6bcf7f, // Green
        0xff8a5b, // Orange
        0x9b72aa, // Lavender
        0x88d8b0, // Sea Green
        0xffaaa5, // Coral
    ];

    // Generate a unique color for each player based on their ID
    private getPlayerColor(userId: string): number {
        // Use hash to select from predefined palette
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colorIndex = Math.abs(hash) % this.playerColors.length;
        console.log('colorIndex',this.playerColors[colorIndex])
        return this.playerColors[colorIndex];
    }

    addOtherPlayer(id: string, x: number, y: number) {
        if (!this.sys || !this.add || !this.sys.displayList) return; // Safety check for destroyed scene
        if (this.otherPlayers.has(id)) {
            console.log('Player already exists:', id);
            return;
        }

        // Sanitize coordinates (default to 5,5 if missing/invalid)
        const safeX = (typeof x === 'number' && !isNaN(x)) ? x : 5;
        const safeY = (typeof y === 'number' && !isNaN(y)) ? y : 5;
        
        console.log(`Adding other player ${id} at ${safeX},${safeY}`);

        try {
            const playerColor = this.getPlayerColor(id);
            const other = this.add.rectangle(
                safeX * TILE_SIZE + TILE_SIZE / 2, 
                safeY * TILE_SIZE + TILE_SIZE / 2, 
                TILE_SIZE * 0.8, 
                TILE_SIZE * 0.8, 
                playerColor
            );
            other.setDepth(10);
            this.otherPlayers.set(id, other);
            console.log('Created other player visual:', other);
        } catch (e) {
            console.warn('Failed to add other player:', e);
        }
    }

    removeOtherPlayer(id: string) {
        if (!this.sys) return;
        const other = this.otherPlayers.get(id);
        if (other) {
            other.destroy();
            this.otherPlayers.delete(id);
        }
    }

    updateOtherPlayer(id: string, x: number, y: number) {
        if (!this.sys) return;
        const other = this.otherPlayers.get(id);
        if (other) {
             console.log(`Moving player ${id} to ${x},${y}`);
             other.setPosition(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        } else {
             console.warn(`Could not find player ${id} to move`);
        }
    }

    update(time: number) {
        if (!this.cursors) return;
        
        const speed = 200;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        let moved = false;

        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            moved = true;
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            moved = true;
        }

        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            moved = true;
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            moved = true;
        }

        // Throttle emit to ~15 times a second (every 66ms)
        if (moved && time > this.lastEmitTime + 66) {
            const gridX = Math.floor(this.player.x / TILE_SIZE);
            const gridY = Math.floor(this.player.y / TILE_SIZE);
            
            socketService.emit('player:move-intent', { x: gridX, y: gridY });
            this.lastEmitTime = time;
        }
    }
}

const Game: React.FC<GameProps> = ({ mapId, width, height }) => {
    const gameContainer = useRef<HTMLDivElement>(null);
    const gameInstance = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!gameContainer.current) return;

        // Connect to socket
        const token = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId'); // Using token as userId for now per previous setup

        if (token && userId) {
            socketService.connect(token, userId);
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: gameContainer.current,
            width: '100%',
            height: '100%',
            backgroundColor: '#0f172a',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0, x: 0 },
                    debug: false
                }
            },
            scene: [MainScene],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        gameInstance.current = new Phaser.Game(config);

        // Pass data to scene
        gameInstance.current.scene.start('MainScene', { width, height });

        // Join Map Event
        const joinMap = () => {
             console.log('Emitting map:join for', mapId);
             socketService.emit('map:join', { 
                 mapId,
                 initialX: 5,
                 initialY: 5
             });
        };

        if (socketService.getSocket()?.connected) {
             joinMap();
        } else {
             socketService.on('connect', joinMap);
        }

        socketService.on('disconnect', () => {
             console.log('Socket disconnected. Reconnecting...');
        });

        // Error handling
        socketService.on('error', (err: any) => {
             console.error('Socket error', err);
        });

        return () => {
            console.log('Component unmounting - disconnecting from map:', mapId);
            
            // Remove listeners
            socketService.off('map:snapshot');
            socketService.off('player:joined');
            socketService.off('player:left');
            socketService.off('player:moved');
            socketService.off('proximity:update');
            socketService.off('connect');
            socketService.off('disconnect');
            socketService.off('error');

            gameInstance.current?.destroy(true);
            // Server will detect disconnect and broadcast player:left automatically
            socketService.disconnect();
        };
    }, [mapId]);

    return (
        <div ref={gameContainer} style={{ width: '100%', height: '100%' }} />
    );
};

export default Game;
