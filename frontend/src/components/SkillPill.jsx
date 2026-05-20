// src/components/SkillPill.jsx

const LEVEL_LABELS = {
  curious:  '○ curious',
  learning: '◑ learning',
  building: '◕ building',
  strong:   '● strong',
};

export default function SkillPill({ name, level }) {
  return (
    <span className={`skill-pill level-${level}`}>
      {name}
      <span style={{ opacity: .7, marginLeft: 3 }}>
        {LEVEL_LABELS[level] || level}
      </span>
    </span>
  );
}
