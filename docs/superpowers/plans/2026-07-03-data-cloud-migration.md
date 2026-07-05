# 数据批量导入 & 云迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 批量导入 data/raw/ 下所有 Excel 到本地 SQLite，验证后迁移到 Turso 云数据库，清理本地文件。

**Architecture:** 批量脚本复用 `src/lib/import/` 中已有的 upsert/清洗逻辑。Turso 迁移用 `sqlite3 .dump` 导出 + `turso db shell` 导入，Prisma 客户端无需改动（已使用 `@prisma/adapter-libsql`）。

**Tech Stack:** tsx, xlsx, sqlite3 CLI, Turso CLI, @libsql/client, Prisma

---

## 文件结构总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/import-all.ts` | 创建 | 批量导入脚本 |
| `.gitignore` | 修改 | 加入 dev.db、data/、dump.sql |
| `dev.db` | 删除 | 迁移云后删除 |
| `data/raw/` | 删除 | 导入成功后删除 |
| `dump.sql` | 临时 | 迁移用中转文件 |

---

### Task 1: 创建批量导入脚本

**Files:**
- Create: `scripts/import-all.ts`

- [ ] **Step 1: 创建 scripts/import-all.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { createRowHash, normalizeAdmissionType, normalizeInstitutionName, normalizeNumberLike } from '../src/lib/import/normalize';
import { upsertAdmissionBundle } from '../src/lib/import/upsert';
import type { NormalizedAdmissionRecord } from '../src/lib/import/types';

const COLUMN_ALIASES: Record<string, string> = {
  'year': 'year', '年份': 'year', '年': 'year',
  'province': 'province', '省份': 'province', '省': 'province', '招生省份': 'province', '地区': 'province',
  'subjectGroup': 'subjectGroup', '选科': 'subjectGroup', '科类': 'subjectGroup',
  '文理科': 'subjectGroup', '选科组合': 'subjectGroup', '选考科目': 'subjectGroup',
  'batch': 'batch', '批次': 'batch', '录取批次': 'batch', '招生批次': 'batch',
  'institutionName': 'institutionName', '院校名称': 'institutionName',
  '学校名称': 'institutionName', '学校': 'institutionName', '院校': 'institutionName',
  '大学': 'institutionName', '高校': 'institutionName', '校名': 'institutionName',
  'admissionType': 'admissionType', '招生类型': 'admissionType', '录取类型': 'admissionType',
  '招生类别': 'admissionType', '类型': 'admissionType',
  'minScore': 'minScore', '最低分': 'minScore', '最低录取分': 'minScore', '分数线': 'minScore',
  'avgScore': 'avgScore', '平均分': 'avgScore',
  'minRank': 'minRank', '最低位次': 'minRank', '位次': 'minRank', '排名': 'minRank',
  '最低排名': 'minRank', '省排名': 'minRank',
  'enrollmentCount': 'enrollmentCount', '招生人数': 'enrollmentCount',
  '招生计划': 'enrollmentCount', '人数': 'enrollmentCount', '计划数': 'enrollmentCount',
  'majorName': 'majorName', '专业名称': 'majorName', '专业': 'majorName',
  'majorCode': 'majorCode', '专业代码': 'majorCode',
  'majorMinScore': 'majorMinScore', '专业最低分': 'majorMinScore',
  'majorAvgScore': 'majorAvgScore', '专业平均分': 'majorAvgScore',
  'majorMaxScore': 'majorMaxScore', '专业最高分': 'majorMaxScore',
};

function mapRow(raw: Record<string, unknown>): Record<string, string | undefined> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const trimmedKey = key.trim();
    const normalizedKey = COLUMN_ALIASES[trimmedKey] ?? COLUMN_ALIASES[trimmedKey.toLowerCase()];
    if (normalizedKey) {
      mapped[normalizedKey] = String(value ?? '').trim();
    }
  }
  return mapped;
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(xlsx?|xls)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

