import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMaps, createMap, type Map } from '../services/map';
import { getWorkspaces, type Workspace } from '../services/workspace';

const WorkspaceDetail: React.FC = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [maps, setMaps] = useState<Map[]>([]);
    const [newMapName, setNewMapName] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!workspaceId) return;
            try {
                // Fetch maps and workspaces in parallel
                // ideally we would have a getWorkspaceById endpoint
                const [mapsData, workspacesData] = await Promise.all([
                    getMaps(workspaceId),
                    getWorkspaces() 
                ]);
                setMaps(mapsData);
                const currentWorkspace = workspacesData.find(w => w.id === workspaceId);
                if (currentWorkspace) {
                    setWorkspace(currentWorkspace);
                } else {
                    // Fallback or error if workspace not found in list
                    console.warn('Workspace not found in list');
                }
            } catch (error) {
                console.error('Failed to load workspace data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [workspaceId]);

    const handleCreateMap = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMapName.trim() || !workspaceId) return;

        setCreating(true);
        try {
            const newMap = await createMap(workspaceId, newMapName);
            setMaps([...maps, newMap]);
            setNewMapName('');
        } catch (error) {
            console.error('Failed to create map:', error);
            alert('Failed to create map');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading...</div>;
    }

    if (!workspace && !loading) {
         return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Workspace not found. <Link to="/dashboard">Go back</Link></div>;
    }

    return (
        <div style={{ 
            padding: '2rem', 
            color: 'white', 
            minHeight: '100vh',
            maxWidth: '1000px',
            margin: '0 auto'
        }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link to="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{workspace?.name} <span style={{fontSize: '1rem', fontWeight: 'normal', color: '#64748b'}}>({workspace?.id})</span></h1>
            </header>

            <section style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: '600' }}>Maps</h2>
                
                <form onSubmit={handleCreateMap} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input 
                        type="text" 
                        value={newMapName}
                        onChange={(e) => setNewMapName(e.target.value)}
                        placeholder="New map name"
                        style={{ 
                            flex: 1, 
                            padding: '0.75rem', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: 'white'
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={creating || !newMapName.trim()}
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            opacity: (creating || !newMapName.trim()) ? 0.7 : 1
                        }}>
                        {creating ? 'Creating...' : 'Create Map'}
                    </button>
                </form>

                {maps.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No maps found in this workspace.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                        {maps.map(map => (
                            <Link 
                                to={`/map/${map.id}`} 
                                state={{ map }}
                                key={map.id} 
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <div style={{ 
                                    padding: '1rem', 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                >
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{map.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Size: {map.width}x{map.height}</p>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Created: {new Date(map.createdAt).toLocaleDateString()}</p>
                                    <button style={{
                                        marginTop: 'auto',
                                        padding: '0.5rem',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(59, 130, 246, 0.4)',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}>Edit Map</button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default WorkspaceDetail;
