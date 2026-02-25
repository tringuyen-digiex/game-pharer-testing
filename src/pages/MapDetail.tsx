import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getMap, type Map } from '../services/map';
import Game from '../components/Game';

import { LiveKitComponent } from '../components/LiveKitComponent';

const MapDetail: React.FC = () => {
    const { mapId } = useParams<{ mapId: string }>();
    const location = useLocation();
    const [map, setMap] = useState<Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMap = async () => {
            if (location.state?.map) {
                setMap(location.state.map);
                setLoading(false);
                return;
            }

            if (!mapId) {
                setError('Map ID is missing');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const data = await getMap(mapId);
                setMap(data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch map:', err);
                setError('Failed to load map data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchMap();
    }, [location.state, mapId]);

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading...</div>;
    }

    if (error || !map) {
        return (
            <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>
                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Map not found'}</p>
                <Link to="/dashboard" style={{ color: '#94a3b8' }}>Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '2rem', 
            color: 'white', 
            minHeight: '100vh',
            maxWidth: '1200px',
            margin: '0 auto',
            position: 'relative' // Ensure relative positioning for absolute children
        }}>
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <LiveKitComponent roomName={map.id} />
            <Game mapId={map.id} width={map.width} height={map.height} />
            <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                background: 'rgba(0,0,0,0.7)', 
                padding: '10px 20px', 
                borderRadius: '8px', 
                color: 'white',
                zIndex: 10
            }}>
                <h1 style={{ margin: 0, fontSize: '1.2rem' }}>{map.name}</h1>
                <Link to={`/workspace/${map.workspaceId}`} style={{ color: '#ccc', fontSize: '0.8rem', textDecoration: 'none' }}>
                    &larr; Back to Workspace
                </Link>
            </div>

        </div>
    );
        </div>
    );
};

export default MapDetail;
