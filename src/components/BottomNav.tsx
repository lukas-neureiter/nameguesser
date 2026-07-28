import {
  BarChart3,
  BookOpen,
  House,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export type NavScreen = 'home' | 'settings' | 'stats' | 'people'

type BottomNavProps = {
  active: NavScreen
  onNavigate: (screen: NavScreen) => void
}

type NavItem = {
  id: NavScreen
  label: string
  icon: LucideIcon
}

const items: NavItem[] = [
  { id: 'home', label: 'Start', icon: House },
  { id: 'settings', label: 'Lernen', icon: BookOpen },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'people', label: 'Personen', icon: UsersRound },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav aria-label="Hauptnavigation" className="bottom-nav">
      <p className="desktop-brand">Namen lernen</p>
      <div className="nav-items grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={`nav-item flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon
                aria-hidden="true"
                size={23}
                strokeWidth={isActive ? 2.25 : 1.9}
              />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
