import { useState, useEffect } from 'react';
import { posts as postsApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';

export default function Feed() {
  const { user } = useAuth();
  const [feed, setFeed]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak]   = useState(0);

  useEffect(() => {
    loadFeed();
    loadStreak();
  }, []);

  async function loadFeed() {
    setLoading(true);
    try {
      const data = await postsApi.feed();
      setFeed(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStreak() {
    if (!user) return;
    try {
      const data = await postsApi.getStreak(user.id);
      setStreak(data.streak);
    } catch (err) {
      console.error(err);
    }
  }

  function handleNewPost(post) {
    setFeed(prev => [post, ...prev]);
    setStreak(prev => prev + 1); // optimistic streak bump
  }

  function handleDelete(postId) {
    setFeed(prev => prev.filter(p => p.id !== postId));
  }

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      {/* Streak banner */}
      {streak > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
              {streak} day streak
            </div>
            <div style={{ color: '#C7D2FE', fontSize: 12 }}>
              Keep posting to maintain it. You're building momentum.
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <PostComposer onPost={handleNewPost} />

      {/* Feed */}
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>
          Loading feed…
        </div>
      ) : feed.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Your feed is empty</p>
          <p style={{ fontSize: 13 }}>
            Connect with people to see their posts here.<br />
            Or be the first — post what you're working on.
          </p>
        </div>
      ) : (
        feed.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}