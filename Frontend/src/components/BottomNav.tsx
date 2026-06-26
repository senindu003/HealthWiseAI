import { Link } from 'react-router-dom';

interface BottomNavProps {
  activeItem?: string;
}

const navItems = [
  { label: 'Home', icon: 'home', to: '/dashboard' },
  { label: 'Wizard', icon: 'auto_fix_high', to: '/assessment/profile' },
  { label: 'Reports', icon: 'description', to: '/report' },
  { label: 'AI Insights', icon: 'psychology', to: '#' },
];

export default function BottomNav({ activeItem }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-16 bg-surface shadow-lg rounded-t-xl md:hidden">
      {navItems.map((item) => {
        const isActive = activeItem === item.label;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`flex flex-col items-center justify-center transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-on-primary-container rounded-full px-4 py-1'
                : 'text-on-surface-variant scale-90'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-sm text-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
