export default function Footer() {
  return (
    <footer className="border-t border-slate-100 py-8 mt-auto">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} 升学数据库 — 数据仅供参考，请以官方发布为准</p>
      </div>
    </footer>
  );
}
