// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { to: '/discover',    label: 'Discover' },
  { to: '/connections', label: 'Connections' },
  { to: '/groups',      label: 'Groups' },
  { to: '/feed',        label: 'Feed' },
];
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 20px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/discover" style={{
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: '-.02em',
          color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 24, height: 24,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>C</span>
          CampusLink
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith(to) ? 500 : 400,
              color: pathname.startsWith(to) ? 'var(--text)' : 'var(--muted)',
              background: pathname.startsWith(to) ? 'var(--border)' : 'transparent',
              transition: 'all .15s',
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/profile" style={{
            fontSize: 13,
            color: 'var(--muted)',
            padding: '5px 12px',
            borderRadius: 8,
            transition: 'color .15s',
          }}>
            {user?.name?.split(' ')[0]}
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
