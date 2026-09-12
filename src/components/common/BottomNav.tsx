import type { Route } from '../../hooks/useHashRoute';

interface BottomNavProps {
  current: Route;
  onNavigate: (route: Route) => void;
}

const ITEMS: { route: Route; label: string; icon: string }[] = [
  { route: 'home', label: 'Dashboard', icon: '🎯' },
  { route: 'history', label: 'History', icon: '🕘' },
  { route: 'settings', label: 'Settings', icon: '⚙️' }
];

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <a
          key={item.route}
          href={`#/${item.route}`}
          aria-current={current === item.route ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(item.route);
          }}
        >
          <span aria-hidden="true" style={{ marginRight: 4 }}>
            {item.icon}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
