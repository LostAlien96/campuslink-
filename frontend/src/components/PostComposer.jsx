import { useState } from 'react';
import { posts as postsApi } from '../lib/api';

const POST_TYPES = [
  { value: 'progress',    label: '🔥 Progress',      placeholder: "What did you learn or build today? Even small wins count." },
  { value: 'question',    label: '🤔 Question',       placeholder: "Something you're stuck on? Ask your network." },
  { value: 'team_lookup', label: '🤝 Looking for team', placeholder: "Building something? Describe what skills you need." },
  { value: 'resource',    label: '💡 Resource',       placeholder: "Share something useful — a link, tip, or roadmap." },
];

export default function PostComposer({ onPost }) {
  const [type, setType]       = useState('progress');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);

  const selected = POST_TYPES.find(t => t.value === type);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const post = await postsApi.create({ type, content });
      setContent('');
      setOpen(false);
      onPost?.(post);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'var(--border)', border: 'none',
            borderRadius: 8, padding: '10px 14px',
            color: 'var(--muted)', fontSize: 13, cursor: 'text',
          }}
        >
          What are you working on today?
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Post type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POST_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setType(t.value)}
                style={{
                  padding: '4px 11px', borderRadius: 20, fontSize: 12,
                  border: '1px solid',
                  borderColor: type === t.value ? 'var(--accent)' : 'var(--border2)',
                  background: type === t.value ? 'var(--accent-dim)' : 'transparent',
                  color: type === t.value ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer', fontWeight: type === t.value ? 600 : 400,
                  transition: 'all .15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <textarea
            className="input"
            placeholder={selected.placeholder}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            maxLength={1000}
            autoFocus
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {content.length}/1000
            </span>
            <div style={{ display: 'flex', gap: 7 }}>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => { setOpen(false); setContent(''); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm"
                disabled={loading || !content.trim()}>
                {loading ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}