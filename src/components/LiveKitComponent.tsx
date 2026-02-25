import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRemoteParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState, useRef } from "react";
import { Track } from "livekit-client";
import { getLiveKitToken } from "../services/livekit";
import { socketService } from "../services/socket";
import './LiveKitComponent.css';

interface LiveKitComponentProps {
  roomName: string;
}

// Maximum distance to hear audio (in tiles) - Users outside this radius are not audible.
const HEARING_RADIUS = 6;

export const LiveKitComponent = ({ roomName }: LiveKitComponentProps) => {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        // 1. Get user info
        const participantName = localStorage.getItem('username') || `Guest-${Date.now()}`;
        console.log('[LiveKitComponent] Getting token for:', roomName, participantName);

        // 2. Get token
        if (mounted) {
            // Use userId as identity, and participantName as display name
            const userId = localStorage.getItem('userId') || `guest-${Date.now()}`;
            const token = await getLiveKitToken(roomName, userId, participantName);
            
            console.log('[LiveKitComponent] Token received:', !!token);
            setToken(token);
        }
      } catch (e) {
        console.error('[LiveKitComponent] Token error:', e);
        if (mounted) setError("Failed to connect to media server");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [roomName]);

  if (error) return <div className="livekit-error" style={{ color: 'red', border: '1px solid red', padding: '10px' }}>Error: {error}</div>;
  if (loading) return <div className="livekit-loading" style={{ color: 'blue', border: '1px solid blue', padding: '10px' }}>Connecting to LiveKit...</div>;
  console.log("---------token", token)
  if (!token) return <div style={{ color: 'orange', border: '1px solid orange', padding: '10px' }}>Waiting for Token...</div>;

  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || "wss://your-livekit-server.com";
  console.log('[LiveKitComponent] Rendering LiveKitRoom with URL:', liveKitUrl);

  /* Container: Small "PIP" style window for video/controls.
     Positioned at bottom-right.
  */
  return (
    <div className="livekit-wrapper" style={{ 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        height: '250px', 
        width: '350px', 
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'auto', // Interactive
        zIndex: 100
    }}>
      <LiveKitRoom
        video={true}
        audio={true}
        connect={true}
        token={token}
        serverUrl={liveKitUrl}
        data-lk-theme="default"
        style={{ height: '100%', width: '100%', position: 'relative' }} 
        onConnected={() => console.log('LiveKit Connected')}
        onDisconnected={() => console.log('LiveKit Disconnected')}
        onError={(e) => console.error('LiveKit Error:', e)}
        onMediaDeviceFailure={(e) => console.error('LiveKit Media Device Failure:', e)}
      >
        <ProximityManager />
        
        {/* Video Conference: Display videos in grid within the small box */}
        <div style={{ height: 'calc(100% - 50px)', width: '100%' }}>
            <MyVideoConference />
        </div>
        
        <RoomAudioRenderer />
        
        {/* Control Bar: Compact at bottom of box */}
        <div style={{ 
            position: 'absolute', 
            bottom: 0, 
            width: '100%', 
            height: '50px',
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)'
        }}>
            {/* Override ControlBar styles via CSS or wrapper if needed, but default might fit */}
            <ControlBar controls={{ chat: false, screenShare: false, leave: false }} /> 
        </div>
      </LiveKitRoom>
    </div>
  );
};

