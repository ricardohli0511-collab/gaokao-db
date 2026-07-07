'use client';

import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">高考数据库</h1>
          <p className="text-sm text-gray-500 mb-6">管理员登录</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
            管理后台仅在本地开发环境中可用
          </div>
          <Link href="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
