'use client';

import Link from 'next/link';

export default function AdminPlaceholder() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-lg">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-amber-800 mb-2">部署版本限制</h2>
      <p className="text-sm text-amber-700">
        此功能仅在本地开发环境（npm run dev）中可用。
      </p>
      <Link href="/admin" className="inline-block mt-4 text-sm text-brand-accent hover:underline">
        返回管理概览
      </Link>
    </div>
  );
}
