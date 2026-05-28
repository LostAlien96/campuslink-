import { useState } from 'react';
import { Link } from 'react-router-dom';
import { posts as postsApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const TYPE_LABELS = {
  progress:    { label: '🔥 Progress',         color: 'var(--green)',  bg: 'var(--green-dim)' },
  question:    { label: '🤔 Question',          color: 'var(--amber)',  bg: 'var(--amber-dim, #FEF3C7)' },
  team_lookup: { label: '🤝 Looking for team',  color: 'var(--accent)', bg: 'var(--accent-dim)' },
  resource:    { label: '💡 Resource',          color: '#8B5CF6',       bg: '#F5F3FF' },
};

const REACTIONS = [
  { type: 'respect',   emoji: '🔥', label: 'Respect'  },
  { type: 'relatable', emoji: '💡', label: 'Relatable' },
  { type: 'help',      emoji: '🤝', label: "I'll help" },
  { type: 'collab',    emoji: '⚡', label: 'Let\'s collab' },
];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [myReactions, setMyReactions]       = useState(post.my_reactions || []);
  const [showComments, setShowComments]     = useState(false);
  const [comments, setComments]             = useState(null);
  const [commentText, setCommentText]       = useState('');
  const [replyTo, setReplyTo]               = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const typeInfo = TYPE_LABELS[post.type] || TYPE_LABELS.progress;
  const isOwn = post.author_id === user?.id;

  async function toggleReaction(type) {
    try {
      const result = await postsApi.toggleReaction(post.id, type);
      setMyReactions(prev =>
        result.action === 'added'
          ? [...prev, type]
          : prev.filter(r => r !== type)
      );
      setReactionCounts(prev => ({
        ...prev,
        [type]: (prev[type] || 0) + (result.action === 'added' ? 1 : -1),
      }));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadComments() {
    if (comments) { setShowComments(v => !v); return; }
    setLoadingComments(true);
    setShowComments(true);
    try {
      const data = await postsApi.getComments(post.id);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function submitComment(e, parentId = null) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await postsApi.addComment(post.id, commentText, parentId);
      if (parentId) {
        setComments(prev => prev.map(cm =>
          cm.id === parentId
            ? { ...cm, replies: [...(cm.replies || []), c] }
            : cm
        ));
      } else {
        setComments(prev => [...(prev || []), { ...c, replies: [] }]);
      }
      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      alert(err.message);
    }
  }

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
          }}>
            {post.author_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <Link to={`/users/${post.author_id}`}
              style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
              {post.author_name}
            </Link>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {[post.author_branch, post.author_year && `Year ${post.author_year}`].filter(Boolean).join(' · ')}
              {' · '}{timeAgo(post.created_at)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
            background: typeInfo.bg, color: typeInfo.color,
          }}>
            {typeInfo.label}
          </span>
          {isOwn && (
            <button onClick={() => onDelete?.(post.id)}
              style={{ background: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>
        {post.content}
      </p>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {REACTIONS.map(r => {
          const count = reactionCounts[r.type] || 0;
          const active = myReactions.includes(r.type);
          return (
            <button key={r.type}
              onClick={() => toggleReaction(r.type)}
              title={r.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20, fontSize: 12,
                border: '1px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all .15s', fontWeight: active ? 600 : 400,
              }}
            >
              {r.emoji} {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Comment toggle */}
      <button onClick={loadComments}
        style={{
          background: 'none', border: 'none',
          color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
          padding: '4px 0',
        }}>
        💬 {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count !== 1 ? 's' : ''}` : 'Add a comment'}
      </button>

      {/* Comments section */}
      {showComments && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {loadingComments && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>}

          {comments?.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--border)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                }}>
                  {c.author_name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '7px 10px' }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{c.author_name}</span>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: '3px 0 0', lineHeight: 1.5 }}>
                      {c.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(c.created_at)}</span>
                    <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>
                      Reply
                    </button>
                  </div>

                  {/* Replies */}
                  {c.replies?.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: 'var(--border)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                      }}>
                        {r.author_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '6px 10px', flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{r.author_name}</span>
                        <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0' }}>{r.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply input */}
                  {replyTo === c.id && (
                    <form onSubmit={e => submitComment(e, c.id)}
                      style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 12 }}>
                      <input className="input" placeholder="Write a reply…" autoFocus
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        style={{ flex: 1, padding: '5px 10px' }} />
                      <button className="btn btn-primary btn-sm" type="submit">Reply</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* New comment input */}
          <form onSubmit={e => submitComment(e)}
            style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input className="input" placeholder="Write a comment…"
              value={replyTo ? '' : commentText}
              onChange={e => { setReplyTo(null); setCommentText(e.target.value); }}
              style={{ flex: 1, padding: '6px 10px' }} />
            <button className="btn btn-primary btn-sm" type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}