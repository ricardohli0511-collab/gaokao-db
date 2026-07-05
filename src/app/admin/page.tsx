import { prisma } from '@/lib/prisma';

export default async function AdminDashboardPage() {
  const [institutionCount, recordCount, provinceResult, latestRecord] = await Promise.all([
    prisma.institution.count(),
    prisma.admissionRecord.count(),
    prisma.institution.findMany({
      select: { province: true },
      distinct: ['province'],
    }),
    prisma.admissionRecord.findFirst({
      orderBy: { year: 'desc' },
      select: { year: true },
    }),
  ]);

  const provinceCount = provinceResult.length;
  const latestYear = latestRecord?.year ?? null;

  const stats = [
    { label: '院校总数', value: institutionCount, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: '录取记录', value: recordCount, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: '覆盖省份', value: provinceCount, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: '最新年份', value: latestYear ?? '-', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  ];

  const actions = [
    { href: '/admin/schools', label: '管理院校', description: '添加、编辑或删除院校信息' },
    { href: '/admin/records', label: '管理录取数据', description: '查看和编辑历年录取分数线' },
    { href: '/admin/import', label: '导入数据', description: '批量导入 Excel / CSV 数据' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据概览</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition"
          >
            <h3 className="font-semibold text-gray-900 mb-1">{action.label}</h3>
            <p className="text-sm text-gray-500">{action.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
