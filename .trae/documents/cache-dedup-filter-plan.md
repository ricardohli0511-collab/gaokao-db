# 网站更新 + 搜索修复 + 去重防护 修复计划

## 一、问题诊断

### 问题1：「网站很多都没更新」

**原因分析**：修改代码后，在浏览器中看不到变化。

| 可能原因 | 诊断结果 |
|----------|---------|
| 浏览器缓存 | ✅ **极可能** — Next.js 开发模式下 API 返回无 `Cache-Control` 头，浏览器可能缓存 GET 请求 |
| 硬盘缓存 | ✅ **极可能** — HTML 页面也可能被浏览器缓存 |
| HMR 失效 | 可能 — Next.js 16.2 TurboPack 有时 HMR 不完全 |

**解决方案**：
- 在 `/api/records`、`/api/hk-institutions`、`/api/institutions/[id]` 三个高频 API 中添加 `Cache-Control: no-store, no-cache, must-revalidate` 响应头
- 根布局 `layout.tsx` 中添加 meta 标签禁用 HTML 缓存

### 问题2：高考/国际考试搜索时始终显示固定学校

**原因分析**：用户指的是主页「香港院校库」卡片区。即使切换考试类型（高考→DSE→IB），卡片区始终显示相同的 15 所香港院校，与考试类型无关。

**实际情况**：
- 切换考试类型后，API 返回的 `examRecordCount` 会变化（上次优化已做）
- 低/无数据的卡片变灰色，**但卡片仍然可见**
- 用户期望的是：切换考试类型时，只显示**有该考试数据的院校**，没有数据的应该隐藏

**解决方案**：
- 在主页院校卡片区增加「仅显示有数据」开关
- 默认只显示当前考试类型有数据的院校（`examRecordCount > 0`）
- 或保留全部但更显著地区分有/无数据

### 问题3：数据库中重复学校防护

**原因分析**：当前 DB 无重复（29 所院校均唯一），但结构上存在风险：

| 风险点 | 详情 |
|--------|------|
| `Institution.name` 无唯一约束 | 可插入同名院校 |
| `Institution.code` 可为 null | null 不参与唯一约束判断 |
| Seed 使用 `create` 而非 `upsert` | 重复运行 seed 可能创建重复数据 |
| `matchInstitution` 使用 `findFirst` | 如有重复，静默返回第一条 |

**解决方案**：
- Schema 层面增加 `@@unique([name])` 约束
- Seed 脚本改用 `upsert`
- `matchInstitution` 的 `findFirst` 已经足够安全（匹配时不创建新记录，由 upsert 处理）

---

## 二、实施计划

### 实施项 A：API 缓存控制

**文件**：3 个 API 文件

在每个 GET 路由末尾的 `NextResponse.json(...)` 调用后，添加缓存头：

```typescript
const response = NextResponse.json({ data, total, page, pageSize });
response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
response.headers.set('Pragma', 'no-cache');
return response;
```

| 文件 | 用途 |
|------|------|
| `src/app/api/records/route.ts` | 录取记录查询 |
| `src/app/api/hk-institutions/route.ts` | 香港院校列表 |
| `src/app/api/institutions/[id]/route.ts` | 院校详情 |

### 实施项 B：主页院校卡片按考试类型筛选

**文件**：`src/app/page.tsx`

改动：
1. 增加 `showAll` 状态（默认 `false`，即默认只显示有数据的）
2. 当 `examType` 变化后获取 API 数据时，`examRecordCount` 精确反映当前考试
3. 默认过滤 `examRecordCount > 0` 的院校
4. 新增「显示全部」切换按钮，点击后显示全部 15 所院校（含灰色无数据的）

```tsx
const [showAllInstitutions, setShowAllInstitutions] = useState(false);

// 过滤逻辑
const visibleInsts = showAllInstitutions
  ? hkInsts
  : hkInsts.filter((inst) => inst.examRecordCount === null || inst.examRecordCount > 0);
```

### 实施项 C：Schema 唯一约束 + Seed 去重

**文件**：
- `prisma/schema.prisma` — 增加 `@@unique([name])`
- `prisma/seed.ts` — 全部 `create` 改为 `upsert`

#### C1. Schema 修改

在 `Institution` 模型中添加：

```prisma
@@unique([name])
```

然后运行 `npx prisma db push` 应用变更。

#### C2. Seed 去重

将 seed.ts 中所有 `prisma.institution.create()` 改为 `prisma.institution.upsert()`：

```typescript
// 原来
prisma.institution.create({ data: { name: '北京大学', ... } })

// 改为
prisma.institution.upsert({
  where: { name: '北京大学' },
  create: { name: '北京大学', ... },
  update: {},
})
```

---

## 三、涉及文件清单

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `src/app/api/records/route.ts` | **修改** — 添加 Cache-Control 头 | 极小 |
| `src/app/api/hk-institutions/route.ts` | **修改** — 添加 Cache-Control 头 | 极小 |
| `src/app/api/institutions/[id]/route.ts` | **修改** — 添加 Cache-Control 头 | 极小 |
| `src/app/page.tsx` | **修改** — 院校卡片筛选逻辑 + 显示全部按钮 | 小 |
| `prisma/schema.prisma` | **修改** — `@@unique([name])` | 极小 |
| `prisma/seed.ts` | **修改** — `create` → `upsert` | 中 |

---

## 四、验证步骤

1. 硬刷新浏览器（Cmd+Shift+R），确认首页标题「全球院校录取查询」可见
2. 切换 DSE → 港八大高亮 → 副学士院校默认隐藏
3. 点击「显示全部」→ 显示所有 15 所院校
4. 切换 SAT → 有 SAT 数据的院校高亮
5. 运行 `npx prisma db push` 无报错
6. 运行 `npx tsx prisma/seed.ts` 确认 `upsert` 不产生重复
