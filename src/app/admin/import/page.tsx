'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import * as XLSX from 'xlsx';

const SAMPLE_HEADERS = [
  '年份', '省份', '选科', '批次', '院校名称', '招生类型',
  '最低分', '平均分', '最低位次', '招生人数',
  '专业名称', '专业代码', '专业最低分', '专业平均分', '专业最高分',
];

const TEMPLATE_DATA = [
  ['2024', '广东', '物理类', '本科批', '华南理工大学', '统招', '620', '630', '9800', '3000', '计算机科学与技术', '080901', '628', '635', '648'],
  ['2024', '广东', '物理类', '本科批', '华南理工大学', '统招', '620', '630', '9800', '3000', '软件工程', '080902', '625', '632', '642'],
  ['2024', '广东', '物理类', '本科批', '中山大学', '统招', '635', '645', '5300', '2500', '', '', '', '', ''],
  ['2024', '北京', '不限', '本科批', '北京大学', '统招', '689', '695', '84', '200', '', '', '', '', ''],
];

function generateTemplateCSV(): string {
  let csv = SAMPLE_HEADERS.join(',') + '\n';
  for (const row of TEMPLATE_DATA) {
    csv += row.join(',') + '\n';
  }
  return csv;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated?: number;
  skipped: number;
  errors: string[];
}

function StepBadge({ num, label, active }: { num: number; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${active ? 'bg-blue-600' : 'bg-gray-300'}`}>
        {num}
      </span>
      <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStep(2);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError('文件中未找到工作表');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rows.length === 0) {
        setError('文件中没有数据');
        return;
      }

      const headers = Object.keys(rows[0] as object);
      const preview = rows.slice(0, 10).map((row) => {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          mapped[key] = String(value ?? '');
        }
        return mapped;
      });

      setPreviewHeaders(headers);
      setPreviewData(preview);
    } catch {
      setError('文件解析失败，请确认文件格式正确');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseFile(selectedFile);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) parseFile(droppedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    setError(null);
    setStep(3);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/import/csv', {
        method: 'POST',
        body: formData,
      });
      const data: ImportResult = await res.json();
      if (!res.ok || !data.success) {
        setError((data as unknown as { error: string }).error || '导入失败');
        return;
      }
      setResult(data);
    } catch {
      setError('网络错误，导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleTemplateDownload = () => {
    const csv = generateTemplateCSV();
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gaokao-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setPreviewHeaders([]);
    setResult(null);
    setError(null);
    setStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据导入与补录</h1>
        <div className="flex gap-3">
          <button
            onClick={handleTemplateDownload}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            下载补录模板
          </button>
          <a
            href="/api/admin/export?type=records"
            className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            导出已有数据
          </a>
          <a
            href="/admin/records"
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            手动补录 →
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-8 mb-8">
          <StepBadge num={1} label="准备文件" active={step >= 1} />
          <div className="flex-1 h-px bg-gray-200" />
          <StepBadge num={2} label="预览数据" active={step >= 2} />
          <div className="flex-1 h-px bg-gray-200" />
          <StepBadge num={3} label="开始导入" active={step >= 3} />
        </div>

        {step === 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-base font-semibold text-blue-900 mb-3">这个入口现在用于“小批量补录/修正”：</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h4 className="font-medium text-gray-900 mb-2">📋 手工补录院校线</h4>
                <p className="text-sm text-gray-500 mb-3">适合少量修正某年份某省份某院校的录取分数</p>
                <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600">
                  年份, 省份, 选科, 批次, 院校名称, 招生类型, 最低分, 平均分, 最低位次, 招生人数
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h4 className="font-medium text-gray-900 mb-2">📚 手工补录专业线</h4>
                <p className="text-sm text-gray-500 mb-3">在院校线基础上追加少量专业明细，自动走统一去重逻辑</p>
                <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600">
                  ...(以上字段), 专业名称, 专业代码, 专业最低分, 专业平均分, 专业最高分
                </div>
              </div>
            </div>

            <div className="text-sm text-blue-700 mb-0">
              <p className="font-medium mb-1">📌 提示：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>第一行为表头（列名），从第二行开始是数据</li>
                <li>列名支持中英文（年份/year、省份/province 均可识别）</li>
                <li>官方全量抓取请使用离线 ETL 脚本，不通过这个页面上传</li>
                <li>未知院校会按标准化名称自动新建，已存在院校会优先匹配</li>
                <li>重复录取记录会自动更新，专业明细也会按统一规则去重</li>
                <li>专业名称留空则仅补录院校层数据</li>
              </ul>
            </div>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-6 relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            {file ? (
              <>
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · {previewData.length > 0 ? `${previewData.length} 行预览数据` : '解析中...'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    点击选择文件或拖拽 CSV / Excel 文件到此处
                  </p>
                  <p className="text-gray-400 mt-1">
                    支持 .csv、.xlsx、.xls 格式
                  </p>
                </div>
                <span className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                  选择文件
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {previewData.length > 0 && step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              数据预览
              <span className="text-sm font-normal text-gray-400 ml-2">
                共 {previewData.length} 行（最多显示前 10 行）
              </span>
            </h2>
            <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 transition">
              重新选择
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2.5 text-left font-medium text-gray-400 border-b border-gray-200 w-10">#</th>
                  {previewHeaders.map((header) => (
                    <th key={header} className="px-3 py-2.5 text-left font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 border-b border-gray-100">{idx + 1}</td>
                    {previewHeaders.map((header) => (
                      <td key={header} className="px-3 py-2 text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-[180px] truncate">
                        {row[header] ?? <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  导入中...
                </span>
              ) : (
                '确认导入'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && importing && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 mb-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600">正在导入数据，请稍候...</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">导入结果</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="border border-green-200 bg-green-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-green-600">{result.imported}</p>
              <p className="text-sm font-medium text-green-700 mt-1">✅ 成功导入</p>
            </div>
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-orange-500">{result.skipped}</p>
              <p className="text-sm font-medium text-orange-700 mt-1">⚠️ 跳过</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-gray-700">{(result.updated ?? 0)}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">🔁 更新</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <details className="border border-gray-200 rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-red-600 cursor-pointer hover:bg-red-50 rounded-lg">
                ⚠️ 错误详情（{result.errors.length} 条）
              </summary>
              <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                <ul className="space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="text-xs text-red-600 py-1.5 border-b border-red-50 last:border-0">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={handleReset} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              继续导入
            </button>
            <a href="/admin/records" className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
              查看数据 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