// Component to handle proximity logic
function ProximityManager() {
  const participants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  
  // Store player positions: map userId -> {x, y}
  const playerPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
  const localPosition = useRef<{ x: number, y: number } | null>(null);
  
  // Track nearby participants from server (Source of Truth for Subscription)
  const nearbyParticipants = useRef<Set<string>>(new Set());

  const [audioEnabled, setAudioEnabled] = useState(true);

  // Function to process snapshot data
  const processSnapshot = (players: any[]) => {
      const currentUserId = localStorage.getItem('userId');
      playerPositions.current.clear();
      players.forEach(p => {
        const id = p.userId || p.id;
        const x = p.x ?? p.gridX ?? 0;
        const y = p.y ?? p.gridY ?? 0;
        
        if (id === currentUserId) {
          localPosition.current = { x, y };
        } else if (id) {
          playerPositions.current.set(id, { x, y });
        }
      });
      // Do not update volumes immediately on snapshot if we rely on proximity:update for list
      // But we can trigger a check
      updateVolumes();
  };

  useEffect(() => {
    // Current user ID for identification
    const currentUserId = localStorage.getItem('userId');

    // Check Audio Context state
    const checkAudioContext = () => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const tempContext = new AudioContext();
            if (tempContext.state === 'suspended') {
                setAudioEnabled(false);
            }
            tempContext.close();
        }
    };
    checkAudioContext();

    // 1. Check for cached snapshot immediately
    const cachedSnapshot = socketService.getLastSnapshot();
    if (cachedSnapshot) {
        console.log('[Proximity] Using cached snapshot:', cachedSnapshot);
        processSnapshot(cachedSnapshot);
    }

    // Socket event handlers
    const handleSnapshot = (players: any[]) => {
      console.log('[Proximity] Received snapshot event:', players);
      processSnapshot(players);
    };

    const handlePlayerJoined = (data: any) => {
      const id = data.userId || data.id;
      console.log(`[Proximity] Player Joined Event. Extracted ID: ${id}`, data);
      
      if (id === currentUserId) return;
      
      const x = data.x ?? data.gridX ?? 0;
      const y = data.y ?? data.gridY ?? 0;
      console.log("-----------------------")
      console.log("x: ", x);
      console.log("y: ",y)
      playerPositions.current.set(id, { x, y });
      // We don't subscribe immediately; we wait for proximity:update OR subscribe if server is slow?
      // Better to wait for server proximity event if strict.
      // But for responsiveness, maybe we check distance?
      // Let's stick to server proximity list if available.
      updateVolumes();
    };

    const handlePlayerMoved = (data: any) => {
      console.log("0000000000000000")
      console.log(data);
      console.log("0000000000000000")
      const id = data.userId || data.id;
      console.log(`[Proximity] Player Moved Event. Extracted ID: ${id}`);

      const x = data.x ?? data.gridX ?? 0;
      const y = data.y ?? data.gridY ?? 0;

      if (id === currentUserId) {
        localPosition.current = { x, y };
      } else if (id) {
        playerPositions.current.set(id, { x, y });
      }
      updateVolumes();
    };

    const handlePlayerLeft = (data: { userId: string }) => {
      console.log("--------------------")
      playerPositions.current.delete(data.userId);
      nearbyParticipants.current.delete(data.userId);
      updateVolumes(); // Will unsubscribe
    };

    const handleProximityUpdate = (nearbyUserIds: string[]) => {
      console.log("-----------------")
        console.log('[Proximity] Server update:', nearbyUserIds);
        nearbyParticipants.current = new Set(nearbyUserIds);
        updateVolumes();
    };

    // Attach listeners
    socketService.on('map:snapshot', handleSnapshot);
    socketService.on('player:joined', handlePlayerJoined);
    socketService.on('player:moved', handlePlayerMoved);
    socketService.on('player:left', handlePlayerLeft);
    socketService.on('proximity:update', handleProximityUpdate);

    return () => {
      socketService.off('map:snapshot', handleSnapshot);
      socketService.off('player:joined', handlePlayerJoined);
      socketService.off('player:moved', handlePlayerMoved);
      socketService.off('player:left', handlePlayerLeft);
      socketService.off('proximity:update', handleProximityUpdate);
    };
  }, [participants, localParticipant]);

  // Update volume and subscription for a specific participant
  const updateVolumeForParticipant = (userId: string) => {
    if (!localPosition.current) {
        console.warn(`[Proximity] Skipped update for ${userId}: Local position unknown`);
        return;
    }

    const participant = participants.find(p => {
        return p.identity === userId || p.identity.includes(userId);
    });

    if (participant) {
      let isNearby = false;
      let volume = 0;
      let distance = Infinity;

      // Calculate distance based on current positions
      console.log("PlayerPosition: ", playerPositions.current)
      const pos = playerPositions.current.get(userId);
      console.log(`[Proximity] Updating ${userId}. Local: ${JSON.stringify(localPosition.current)}, Remote: ${JSON.stringify(pos)}`);

      if (pos) {
          const dx = pos.x - localPosition.current.x;
          const dy = pos.y - localPosition.current.y;
          distance = Math.sqrt(dx * dx + dy * dy);
          isNearby = distance < HEARING_RADIUS;
          
          if (isNearby) {
            // volume = clamp(1 - distance / HEARING_RADIUS, 0, 1)
            volume = Math.max(0, Math.min(1, 1 - distance / HEARING_RADIUS));
          }
           console.log(`[Proximity] User: ${userId}, Dist: ${distance.toFixed(2)}, Nearby: ${isNearby}, Vol: ${volume.toFixed(2)}`);
      } else {
           console.log(`[Proximity] User: ${userId}, Position Valid?: No, Defaulting to not nearby`);
           isNearby = false;
      }

      if (isNearby) {
        // 1. Subscribe to audio tracks
        participant.audioTrackPublications.forEach((trackPub) => {
            if (!trackPub.isSubscribed) {
                // console.log(`[Proximity] Subscribing to audio for ${userId}`);
                try {
                    trackPub.setSubscribed(true);
                } catch (e) {
                    console.warn(`[Proximity] Failed to subscribe audio for ${userId}`, e);
                }
            }
        });

        // 2. Subscribe to video tracks
        participant.videoTrackPublications.forEach((trackPub) => {
            if (!trackPub.isSubscribed) {
                // console.log(`[Proximity] Subscribing to video for ${userId}`);
                try {
                    trackPub.setSubscribed(true);
                } catch (e) {
                    console.warn(`[Proximity] Failed to subscribe video for ${userId}`, e);
                }
            }
        });

        participant.setVolume(volume);

      } else {
        // Not nearby -> Unsubscribe
        
        // Unsubscribe from audio tracks
        participant.audioTrackPublications.forEach((trackPub) => {
            if (trackPub.isSubscribed) {
                // console.log(`[Proximity] Unsubscribing from audio for ${userId}`);
                try {
                    trackPub.setSubscribed(false);
                } catch (e) {
                    console.warn(`[Proximity] Failed to unsubscribe audio for ${userId}`, e);
                }
            }
        });

        // Unsubscribe from video tracks
        participant.videoTrackPublications.forEach((trackPub) => {
            if (trackPub.isSubscribed) {
                    // console.log(`[Proximity] Unsubscribing from video for ${userId}`);
                try {
                    trackPub.setSubscribed(false);
                } catch (e) {
                    console.warn(`[Proximity] Failed to unsubscribe video for ${userId}`, e);
                }
            }
        });

        participant.setVolume(0);
      }
    } else {
        console.warn(`[Proximity] Participant not found for userId: ${userId}`);
    }
  };

  const updateVolumes = () => {
    // If I moved, update everyone by checking their last known position
    // We iterate through all remote participants to ensure we cover everyone
    // console.log(`[Proximity] Updating volumes for ${participants.length} participants`);
    // console.log(`[Proximity] Known player positions:`, Array.from(playerPositions.current.keys()));
    
    participants.forEach(p => {
        let userId = p.identity;
        // console.log(`[Proximity] Processing participant: ${userId} (Identity)`);

        // Check if we have a position for this exact identity
        if (!playerPositions.current.has(userId)) {
             // Fallback: try to find a key in playerPositions that is contained in identity
             for (const key of playerPositions.current.keys()) {
                 if (userId.includes(key)) {
                     // console.log(`[Proximity] Matched partial identity: ${userId} contains ${key}`);
                     userId = key;
                     break;
                 }
             }
        }
        
        if (!playerPositions.current.has(userId)) {
            // console.warn(`[Proximity] No position found for user ${userId}. Defaulting to far away.`);
        }

        // Always update volume! If position is missing, it will default to 'not nearby' and unsubscribe.
        updateVolumeForParticipant(userId);
    });
  };

  if (audioEnabled) return null;

  return (
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
          <button onClick={() => {
              // Create a dummy context to resume everything
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              audioContext.resume().then(() => {
                  console.log('AudioContext resumed');
                  setAudioEnabled(true);
              });
          }} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⚠️ Click to Enable Audio
          </button>
      </div>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false }, // Removed placeholder to hide tile
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }, // Only show if subscribed (in range)
  );
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100% - var(--lk-control-bar-height))' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
