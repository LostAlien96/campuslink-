// src/pages/Discover.jsx
import { useState, useEffect } from 'react';
import { users as usersApi } from '../lib/api';
import UserCard from '../components/UserCard';

const SKILLS = ['React', 'Python', 'ML', 'DSA', 'UI Design', 'Node.js', 'Flutter', 'DevOps'];
const LEVELS = ['curious', 'learning', 'building', 'strong'];
const YEARS  = [1, 2, 3, 4];

export default function Discover() {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ skill: '', level: '', year: '' });

  useEffect(() => {
    load();
  }, [filters]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.skill) params.skill = filters.skill;
      if (filters.level) params.level = filters.level;
      if (filters.year)  params.year  = filters.year;
      const data = await usersApi.browse(params);
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: f[key] === val ? '' : val }));
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Discover people</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Find teammates, study partners, and co-founders on your campus.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {/* Skill filter */}
        <div>
          <span className="label">Filter by skill</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SKILLS.map(s => (
              <button key={s}
                onClick={() => setFilter('skill', s)}
                style={{
                  padding: '4px 11px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid',
                  borderColor: filters.skill === s ? 'var(--accent)' : 'var(--border2)',
                  background: filters.skill === s ? 'var(--accent-dim)' : 'transparent',
                  color: filters.skill === s ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Level filter */}
          <div>
            <span className="label">Level</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {LEVELS.map(l => (
                <button key={l}
                  onClick={() => setFilter('level', l)}
                  className={`skill-pill level-${l}`}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: filters.level === l ? 'currentColor' : 'transparent',
                    opacity: filters.level && filters.level !== l ? .5 : 1,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Year filter */}
          <div>
            <span className="label">Year</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {YEARS.map(y => (
                <button key={y}
                  onClick={() => setFilter('year', y)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    border: '1px solid',
                    borderColor: filters.year === y ? 'var(--accent)' : 'var(--border2)',
                    background: filters.year === y ? 'var(--accent-dim)' : 'transparent',
                    color: filters.year === y ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  Y{y}
                </button>
              ))}
            </div>
          </div>

          {/* Clear */}
          {(filters.skill || filters.level || filters.year) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => setFilters({ skill: '', level: '', year: '' })}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '40px 0' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <p>No students found with these filters.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Try removing a filter.</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>
            {list.length} student{list.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid-2">
            {list.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        </>
      )}
    </div>
  );
}
