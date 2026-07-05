'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';

interface Institution {
  id: number;
  name: string;
}

interface AdmissionRecord {
  id: number;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  institutionId: number;
  admissionType: string;
  groupCode: string | null;
  programmeName: string | null;
  minScore: number;
  avgScore: number | null;
  minRank: number | null;
  enrollmentCount: number | null;
  institution: Institution;
}

interface MajorRecord {
  id: number;
  admissionRecordId: number;
  majorName: string;
  majorCode: string | null;
  minScore: number;
  avgScore: number | null;
  maxScore: number | null;
  minRank: number | null;
  enrollmentCount: number | null;
}

interface RecordsResponse {
  data: AdmissionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const ADMISSION_TYPES = ['统招', '艺考', '体育', '强基', '综评', '保送', '考研', 'IB', 'A-Level', 'DSE'];

const defaultForm = {
  year: new Date().getFullYear(),
  province: '',
  subjectGroup: '',
  batch: '',
  institutionId: 0,
  admissionType: '统招',
  minScore: 0,
  avgScore: '',
  minRank: '',
  enrollmentCount: '',
};

const defaultMajorForm = {
  majorName: '',
  majorCode: '',
  minScore: 0,
  avgScore: '',
  maxScore: '',
  minRank: '',
  enrollmentCount: '',
};

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const [yearFilter, setYearFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdmissionRecord | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [majorsMap, setMajorsMap] = useState<Record<number, MajorRecord[]>>({});

  const [showMajorModal, setShowMajorModal] = useState(false);
  const [majorRecordId, setMajorRecordId] = useState<number | null>(null);
  const [majorForm, setMajorForm] = useState(defaultMajorForm);
  const [savingMajor, setSavingMajor] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/institutions')
      .then((r) => r.json())
      .then((json) => setInstitutions(json.data || []))
      .catch(() => console.error('获取院校列表失败'));
  }, []);

  const fetchRecords = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (yearFilter) params.set('year', yearFilter);
    if (provinceFilter) params.set('province', provinceFilter);
    if (institutionFilter) params.set('institutionId', institutionFilter);
    if (admissionTypeFilter) params.set('admissionType', admissionTypeFilter);

    fetch(`/api/admin/records?${params}`)
      .then((r) => {
        if (r.status === 401) {
          router.push('/admin/login');
          return { data: [], total: 0 };
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: RecordsResponse) => {
        setRecords(data.data || []);
        setTotal(data.total || 0);
      })
      .catch(() => console.error('获取记录列表失败'));
  }, [page, pageSize, yearFilter, provinceFilter, institutionFilter, admissionTypeFilter, router]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (record: AdmissionRecord) => {
    setEditingRecord(record);
    setForm({
      year: record.year,
      province: record.province,
      subjectGroup: record.subjectGroup,
      batch: record.batch,
      institutionId: record.institutionId,
      admissionType: record.admissionType,
      minScore: record.minScore,
      avgScore: record.avgScore != null ? String(record.avgScore) : '',
      minRank: record.minRank != null ? String(record.minRank) : '',
      enrollmentCount: record.enrollmentCount != null ? String(record.enrollmentCount) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const body = {
      year: form.year,
      province: form.province,
      subjectGroup: form.subjectGroup,
      batch: form.batch,
      institutionId: form.institutionId,
      admissionType: form.admissionType,
      minScore: form.minScore,
      avgScore: form.avgScore ? parseInt(form.avgScore) : undefined,
      minRank: form.minRank ? parseInt(form.minRank) : undefined,
      enrollmentCount: form.enrollmentCount ? parseInt(form.enrollmentCount) : undefined,
    };

    const res = editingRecord
      ? await fetch(`/api/admin/records/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/admin/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      alert('保存失败，请重试');
      setSaving(false);
      return;
    }

    setShowModal(false);
    setSaving(false);
    fetchRecords();
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/records/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('删除失败，请重试');
      return;
    }
    setDeleteConfirm(null);
    fetchRecords();
  };

  const toggleRow = async (recordId: number) => {
    const next = new Set(expandedRows);
    if (next.has(recordId)) {
      next.delete(recordId);
    } else {
      next.add(recordId);
      if (!majorsMap[recordId]) {
        const res = await fetch(`/api/admin/majors?admissionRecordId=${recordId}`);
        const majors = await res.json();
        setMajorsMap((prev) => ({ ...prev, [recordId]: majors }));
      }
    }
    setExpandedRows(next);
  };

  const openMajorCreate = (recordId: number) => {
    setMajorRecordId(recordId);
    setMajorForm(defaultMajorForm);
    setShowMajorModal(true);
  };

  const handleMajorSave = async () => {
    if (!majorRecordId) return;
    setSavingMajor(true);
    const body = {
      admissionRecordId: majorRecordId,
      majorName: majorForm.majorName,
      majorCode: majorForm.majorCode || undefined,
      minScore: majorForm.minScore,
      avgScore: majorForm.avgScore ? parseInt(majorForm.avgScore) : undefined,
      maxScore: majorForm.maxScore ? parseInt(majorForm.maxScore) : undefined,
      minRank: majorForm.minRank ? parseInt(majorForm.minRank) : undefined,
      enrollmentCount: majorForm.enrollmentCount ? parseInt(majorForm.enrollmentCount) : undefined,
    };

    await fetch('/api/admin/majors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setShowMajorModal(false);
    setSavingMajor(false);

    const res = await fetch(`/api/admin/majors?admissionRecordId=${majorRecordId}`);
    const majors = await res.json();
    setMajorsMap((prev) => ({ ...prev, [majorRecordId]: majors }));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">录取数据管理</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          新增记录
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="number"
            placeholder="年份"
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="省份"
            value={provinceFilter}
            onChange={(e) => { setProvinceFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={institutionFilter}
            onChange={(e) => { setInstitutionFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部院校</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <select
            value={admissionTypeFilter}
            onChange={(e) => { setAdmissionTypeFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部类型</option>
            {ADMISSION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => { setYearFilter(''); setProvinceFilter(''); setInstitutionFilter(''); setAdmissionTypeFilter(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            清除筛选
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">院校</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">年份</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">省份</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">科类</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">批次</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">专业组</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">课程名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">最低分</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">录取类型</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <Fragment key={record.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{record.institution?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{record.year}</td>
                  <td className="px-4 py-3 text-gray-900">{record.province}</td>
                  <td className="px-4 py-3 text-gray-900">{record.subjectGroup}</td>
                <td className="px-4 py-3 text-gray-900">{record.batch}</td>
                <td className="px-4 py-3 text-gray-900 font-mono text-xs">{record.groupCode || '-'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={record.programmeName || ''}>{record.programmeName || '-'}</td>
                <td className="px-4 py-3 text-gray-900">{record.minScore}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {record.admissionType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(record.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 transition"
                      >
                        {expandedRows.has(record.id) ? '收起' : '专业'}
                      </button>
                      <button
                        onClick={() => openEditModal(record)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(record.id)}
                        className="text-xs text-red-600 hover:text-red-800 transition"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(record.id) && (
                  <tr key={`expanded-${record.id}`}>
                    <td colSpan={8} className="px-4 py-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">专业记录</span>
                        <button
                          onClick={() => openMajorCreate(record.id)}
                          className="text-xs bg-green-600 text-white px-2.5 py-1 rounded hover:bg-green-700 transition"
                        >
                          新增专业
                        </button>
                      </div>
                      {majorsMap[record.id]?.length ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">专业名称</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">专业代码</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">最低分</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">平均分</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">最高分</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">最低排名</th>
                              <th className="text-left py-1.5 px-2 font-medium text-gray-500">录取人数</th>
                            </tr>
                          </thead>
                          <tbody>
                            {majorsMap[record.id].map((major) => (
                              <tr key={major.id} className="border-b border-gray-100">
                                <td className="py-1.5 px-2 text-gray-900">{major.majorName}</td>
                                <td className="py-1.5 px-2 text-gray-500">{major.majorCode ?? '-'}</td>
                                <td className="py-1.5 px-2 text-gray-900">{major.minScore}</td>
                                <td className="py-1.5 px-2 text-gray-900">{major.avgScore ?? '-'}</td>
                                <td className="py-1.5 px-2 text-gray-900">{major.maxScore ?? '-'}</td>
                                <td className="py-1.5 px-2 text-gray-900">{major.minRank ?? '-'}</td>
                                <td className="py-1.5 px-2 text-gray-900">{major.enrollmentCount ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-gray-400">暂无专业记录</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">共 {total} 条记录</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
            >
              上一页
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRecord ? '编辑记录' : '新增记录'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">院校</label>
                <select
                  value={form.institutionId}
                  onChange={(e) => setForm({ ...form, institutionId: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>请选择院校</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年份</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">科类</label>
                  <input
                    type="text"
                    value={form.subjectGroup}
                    onChange={(e) => setForm({ ...form, subjectGroup: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">批次</label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">录取类型</label>
                  <select
                    value={form.admissionType}
                    onChange={(e) => setForm({ ...form, admissionType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ADMISSION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低分</label>
                  <input
                    type="number"
                    value={form.minScore}
                    onChange={(e) => setForm({ ...form, minScore: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">平均分</label>
                  <input
                    type="number"
                    value={form.avgScore}
                    onChange={(e) => setForm({ ...form, avgScore: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低排名</label>
                  <input
                    type="number"
                    value={form.minRank}
                    onChange={(e) => setForm({ ...form, minRank: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">录取人数</label>
                  <input
                    type="number"
                    value={form.enrollmentCount}
                    onChange={(e) => setForm({ ...form, enrollmentCount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMajorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">新增专业</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">专业名称</label>
                <input
                  type="text"
                  value={majorForm.majorName}
                  onChange={(e) => setMajorForm({ ...majorForm, majorName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">专业代码</label>
                  <input
                    type="text"
                    value={majorForm.majorCode}
                    onChange={(e) => setMajorForm({ ...majorForm, majorCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低分</label>
                  <input
                    type="number"
                    value={majorForm.minScore}
                    onChange={(e) => setMajorForm({ ...majorForm, minScore: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">平均分</label>
                  <input
                    type="number"
                    value={majorForm.avgScore}
                    onChange={(e) => setMajorForm({ ...majorForm, avgScore: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高分</label>
                  <input
                    type="number"
                    value={majorForm.maxScore}
                    onChange={(e) => setMajorForm({ ...majorForm, maxScore: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低排名</label>
                  <input
                    type="number"
                    value={majorForm.minRank}
                    onChange={(e) => setMajorForm({ ...majorForm, minRank: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">录取人数</label>
                  <input
                    type="number"
                    value={majorForm.enrollmentCount}
                    onChange={(e) => setMajorForm({ ...majorForm, enrollmentCount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowMajorModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={handleMajorSave}
                disabled={savingMajor}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {savingMajor ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-6">确定要删除这条录取记录吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