async function importFile(filePath: string): Promise<{ file: string; imported: number; updated: number; skipped: number }> {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  const admissions: NormalizedAdmissionRecord[] = [];

  for (const [index, row] of rows.entries()) {
    const m = mapRow(row);

    const year = parseInt(m.year || '0', 10);
    const province = m.province || '';
    const institutionName = normalizeInstitutionName(m.institutionName || '');
    const subjectGroup = m.subjectGroup || '综合';
    const batch = m.batch || '本科批';
    const minScore = normalizeNumberLike(m.minScore);
    const avgScore = normalizeNumberLike(m.avgScore);
    const minRank = normalizeNumberLike(m.minRank);
    const enrollmentCount = normalizeNumberLike(m.enrollmentCount);

    if (!year || !province || !institutionName || minScore === null) {
      console.warn(`  [跳过] 第${index + 2}行: 缺少必要字段 (year=${year}, province=${province}, institutionName=${institutionName}, minScore=${minScore})`);
      continue;
    }

    const admissionType = normalizeAdmissionType(m.admissionType);
    const rawRowHash = createRowHash(row);

    admissions.push({
      year,
      province,
      subjectGroup,
      batch,
      admissionType,
      granularity: 'institution',
      rawInstitutionName: institutionName,
      institutionName,
      minScore,
      avgScore,
      minRank,
      enrollmentCount,
      sourceUrl: `file://${filePath}`,
      sourceTitle: path.basename(filePath),
      rawRowHash,
    });
  }

  if (admissions.length === 0) {
    console.log(`  ⚠ 无有效数据行`);
    return { file: filePath, imported: 0, updated: 0, skipped: rows.length };
  }

  const result = await upsertAdmissionBundle({ admissions });
  return {
    file: filePath,
    imported: result.importedAdmissions,
    updated: result.updatedAdmissions,
    skipped: result.skipped,
  };
}

async function main() {
  const dataDir = path.resolve(process.cwd(), 'data/raw');

  if (!fs.existsSync(dataDir)) {
    console.log('data/raw/ 目录不存在，跳过导入');
    process.exit(0);
  }

  const files = collectFiles(dataDir);
  console.log(`找到 ${files.length} 个 Excel 文件\n`);

  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    console.log(`📄 ${relative}`);
    const result = await importFile(file);
    totalImported += result.imported;
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    console.log(`   新增 ${result.imported} | 更新 ${result.updated} | 跳过 ${result.skipped}\n`);
  }

  console.log('━'.repeat(40));
  console.log(`✅ 全部完成: 新增 ${totalImported} | 更新 ${totalUpdated} | 跳过 ${totalSkipped}`);
}

main().catch((err) => {
  console.error('导入失败:', err);
  process.exit(1);
});
```

- [ ] **Step 2: 添加 tsx 子脚本到 package.json**

在 `package.json` 的 `scripts` 中添加：

```json
"import:all": "tsx scripts/import-all.ts"
```

- [ ] **Step 3: 安装 tsx（如未安装）**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm ls tsx 2>&1 | head -3
```

如果未安装：
```bash
npm install -D tsx
```

- [ ] **Step 4: Commit**

```bash
git add scripts/import-all.ts package.json
git commit -m "feat: add batch import script for data/raw/ Excel files"
```

---

### Task 2: 执行批量导入

**Files:**
- Modify: `dev.db` (数据写入)

- [ ] **Step 1: 运行批量导入**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run import:all
```

Expected: 每个文件输出导入统计，无 FATAL 错误。

- [ ] **Step 2: Commit**

```bash
git add dev.db
git commit -m "data: batch import from data/raw/ (11 files)"
```

---

### Task 3: 更新 .gitignore 并验证

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 更新 .gitignore**

在 `.gitignore` 末尾追加：

```
/dev.db
/dev.db-journal
/dump.sql
/data/
/.tmp-import/
```

- [ ] **Step 2: 验证 .gitignore 生效**

```bash
cd /Users/haoyuli/Desktop/gaokao && git status --short | grep -E 'dev\.db|data/|dump\.sql'
```

Expected: 这些文件不再出现在 git status 中。

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add dev.db, data/ to .gitignore"
```

