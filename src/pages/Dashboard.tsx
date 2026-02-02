import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { getWorkspaces, createWorkspace, type Workspace } from '../services/workspace';

interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [userData, workspacesData] = await Promise.all([
                    getCurrentUser(),
                    getWorkspaces()
                ]);
                setUser(userData);
                setWorkspaces(workspacesData);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        navigate('/login');
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) return;

        setCreating(true);
        try {
            const workspace = await createWorkspace(newWorkspaceName);
            setWorkspaces([...workspaces, workspace]);
            setNewWorkspaceName('');
        } catch (error) {
            console.error('Failed to create workspace:', error);
            alert('Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading...</div>;
    }

    return (
        <div style={{ 
            padding: '2rem', 
            color: 'white', 
            minHeight: '100vh',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dashboard</h1>
                    <p style={{ color: '#94a3b8' }}>
                        Welcome back, {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                    </p>
                </div>
                <button 
                    onClick={handleLogout}
                    style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Logout
                </button>
            </header>

            <section style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: '600' }}>Your Workspaces</h2>
                
                <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input 
                        type="text" 
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="New workspace name"
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
                        disabled={creating || !newWorkspaceName.trim()}
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            opacity: (creating || !newWorkspaceName.trim()) ? 0.7 : 1
                        }}>
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </form>

                {workspaces.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No workspaces found. Create one to get started!</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        {workspaces.map(ws => (
                            <Link to={`/workspace/${ws.id}`} key={ws.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ 
                                    padding: '1rem', 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                >
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{ws.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Created: {new Date(ws.createdAt).toLocaleDateString()}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
