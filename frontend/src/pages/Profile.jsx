// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { users as usersApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import SkillPill from '../components/SkillPill';

const LEVELS = ['curious', 'learning', 'building', 'strong'];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'learning' });
  const [addingSkill, setAddingSkill] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      const data = await usersApi.getById(user.id);
      setProfile(data);
      setForm({ name: data.name, bio: data.bio || '', branch: data.branch || '', year: data.year || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const updated = await usersApi.updateMe(form);
      setProfile(p => ({ ...p, ...updated }));
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function addSkill(e) {
    e.preventDefault();
    if (!newSkill.name.trim()) return;
    try {
      const skill = await usersApi.addSkill(newSkill);
      setProfile(p => ({ ...p, skills: [...(p.skills || []), skill] }));
      setNewSkill({ name: '', level: 'learning' });
      setAddingSkill(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeSkill(skillId) {
    try {
      await usersApi.deleteSkill(skillId);
      setProfile(p => ({ ...p, skills: p.skills.filter(s => s.id !== skillId) }));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading…</div>;
  if (!profile) return null;

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600, fontSize: 18 }}>My Profile</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(v => !v)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={saveProfile} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input" rows={3} placeholder="What are you working on? What are you looking for?"
              value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Branch</label>
              <input className="input" placeholder="CSE, ECE, etc." value={form.branch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                <option value="">—</option>
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>
            Save changes
          </button>
        </form>
      ) : (
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
          }}>
            {profile.name[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
              {[profile.branch, profile.year && `Year ${profile.year}`].filter(Boolean).join(' · ')}
            </div>
            {profile.bio && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Skills section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="label" style={{ margin: 0 }}>Skills</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddingSkill(v => !v)}>
            + Add skill
          </button>
        </div>

        {addingSkill && (
          <form onSubmit={addSkill} className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <label className="label">Skill name</label>
              <input className="input" placeholder="React, ML, etc." autoFocus
                value={newSkill.name}
                onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label className="label">Level</label>
              <select className="input" value={newSkill.level}
                onChange={e => setNewSkill(s => ({ ...s, level: e.target.value }))}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-sm" type="submit">Add</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAddingSkill(false)}>Cancel</button>
          </form>
        )}

        {profile.skills?.length === 0 && !addingSkill && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No skills added yet.</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {profile.skills?.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SkillPill name={s.name} level={s.level} />
              <button
                onClick={() => removeSkill(s.id)}
                style={{
                  background: 'none', color: 'var(--muted)',
                  fontSize: 14, lineHeight: 1, padding: '0 2px',
                  cursor: 'pointer',
                }}
                title="Remove skill"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
