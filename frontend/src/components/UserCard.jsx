// src/components/UserCard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { connections as connectionsApi } from '../lib/api';
import SkillPill from './SkillPill';

export default function UserCard({ user }) {
  const [status, setStatus]   = useState(user.connectionStatus?.status || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showMsg, setShowMsg] = useState(false);

  async function sendRequest() {
    if (!message.trim()) { setShowMsg(true); return; }
    setLoading(true);
    try {
      await connectionsApi.send({ receiverId: user.id, message });
      setStatus('pending');
      setShowMsg(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const yearLabel = user.year ? `Year ${user.year}` : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/users/${user.id}`} style={{ fontWeight: 600, fontSize: 15 }}>
            {user.name}
          </Link>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
            {[user.branch, yearLabel].filter(Boolean).join(' · ')}
          </div>
        </div>
        {/* Avatar placeholder */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600, color: 'var(--accent)',
          flexShrink: 0,
        }}>
          {user.name[0].toUpperCase()}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          {user.bio.length > 80 ? user.bio.slice(0, 80) + '…' : user.bio}
        </p>
      )}

      {/* Skills */}
      {user.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {user.skills.slice(0, 4).map((s, i) => (
            <SkillPill key={i} name={s.name} level={s.level} />
          ))}
          {user.skills.length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
              +{user.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Connect action */}
      <div style={{ marginTop: 'auto' }}>
        {!status && !showMsg && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowMsg(true)}
          >
            Connect
          </button>
        )}

        {showMsg && !status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <input
              className="input"
              placeholder="Add a short message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={200}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={sendRequest}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowMsg(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '5px 0' }}>
            Request sent ✓
          </div>
        )}
        {status === 'accepted' && (
          <div style={{ fontSize: 12, color: 'var(--green)', textAlign: 'center', padding: '5px 0' }}>
            Connected ✓
          </div>
        )}
      </div>
    </div>
  );
}
