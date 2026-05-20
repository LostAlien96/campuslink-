// src/pages/Groups.jsx
import { useState, useEffect } from 'react';
import { groups as groupsApi } from '../lib/api';

export default function Groups() {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ name: '', purpose: '', type: 'open' });
  const [joinStatus, setJoinStatus] = useState({});  // groupId → status

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await groupsApi.browse();
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await groupsApi.create(form);
      setCreating(false);
      setForm({ name: '', purpose: '', type: 'open' });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function join(groupId) {
    try {
      const result = await groupsApi.join(groupId);
      setJoinStatus(s => ({ ...s, [groupId]: result.status }));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Groups</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Hackathon teams, study circles, project groups.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setCreating(v => !v)}
        >
          + New group
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 500, fontSize: 14, marginBottom: 14 }}>Create a group</h3>
          <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Group name</label>
              <input className="input" placeholder="e.g. Smart India Hackathon 2025 Team" required
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Purpose</label>
              <textarea className="input" placeholder="What are you building or doing together?"
                rows={2} value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="label">Visibility</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['open', 'closed'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12,
                      border: '1px solid',
                      borderColor: form.type === t ? 'var(--accent)' : 'var(--border2)',
                      background: form.type === t ? 'var(--accent-dim)' : 'transparent',
                      color: form.type === t ? 'var(--accent)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {t === 'open' ? '🔓 Open' : '🔒 Closed'}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                {form.type === 'open'
                  ? 'Anyone can join immediately.'
                  : 'Members need your approval to join.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit">Create</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <p>No open groups yet.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Create the first one!</p>
        </div>
      ) : (
        <div className="grid-2">
          {list.map(g => {
            const status = joinStatus[g.id];
            return (
              <div key={g.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      by {g.creator_name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500,
                    background: g.type === 'open' ? 'var(--green-dim)' : 'var(--accent-dim)',
                    color: g.type === 'open' ? 'var(--green)' : 'var(--accent)',
                  }}>
                    {g.type === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>

                {g.purpose && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {g.purpose.length > 100 ? g.purpose.slice(0, 100) + '…' : g.purpose}
                  </p>
                )}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 'auto',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                  </span>

                  {!status ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => join(g.id)}>
                      {g.type === 'open' ? 'Join' : 'Request to join'}
                    </button>
                  ) : (
                    <span style={{
                      fontSize: 12,
                      color: status === 'accepted' ? 'var(--green)' : 'var(--amber)',
                    }}>
                      {status === 'accepted' ? '✓ Joined' : '⏳ Requested'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
