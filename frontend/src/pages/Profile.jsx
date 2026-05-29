import { useState, useEffect } from 'react';
import { users as usersApi, posts as postsApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import SkillPill from '../components/SkillPill';
import PostCard from '../components/PostCard';

const LEVELS = ['curious', 'learning', 'building', 'strong'];

const SOCIAL_FIELDS = [
  { key: 'github_url',   label: 'GitHub',    placeholder: 'https://github.com/username',        icon: '🐙' },
  { key: 'linkedin_url', label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/username',   icon: '💼' },
  { key: 'twitter_url',  label: 'Twitter/X', placeholder: 'https://twitter.com/username',       icon: '🐦' },
  { key: 'website_url',  label: 'Website',   placeholder: 'https://yoursite.com',               icon: '🌐' },
];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({});
  const [newSkill, setNewSkill]   = useState({ name: '', level: 'learning' });
  const [addingSkill, setAddingSkill] = useState(false);
  const [streak, setStreak]       = useState(0);
  const [myPosts, setMyPosts]     = useState([]);
  const [tab, setTab]             = useState('skills');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStreak();
      loadMyPosts();
    }
  }, [user]);

  async function loadProfile() {
    try {
      const data = await usersApi.me();
      setProfile(data);
      setForm({
        name: data.name || '',
        bio: data.bio || '',
        branch: data.branch || '',
        year: data.year || '',
        college: data.college || '',
        location: data.location || '',
        cgpa: data.cgpa || '',
        github_url:   data.github_url   || '',
        linkedin_url: data.linkedin_url || '',
        twitter_url:  data.twitter_url  || '',
        website_url:  data.website_url  || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStreak() {
    try {
      const data = await postsApi.getStreak(user.id);
      setStreak(data.streak);
    } catch (err) {}
  }

  async function loadMyPosts() {
    try {
      const data = await postsApi.feed();
      setMyPosts(data.filter(p => p.author_id === user.id));
    } catch (err) {}
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

  function handleDeletePost(postId) {
    setMyPosts(prev => prev.filter(p => p.id !== postId));
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>Loading…</div>;
  if (!profile) return null;

  const hasSocialLinks = SOCIAL_FIELDS.some(f => profile[f.key]);

  return (
    <div className="page" style={{ maxWidth: 640 }}>

      {/* ── Profile card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
            }}>
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{profile.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
                {[profile.branch, profile.year && `Year ${profile.year}`].filter(Boolean).join(' · ')}
              </div>
              {profile.college && (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                  🎓 {profile.college}
                </div>
              )}
              {profile.location && (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 1 }}>
                  📍 {profile.location}
                </div>
              )}
              {profile.cgpa && (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 1 }}>
                  📊 CGPA: {profile.cgpa}
                </div>
              )}
            </div>
          </div>

          {/* Streak + edit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {streak > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                borderRadius: 8, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span>🔥</span>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{streak}d</span>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(v => !v)}>
              {editing ? 'Cancel' : 'Edit profile'}
            </button>
          </div>
        </div>

        {profile.bio && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {hasSocialLinks && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {SOCIAL_FIELDS.map(f => profile[f.key] && (
              <a key={f.key} href={profile[f.key]} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12,
                  border: '1px solid var(--border2)',
                  color: 'var(--muted)', textDecoration: 'none',
                  transition: 'all .15s',
                }}>
                {f.icon} {f.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <form onSubmit={saveProfile} className="card" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Basic info
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input" rows={3}
              placeholder="What are you working on? What are you looking for?"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Branch</label>
              <input className="input" placeholder="CSE, ECE…" value={form.branch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                <option value="">—</option>
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">College</label>
              <input className="input" placeholder="Your college name" value={form.college}
                onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="City, State" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div style={{ maxWidth: 160 }}>
            <label className="label">CGPA (out of 10)</label>
            <input className="input" type="number" min="0" max="10" step="0.1"
              placeholder="e.g. 8.5" value={form.cgpa}
              onChange={e => setForm(f => ({ ...f, cgpa: e.target.value }))} />
          </div>

          <hr className="divider" />
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Social links
          </div>
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className="label">{f.icon} {f.label}</label>
              <input className="input" placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </div>
          ))}

          <button className="btn btn-primary btn-sm" type="submit"
            style={{ alignSelf: 'flex-start' }}>
            Save changes
          </button>
        </form>
      )}

      {/* ── Tabs: Skills / Posts ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        {[['skills', 'Skills'], ['posts', 'My Posts']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding: '8px 16px', fontSize: 13,
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? 'var(--text)' : 'var(--muted)',
              background: 'transparent', border: 'none',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Skills tab ── */}
      {tab === 'skills' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {profile.skills?.length || 0} skills
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddingSkill(v => !v)}>
              + Add skill
            </button>
          </div>

          {addingSkill && (
            <form onSubmit={addSkill} className="card"
              style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
              <button className="btn btn-ghost btn-sm" type="button"
                onClick={() => setAddingSkill(false)}>Cancel</button>
            </form>
          )}

          {profile.skills?.length === 0 && !addingSkill ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No skills added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {profile.skills?.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SkillPill name={s.name} level={s.level} />
                  <button onClick={() => removeSkill(s.id)}
                    style={{
                      background: 'none', color: 'var(--muted)',
                      fontSize: 14, lineHeight: 1, padding: '0 2px', cursor: 'pointer',
                    }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Posts tab ── */}
      {tab === 'posts' && (
        <div>
          {myPosts.length === 0 ? (
            <div className="empty-state">
              <p>You haven't posted anything yet.</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Go to the feed and share what you're working on.</p>
            </div>
          ) : (
            myPosts.map(post => (
              <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
            ))
          )}
        </div>
      )}
    </div>
  );
}