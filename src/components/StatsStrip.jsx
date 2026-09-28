const STAT_ITEMS = [
  ["total", "Signals", "Archive count"],
  ["pinned", "Pinned", "Priority channel"],
  ["favorites", "Favorites", "Return queue"],
  ["tags", "Topics", "Indexed tags"],
];

export const StatsStrip = ({ stats }) => (
  <section className="stats-strip" aria-label="Workspace overview">
    {STAT_ITEMS.map(([key, label, hint]) => (
      <div className="stat" key={key}>
        <strong>{stats[key]}</strong>
        <span>{label}</span>
        <small>{hint}</small>
      </div>
    ))}
  </section>
);
