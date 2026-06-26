import { Link, useNavigate } from 'react-router-dom';

const metricCards = [
  {
    title: 'Health Score',
    value: '85',
    unit: '/100',
    change: '+5%',
    trending: 'trending_up',
    color: 'text-emerald-600',
    changeBg: 'bg-emerald-50',
    changeText: 'text-emerald-600',
    blurColor: 'bg-emerald-200',
  },
  {
    title: 'Risk Assessment',
    value: 'Low',
    unit: '',
    change: 'Stable',
    trending: 'horizontal_rule',
    color: 'text-blue-600',
    changeBg: 'bg-blue-50',
    changeText: 'text-blue-600',
    blurColor: 'bg-blue-200',
  },
  {
    title: 'Lifestyle Score',
    value: '92',
    unit: '/100',
    change: '+1%',
    trending: 'trending_up',
    color: 'text-violet-600',
    changeBg: 'bg-violet-50',
    changeText: 'text-violet-600',
    blurColor: 'bg-violet-200',
  },
  {
    title: 'Blood Health',
    value: 'Optimal',
    unit: '',
    change: '2 weeks ago',
    trending: 'science',
    color: 'text-amber-600',
    changeBg: 'bg-amber-50',
    changeText: 'text-amber-600',
    blurColor: 'bg-amber-200',
  },
];

const navLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Assessment', to: '/assessment/profile' },
  { label: 'Reports', to: '/report' },
  { label: 'Recommendations', to: '/recommended-tests' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden"
      style={{ backgroundColor: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#000f22" />
              <path
                d="M16 8C11.6 8 8 11.6 8 16s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm-1 12h-2v-2h2v2zm0-4h-2v-4h2v4zm4 4h-2v-4h2v4zm0-6h-2v-2h2v2z"
                fill="white"
              />
            </svg>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">HealthWise AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  link.label === 'Dashboard'
                    ? 'text-gray-900 border-b-2 border-gray-900 pb-1'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors hidden sm:block">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your Health Overview</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your health metrics and track your progress.
            </p>
          </div>
          <button
            onClick={() => navigate('/assessment/profile')}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Log New Data
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {metricCards.map((card) => (
            <div
              key={card.title}
              className="metric-card relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              {/* Decorative blurred circle */}
              <div
                className={`absolute -top-4 -right-4 h-24 w-24 rounded-full ${card.blurColor} opacity-20 blur-2xl`}
              ></div>

              <div className="relative z-10">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  {card.title}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
                  {card.unit && <span className="text-sm text-gray-400">{card.unit}</span>}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${card.changeBg} ${card.changeText}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{card.trending}</span>
                    {card.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Health Score Trend Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Health Score Trend</h2>
              <p className="text-sm text-gray-500">Your health score over the last 6 months</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                6M
              </button>
              <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
                1Y
              </button>
            </div>
          </div>

          <div className="relative w-full h-64">
            <svg viewBox="0 0 800 250" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="62" x2="800" y2="62" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="125" x2="800" y2="125" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="188" x2="800" y2="188" stroke="#f1f5f9" strokeWidth="1" />
              {/* Area fill */}
              <path
                d="M0,200 C80,180 160,160 240,140 C320,120 400,100 480,80 C560,60 640,50 720,40 L720,250 L0,250 Z"
                fill="url(#chartGradient)"
              />
              {/* Line */}
              <path
                d="M0,200 C80,180 160,160 240,140 C320,120 400,100 480,80 C560,60 640,50 720,40"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="0" cy="200" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
              <circle cx="144" cy="170" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
              <circle cx="288" cy="140" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
              <circle cx="432" cy="100" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
              <circle cx="576" cy="60" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
              <circle cx="720" cy="40" r="5" fill="#10B981" stroke="white" strokeWidth="2" />
            </svg>
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-400">
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <span className="text-sm font-semibold text-gray-900">
            &copy; 2024 HealthWise AI. Clinical use only.
          </span>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Clinical Disclaimers
            </a>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              System Status
            </a>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
