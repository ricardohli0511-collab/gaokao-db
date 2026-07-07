'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="数据管理后台" highlightChar="管" subtitle="数据导入与管理 — 仅限本地开发环境使用" backHref="/" />
      <div className="flex-1 -mt-10 px-4 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-amber-800 mb-2">部署版本限制</h2>
            <p className="text-sm text-amber-700 mb-4">
              数据管理后台（数据导入、院校管理、录取记录编辑）仅在本地开发环境中可用。
            </p>
            <p className="text-xs text-amber-600">
              如需更新数据，请在本地运行 <code className="bg-amber-100 px-1.5 py-0.5 rounded">npm run dev</code> 后访问本地后台进行操作。
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-brand-accent hover:underline">返回首页</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
