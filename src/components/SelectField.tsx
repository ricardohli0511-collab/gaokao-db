interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  loading?: boolean;
  className?: string;
  selectClassName?: string;
  placeholder?: string;
}

export default function SelectField({ label, value, onChange, options, loading, className, selectClassName, placeholder }: SelectFieldProps) {
  if (loading) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
        <div className="w-full h-11 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white appearance-none cursor-pointer ${selectClassName || ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
