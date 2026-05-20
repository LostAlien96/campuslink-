// src/pages/Connections.jsx
import { useState, useEffect } from 'react';
import { connections as connectionsApi } from '../lib/api';
import SkillPill from '../components/SkillPill';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'received', label: 'Inbox' },
  { key: 'sent',     label: 'Sent' },
  { key: 'accepted', label: 'Connected' },
];

export default function Connections() {
  const [tab, setTab]       = useState('received');
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const data = await connectionsApi.mine(tab);
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function respond(id, status) {
    try {
      await connectionsApi.respond(id, status);
      setList(l => l.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 20 }}>Connections</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: tab === t.key ? 500 : 400,
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              background: 'transparent',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p>Nothing here yet.</p>
          {tab === 'received' && (
            <p style={{ fontSize: 12, marginTop: 6 }}>
              When someone connects with you, it'll show up here.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600, color: 'var(--accent)',
                flexShrink: 0,
              }}>
                {c.peer_name?.[0]?.toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Link to={`/users/${c.peer_id}`} style={{ fontWeight: 500, fontSize: 14 }}>
                      {c.peer_name}
                    </Link>
                    {c.peer_branch && (
                      <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
                        {c.peer_branch}
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Peer skills (shown in inbox) */}
                {c.peer_skills?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0' }}>
                    {c.peer_skills.slice(0, 3).map((s, i) => (
                      <SkillPill key={i} name={s.name} level={s.level} />
                    ))}
                  </div>
                )}

                {/* Message */}
                {c.message && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0', fontStyle: 'italic' }}>
                    "{c.message}"
                  </p>
                )}

                {/* Actions */}
                {tab === 'received' && c.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => respond(c.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => respond(c.id, 'rejected')}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {tab === 'sent' && (
                  <span style={{
                    fontSize: 11,
                    color: c.status === 'pending' ? 'var(--amber)' : c.status === 'accepted' ? 'var(--green)' : 'var(--muted)',
                    marginTop: 6,
                    display: 'block',
                  }}>
                    {c.status === 'pending' ? '⏳ Pending' : c.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
