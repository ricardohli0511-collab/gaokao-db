import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '智能推荐 - 升学数据库',
  description: '输入分数，一键获取冲刺/稳妥/保底院校推荐',
};

export default function RecommendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
