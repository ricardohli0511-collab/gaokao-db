interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={`bg-white rounded-2xl border border-red-100 p-10 text-center shadow-sm ${className || ''}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-red-300">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-red-500 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer"
          style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-accent-light)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          重试
        </button>
      )}
    </div>
  );
}
