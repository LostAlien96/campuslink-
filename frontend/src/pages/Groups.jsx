import { useState, useEffect } from 'react';
import { groups as groupsApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function Groups() {
  const { user } = useAuth();
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [selected, setSelected]   = useState(null); // selected group detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm]           = useState({ name: '', purpose: '', type: 'open', whatsapp_link: '' });
  const [editForm, setEditForm]   = useState(null);
  const [joinStatus, setJoinStatus] = useState({});

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

  async function openGroup(groupId) {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const data = await groupsApi.getById(groupId);
      setSelected(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await groupsApi.create(form);
      setCreating(false);
      setForm({ name: '', purpose: '', type: 'open', whatsapp_link: '' });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function join(groupId) {
    try {
      const result = await groupsApi.join(groupId);
      setJoinStatus(s => ({ ...s, [groupId]: result.status }));
      if (selected?.id === groupId) {
        openGroup(groupId);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function respond(groupId, userId, status) {
    try {
      await groupsApi.respondMember(groupId, userId, status);
      openGroup(groupId); // refresh detail
    } catch (err) {
      alert(err.message);
    }
  }

  async function promote(groupId, userId) {
    try {
      await groupsApi.promoteMember(groupId, userId);
      openGroup(groupId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await groupsApi.update(selected.id, editForm);
      setEditForm(null);
      openGroup(selected.id);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Groups</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Hackathon teams, study circles, project groups.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(v => !v)}>
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
              <input className="input" placeholder="e.g. Smart India Hackathon Team" required
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Purpose</label>
              <textarea className="input" placeholder="What are you building or doing together?"
                rows={2} value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="label">WhatsApp Group Link (optional)</label>
              <input className="input" placeholder="https://chat.whatsapp.com/..."
                value={form.whatsapp_link}
                onChange={e => setForm(f => ({ ...f, whatsapp_link: e.target.value }))} />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Only visible to approved members.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit">Create</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: selected ? 'grid' : 'block', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        {/* Groups list */}
        <div>
          {loading ? (
            <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
              <p>No groups yet. Create the first one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.map(g => {
                const status = joinStatus[g.id];
                const isSelected = selected?.id === g.id;
                return (
                  <div key={g.id} className="card"
                    onClick={() => openGroup(g.id)}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500,
                        background: g.type === 'open' ? 'var(--green-dim)' : 'var(--accent-dim)',
                        color: g.type === 'open' ? 'var(--green)' : 'var(--accent)',
                      }}>
                        {g.type === 'open' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                      by {g.creator_name} · {g.member_count} member{g.member_count != 1 ? 's' : ''}
                    </div>
                    {g.purpose && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>
                        {g.purpose.length > 80 ? g.purpose.slice(0, 80) + '…' : g.purpose}
                      </p>
                    )}
                    <div onClick={e => e.stopPropagation()}>
                      {!status && g.creator_id !== user?.id && (
                        <button className="btn btn-ghost btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => join(g.id)}>
                          Request to join
                        </button>
                      )}
                      {status === 'pending' && (
                        <div style={{ fontSize: 12, color: 'var(--amber)', textAlign: 'center' }}>
                          ⏳ Request pending approval
                        </div>
                      )}
                      {status === 'accepted' && (
                        <div style={{ fontSize: 12, color: 'var(--green)', textAlign: 'center' }}>
                          ✓ Member
                        </div>
                      )}
                      {g.creator_id === user?.id && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>
                          👑 Your group
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group detail panel */}
        {(selected || loadingDetail) && (
          <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 70 }}>
            {loadingDetail ? (
              <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
            ) : selected && (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      by {selected.creator_name} · {selected.member_count} members
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    style={{ background: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>
                    ×
                  </button>
                </div>

                {selected.purpose && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                    {selected.purpose}
                  </p>
                )}

                {/* WhatsApp link — only for members */}
                {selected.isMember && selected.whatsapp_link && (
                  <a href={selected.whatsapp_link} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--green-dim)', color: 'var(--green)',
                      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                      fontSize: 13, fontWeight: 500, textDecoration: 'none',
                    }}>
                    💬 Join WhatsApp Group
                  </a>
                )}

                {/* Not a member notice */}
                {!selected.isMember && (
                  <div style={{
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                    fontSize: 12,
                  }}>
                    🔒 Join this group to see the WhatsApp link and member details.
                  </div>
                )}

                {/* Edit form (admin only) */}
                {selected.role === 'admin' && (
                  <div style={{ marginBottom: 14 }}>
                    {!editForm ? (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setEditForm({
                          name: selected.name,
                          purpose: selected.purpose || '',
                          whatsapp_link: selected.whatsapp_link || ''
                        })}>
                        ✏️ Edit group
                      </button>
                    ) : (
                      <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input className="input" placeholder="Group name"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        <textarea className="input" placeholder="Purpose" rows={2}
                          style={{ resize: 'vertical' }}
                          value={editForm.purpose}
                          onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} />
                        <input className="input" placeholder="WhatsApp link (https://chat.whatsapp.com/...)"
                          value={editForm.whatsapp_link}
                          onChange={e => setEditForm(f => ({ ...f, whatsapp_link: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" type="submit">Save</button>
                          <button className="btn btn-ghost btn-sm" type="button"
                            onClick={() => setEditForm(null)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <hr className="divider" />

                {/* Pending requests (admin only) */}
                {selected.role === 'admin' && selected.pendingRequests?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', marginBottom: 8 }}>
                      ⏳ Pending requests ({selected.pendingRequests.length})
                    </div>
                    {selected.pendingRequests.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.branch} · Year {p.year}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => respond(selected.id, p.id, 'accepted')}>
                            ✓
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => respond(selected.id, p.id, 'rejected')}>
                            ✗
                          </button>
                        </div>
                      </div>
                    ))}
                    <hr className="divider" />
                  </div>
                )}

                {/* Members list (visible to members only) */}
                {selected.isMember && selected.members?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
                      MEMBERS ({selected.members.length})
                    </div>
                    {selected.members.map(m => (
                      <div key={m.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</span>
                            {m.role === 'admin' && (
                              <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 10,
                                background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
                              }}>ADMIN</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.branch} · Year {m.year}</div>
                        </div>
                        {/* Promote button — only admin can promote, can't promote other admins */}
                        {selected.role === 'admin' && m.role !== 'admin' && m.id !== user?.id && (
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => promote(selected.id, m.id)}
                            title="Promote to admin">
                            ↑ Admin
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}