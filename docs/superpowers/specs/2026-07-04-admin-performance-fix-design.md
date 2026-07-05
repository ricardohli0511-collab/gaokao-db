# 管理后台性能 + 实时管理修复 设计文档

## 概述

修复管理后台加载慢和无法实时感知操作结果的问题，共 5 个改动点。

## 当前状态

- **Turso 远程数据库延迟**：所有 SQL 查询走网络，每次 20-200ms
- **`/api/institutions/[id]` 冗余查询**：分页查询后再发一次全量 `historyRecords`，前端未使用
- **`createdAt` 无索引**：管理后台列表按 `createdAt DESC` 排序，全表扫描
- **管理后台无错误反馈**：`handleSave`/`handleDelete` 不检查 HTTP 状态码
- **手动录入与导入身份体系不一致**：手动 POST 不生成 `recordIdentityKey`

---

## Part A：性能优化

### 1. 移除 `/api/institutions/[id]` 冗余查询

**文件**：`src/app/api/institutions/[id]/route.ts`

**改动**：删除 L49-L52 的 `historyRecords` 查询。前端 `school/[id]/page.tsx` 从未使用 `historyRecords` 字段。

```diff
- const historyRecords = await prisma.admissionRecord.findMany({
-   where: { institutionId, ...(province ? { province } : {}), ...(subjectGroup ? { subjectGroup } : {}) },
-   orderBy: [{ year: 'asc' }, { minScore: 'desc' }],
- });

  return NextResponse.json({
    ...institution,
    records: admissionRecords,
    total,
-   historyRecords,
    _count: { records: total },
  });
```

**影响**：减少 1 次全量 DB 查询，`/school/[id]` 页面加载时间减少约 30-200ms。

### 2. 添加 `createdAt` 索引

**文件**：`prisma/schema.prisma`

**改动**：在 `AdmissionRecord` 模型上增加：

```prisma
@@index([createdAt])
```

然后运行 `npx prisma db push` 创建索引。

**注意**：Turso 云数据库 `prisma db push` 可能因写权限失败，需要手动在 Turso 控制台执行：
```sql
CREATE INDEX IF NOT EXISTS AdmissionRecord_createdAt_idx ON AdmissionRecord(createdAt);
```

**影响**：管理后台列表排序从全表扫描变成索引扫描，大幅提升翻页速度。

### 3. 精简 `/api/institutions/[id]` 返回字段

**文件**：`src/app/api/institutions/[id]/route.ts`

**改动**：`findMany` 的 `include: { majors: true }` 改为 `include: { majors: { select: { id: true, majorName: true, majorCode: true, minScore: true, avgScore: true, maxScore: true, minRank: true, enrollmentCount: true } } }`，减少不必要的字段传输。

---

## Part B：管理后台错误反馈

### 4. `handleSave` 增加 HTTP 状态码检查

**文件**：`src/app/admin/records/page.tsx`

**改动**：

```typescript
const handleSave = async () => {
  setSaving(true);
  const body = { /* 同上 */ };

  const res = editingRecord
    ? await fetch(`/api/admin/records/${editingRecord.id}`, { method: 'PUT', ... })
    : await fetch('/api/admin/records', { method: 'POST', ... });

  if (!res.ok) {
    alert('保存失败，请重试');
    setSaving(false);
    return;
  }

  setShowModal(false);
  setSaving(false);
  fetchRecords();
};
```

### 5. `handleDelete` 增加 HTTP 状态码检查

**文件**：`src/app/admin/records/page.tsx`

**改动**：同上述模式，`res.ok` 检查 + `alert` 提示。

---

## Part C：统一手动录入与导入身份体系

### 6. POST/PUT 时自动生成 `recordIdentityKey`

**文件**：`src/app/api/admin/records/route.ts` (POST) + `src/app/api/admin/records/[id]/route.ts` (PUT)

**改动**：

在 POST 接口中，创建 record 前生成 identity key：
```typescript
const recordIdentityKey = `${body.year}-${body.province}-${body.subjectGroup}-${body.batch}-${body.admissionType}-${body.institutionId}`;

const record = await prisma.admissionRecord.create({
  data: { ...body, recordIdentityKey },
  include: { institution: { select: { id: true, name: true } } },
});
```

在 PUT 接口中，同样重建 identity key：
```typescript
const recordIdentityKey = `${year}-${province}-${subjectGroup}-${batch}-${admissionType}-${institutionId}`;

const record = await prisma.admissionRecord.update({
  where: { id },
  data: { ...body, recordIdentityKey },
  include: { institution: { select: { id: true, name: true } } },
});
```

**影响**：手动录入的记录与 CSV 导入的记录使用相同身份体系，避免重复。

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/institutions/[id]/route.ts` | 修改 | 删除冗余 historyRecords 查询，精简 majors select |
| `src/app/admin/records/page.tsx` | 修改 | handleSave/handleDelete 增加错误反馈 |
| `src/app/api/admin/records/route.ts` | 修改 | POST 时生成 recordIdentityKey |
| `src/app/api/admin/records/[id]/route.ts` | 修改 | PUT 时重建 recordIdentityKey |
| `prisma/schema.prisma` | 修改 | 添加 createdAt 索引 |

## 不在此范围

- 切换为本地 SQLite 数据库（Turso 连接是基础设施配置）
- 添加 Redis/内存缓存层
- 重构整个 admin records 页面为乐观更新

## 验证步骤

1. `npm run lint` 0 error
2. `npm run build` 通过
3. 访问 `/school/1`，TTFB 比之前降低
4. 管理后台新增/编辑/删除记录，操作成功后可看到数据变化
5. 管理后台操作失败时弹出错误提示
6. 手动新增后查看 Turso，`recordIdentityKey` 字段有值
