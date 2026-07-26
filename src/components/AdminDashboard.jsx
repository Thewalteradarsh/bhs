import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Users, Music, Clock, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlays: 0,
    recentPlays: []
  });

  const ADMIN_PASSWORD = 'hearadmin123'; // Simple client-side protection

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError('Incorrect password');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      // Get total users (count of user_sessions)
      const { count: usersCount, error: usersError } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      // Get total plays (count of track_plays)
      const { count: playsCount, error: playsError } = await supabase
        .from('track_plays')
        .select('*', { count: 'exact', head: true });
      if (playsError) throw playsError;

      // Get recent plays (last 50)
      const { data: recentPlays, error: recentError } = await supabase
        .from('track_plays')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(50);
      if (recentError) throw recentError;

      setStats({
        totalUsers: usersCount || 0,
        totalPlays: playsCount || 0,
        recentPlays: recentPlays || []
      });
      setError(null);
    } catch (err) {
      console.error('Admin fetch error:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.iconWrapper}>
            <Lock size={32} color="#10b981" />
          </div>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '24px' }}>Admin Dashboard</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="password" 
              placeholder="Enter passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '14px', margin: 0, textAlign: 'center' }}>{error}</p>}
            <button type="submit" style={styles.button}>Access</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.header}>
        <h1 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <Activity size={28} color="#10b981" /> Hear Analytics
        </h1>
        <button onClick={fetchData} style={styles.refreshButton}>
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#a1a1aa', textAlign: 'center', marginTop: '40px' }}>Loading analytics...</div>
      ) : error ? (
        <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      ) : (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statHeader}>
                <Users size={24} color="#60a5fa" />
                <span style={styles.statTitle}>Total Unique Users</span>
              </div>
              <div style={styles.statValue}>{stats.totalUsers.toLocaleString()}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statHeader}>
                <Music size={24} color="#f472b6" />
                <span style={styles.statTitle}>Total Songs Played</span>
              </div>
              <div style={styles.statValue}>{stats.totalPlays.toLocaleString()}</div>
            </div>
          </div>

          <h2 style={{ color: '#fff', marginTop: '40px', marginBottom: '20px' }}>Recent Activity (Last 50 Plays)</h2>
          
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Track Name</th>
                  <th style={styles.th}>Device ID</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPlays.map(play => (
                  <tr key={play.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa' }}>
                        <Clock size={14} /> 
                        {formatDistanceToNow(new Date(play.played_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td style={{...styles.td, color: '#fff', fontWeight: '500'}}>{play.track_name || 'Unknown Track'}</td>
                    <td style={{...styles.td, color: '#52525b', fontFamily: 'monospace'}}>{play.device_id.substring(0, 8)}...</td>
                  </tr>
                ))}
                {stats.recentPlays.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#a1a1aa' }}>No plays recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090b'
  },
  loginCard: {
    backgroundColor: '#18181b',
    padding: '40px',
    borderRadius: '16px',
    border: '1px solid #27272a',
    width: '100%',
    maxWidth: '400px'
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#10b98120',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto'
  },
  input: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none'
  },
  button: {
    backgroundColor: '#10b981',
    color: '#000',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  dashboardContainer: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px'
  },
  refreshButton: {
    backgroundColor: '#27272a',
    color: '#fff',
    border: '1px solid #3f3f46',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px'
  },
  statCard: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '24px'
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  statTitle: {
    color: '#a1a1aa',
    fontSize: '16px',
    fontWeight: '500'
  },
  statValue: {
    color: '#fff',
    fontSize: '36px',
    fontWeight: '700'
  },
  tableContainer: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '16px',
    color: '#a1a1aa',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '1px solid #27272a',
    backgroundColor: '#09090b50'
  },
  tr: {
    borderBottom: '1px solid #27272a'
  },
  td: {
    padding: '16px',
    fontSize: '14px'
  }
};
