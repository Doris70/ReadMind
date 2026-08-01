'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Network, Sprout, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Sprout },
  { href: '/timeline', label: '书迹轴', icon: BookOpen },
  { href: '/knowledge', label: '知识地图', icon: Network },
  { href: '/discover', label: '发现', icon: Compass },
  { href: '/persona', label: '月度人格', icon: User },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-paper-mist/80 backdrop-blur-md border-b border-line-soft/20">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-ink-deep tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-sprout-green/10 text-sprout-green font-medium'
                    : 'text-ink-soft hover:text-ink-deep hover:bg-paper-warm'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