---

### Task 4: 验证数据接入正确

- [ ] **Step 1: 启动开发服务器**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run dev
```

- [ ] **Step 2: 验证首页查询**

打开 http://localhost:3002 ，选择国内高考，选择省份"山东"、年份"2025"，输入分数 600，点击查询。

Expected: 返回山东 2025 年的录取数据。

- [ ] **Step 3: 验证推荐功能**

打开 http://localhost:3002 ，选择国内高考，填省份"浙江"、年份"2024"、分数 650，点击"查看推荐结果"。

Expected: 返回冲刺/稳妥/保底院校列表。

---

### Task 5: Turso 云数据库迁移

- [ ] **Step 1: 安装 Turso CLI**

```bash
brew install tursodatabase/tap/turso 2>/dev/null || curl -sSfL https://get.tur.so/install.sh | bash
```

- [ ] **Step 2: 登录 Turso**

```bash
turso auth login
```

Expected: 浏览器打开 Turso 登录页，完成 GitHub 授权。

- [ ] **Step 3: 创建数据库**

```bash
turso db create gaokao-db
```

Expected: 输出数据库信息，含 libsql URL。

- [ ] **Step 4: 导出本地 SQLite**

```bash
cd /Users/haoyuli/Desktop/gaokao && sqlite3 dev.db .dump > dump.sql
```

Expected: 生成 `dump.sql` 文件。

- [ ] **Step 5: 导入到 Turso**

```bash
turso db shell gaokao-db < dump.sql
```

Expected: 执行 SQL 导入，无错误。

- [ ] **Step 6: 获取连接信息**

```bash
turso db show gaokao-db --url
turso db tokens create gaokao-db
```

记录输出的 URL 和 token。

- [ ] **Step 7: 更新 .env**

将 `.env` 中的：
```
DATABASE_URL="file:./dev.db"
```
替换为：
```
DATABASE_URL="libsql://[上一步的URL]"
TURSO_AUTH_TOKEN="[上一步的token]"
```

- [ ] **Step 8: 重启验证**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run dev
```

Expected: 服务正常启动，首页查询有数据返回。

- [ ] **Step 9: Commit**

```bash
git add .env
git commit -m "feat: migrate database to Turso cloud"
```

---

### Task 6: 清理本地文件

- [ ] **Step 1: 删除本地数据库和源文件**

```bash
cd /Users/haoyuli/Desktop/gaokao
rm -f dev.db dev.db-journal dump.sql
rm -rf data/raw/ .tmp-import/
```

- [ ] **Step 2: 运行构建确认**

```bash
npm run build 2>&1 | tail -10
```

Expected: exit code 0，所有路由正常。

- [ ] **Step 3: Commit**

```bash
git rm --cached dev.db 2>/dev/null
git add -A
git commit -m "chore: remove local dev.db and data/raw/ source files"
```

---

## 验证清单

| # | 验证项 | 预期结果 |
|---|--------|---------|
| 1 | `npm run import:all` 执行无错误 | 11 个文件导入完成 |
| 2 | 首页查询山东 2025 有数据 | 返回录取记录列表 |
| 3 | 首页查询湖南 2025 有数据 | 返回录取记录列表 |
| 4 | 首页查询浙江 2024 有数据 | 返回录取记录列表 |
| 5 | 首页查询江苏 2024 有数据 | 返回录取记录列表 |
| 6 | `/recommend` 推荐功能正常 | 返回冲刺/稳妥/保底 |
| 7 | Turso 数据库创建成功 | `turso db show gaokao-db` 有输出 |
| 8 | `.env` 切换后 `npm run dev` 正常 | 服务启动，API 有数据 |
| 9 | `npm run build` 通过 | exit code 0 |
| 10 | 本地无 dev.db 和 data/raw/ | 文件已删除 |
