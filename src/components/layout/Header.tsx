'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/research', label: 'IVF Explorer' },
  { href: '/share', label: 'Share Protocol' },
  { href: '/dashboard', label: 'Community Data' },
  { href: '/update', label: 'Update Outcomes' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl" role="img" aria-label="blossom">
              🌸
            </span>
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              IVF Project
            </span>
            <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
              Alpha
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <span className="mx-1 h-4 w-px bg-border/50" />
            <Link
              href="/support"
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/support'
                  ? 'bg-primary/10 text-primary'
                  : 'text-primary/80 hover:text-primary hover:bg-primary/5'
              )}
            >
              Support Us
            </Link>
          </div>

          {/* Mobile nav toggle */}
          <MobileNav pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="md:hidden">
      <details className="relative">
        <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-muted">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </summary>
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border p-2 z-50">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-border/50 mt-1 pt-1">
            <Link
              href="/support"
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                pathname === '/support'
                  ? 'bg-primary/10 text-primary'
                  : 'text-primary/80 hover:text-primary hover:bg-primary/5'
              )}
            >
              Support Us
            </Link>
            <a
              href="mailto:feedback@ivfproject.org"
              className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Feedback
            </a>
          </div>
        </div>
      </details>
    </div>
  );
}
