import { Link } from 'react-router-dom';

interface TopNavProps {
  activeLink?: string;
}

const navLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Assessment', to: '/assessment/profile' },
  { label: 'Recommendations', to: '/recommended-tests' },
  { label: 'Reports', to: '/report' },
  { label: 'History', to: '#' },
  { label: 'Insights', to: '#' },
];

export default function TopNav({ activeLink }: TopNavProps) {
  return (
    <header className="bg-surface shadow-sm flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-20 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          monitor_heart
        </span>
        <span className="font-headline-md text-headline-md font-bold text-primary hidden md:block">
          HealthWise AI
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive = activeLink === link.label;
          return (
            <Link
              key={link.label}
              to={link.to}
              className={`font-label-md text-label-md transition-colors ${
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary pb-1'
                  : 'text-text-secondary hover:text-primary'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <button className="scale-95 transition-transform duration-200 text-text-secondary hover:text-primary">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/30 bg-surface-container-highest" />
      </div>
    </header>
  );
}
