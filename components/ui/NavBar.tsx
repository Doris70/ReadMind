'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Network, Settings2, Sprout, User } from 'lucide-react';

const navItems = [
  { href: '/home', label: '首页', icon: Sprout },
  { href: '/timeline', label: '书迹轴', icon: BookOpen },
  { href: '/knowledge', label: '知识地图', icon: Network },
  { href: '/discover', label: '发现', icon: Compass },
  { href: '/persona', label: '月度人格', icon: User },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="top-nav sticky top-0 z-50 border-b border-line-soft/20 bg-paper-mist/80 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/home" className="text-xl font-bold text-ink-deep tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
          ReadMind
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`top-nav-link flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${isActive ? 'is-active' : ''} ${
                  isActive
                    ? 'text-sprout-green font-medium'
                    : 'text-ink-soft hover:text-ink-deep'
                }`}
              >
                <Icon className="top-nav-icon h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/setup"
            className={`top-nav-link flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${pathname === '/setup' ? 'is-active' : ''} ${
              pathname === '/setup'
                ? 'font-medium text-sprout-green'
                : 'text-ink-soft hover:text-ink-deep'
            }`}
            title="数据设置"
          >
            <Settings2 className="top-nav-icon h-4 w-4" />
            <span className="hidden sm:inline">数据设置</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
