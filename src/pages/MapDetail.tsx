import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { type Map } from '../services/map';
import Game from '../components/Game';

const MapDetail: React.FC = () => {
    const { mapId } = useParams<{ mapId: string }>();
    const location = useLocation();
    const [map, setMap] = useState<Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (location.state?.map) {
            setMap(location.state.map);
            setLoading(false);
        } else {
            setError('Map data not found. Please navigate from the dashboard.');
            setLoading(false);
        }
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
            margin: '0 auto'
        }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to={`/workspace/${map.workspaceId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>&larr; Back</Link>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{map.name}</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Size: {map.width}x{map.height} • ID: {map.id}
                    </p>
                </div>
            </header>

            <div style={{ 
                background: '#0f172a', 
                borderRadius: '16px', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                height: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <Game mapId={map.id} width={map.width} height={map.height} />
            </div>
        </div>
    );
};

export default MapDetail;
