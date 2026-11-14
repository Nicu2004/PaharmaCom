const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "azi, 10:30" / "mâine, 10:30" / "luni, 16 noi., 10:30" */
export function formatSlot(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (dayKey(d) === dayKey(today)) return `azi, ${time}`;
  if (dayKey(d) === dayKey(tomorrow)) return `mâine, ${time}`;
  const day = d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

/** Initials for the avatar fallback: "Dr. Ioana Pop" -> "IP" */
export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
