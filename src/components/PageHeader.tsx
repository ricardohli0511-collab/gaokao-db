import { ReactNode } from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  highlightChar?: string;
  size?: 'large' | 'medium';
  children?: ReactNode;
  bottomSlot?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  highlightChar,
  size = 'large',
  children,
  bottomSlot,
  backHref,
  backLabel = '返回首页',
}: PageHeaderProps) {
  const paddingClass = size === 'large' ? 'pt-20 pb-14' : 'pt-12 pb-10';
  const titleClass = size === 'large' ? 'text-5xl sm:text-6xl lg:text-7xl' : 'text-3xl sm:text-4xl';

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--brand-dark) 0%, var(--brand-mid) 50%, #0f3460 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, var(--brand-accent) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--brand-accent) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <header className={`relative ${paddingClass} px-4 text-center`}>
        <div className="max-w-4xl mx-auto">
          {backHref && (
            <div className="text-left mb-4">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                {backLabel}
              </Link>
            </div>
          )}
          <h1
            className={`[font-family:var(--font-serif)] font-black text-white tracking-tight mb-4 ${titleClass}`}
          >
            {highlightChar ? (
              <>
                <span style={{ color: 'var(--brand-accent)' }}>{highlightChar}</span>
                {title.slice(1)}
              </>
            ) : (
              title
            )}
          </h1>

          {subtitle && (
            <p className="text-lg sm:text-xl text-white/60 font-light max-w-xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}

          {children}
        </div>
      </header>

      {bottomSlot && (
        <div className="relative z-10 px-4 pb-6 sm:pb-8">
          <div className="max-w-6xl mx-auto">
            {bottomSlot}
          </div>
        </div>
      )}
    </div>
  );
}
