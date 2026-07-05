# 管理后台修复 + 首页省份入口 设计文档

## 概述

修复管理后台「录取数据管理」页面数据不可见问题，并在首页增加省份快捷入口，支持按省份查看录取分数线。

## 当前状态

- **管理后台 records 页面**：API 需要登录（401），但前端未检查 `response.ok`，静默失败。页面缺少筛选栏 UI。
- **首页**：有三个功能卡片（智能推荐/普通查询/上传数据），无省份入口。

## Part A：修复管理后台录取数据页面

### 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/admin/records/page.tsx` | 修改 | 修复 fetch 鉴权 + 增加筛选 UI + 补充 admissionType |

### 具体改动

**1. fetchRecords 增加 HTTP 状态码检查**

```typescript
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
  }, [page, pageSize, yearFilter, provinceFilter, institutionFilter, admissionTypeFilter]);
```

**2. 新增筛选状态变量**

```typescript
const [admissionTypeFilter, setAdmissionTypeFilter] = useState('');
```

**3. 增加筛选栏 UI（表格上方）**

参考 query 页面的 select 样式，增加四个下拉：
- 年份：`/api/years` 动态加载
- 省份：`/api/provinces` 动态加载
- 院校：已加载的 institutions 列表
- 招生类型：统招/艺考/体育/强基/综评/保送/IB/A-Level/DSE 等

**4. 页面结构**

```
PageHeader(title="录取数据管理")
├── 筛选栏 (flex flex-wrap gap-3)
│   ├── <select> 年份
│   ├── <select> 省份
│   ├── <select> 院校
│   └── <select> 招生类型
├── 统计行 (共 N 条记录)
└── 表格 (已有内容不变)
```

## Part B：首页增加省份快捷入口

### 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/page.tsx` | 修改 | 功能卡片下方新增省份入口区域 |
| `src/app/api/provinces/route.ts` | 修改 | 新增省份统计接口 |

### 具体改动

**1. 新增 `/api/provinces/stats` 接口**

返回每个省份的院校数和录取记录数：

```json
[{"province": "山东", "institutionCount": 854, "recordCount": 1127}, ...]
```

实现：通过 Prisma groupBy 按 province 分组统计。

**2. 首页新增「按省份查看」区域**

在现有三个功能卡片下方，以卡片网格形式展示省份列表：

```
<section>
  <h2>按省份查看</h2>
  <div grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4>
    {provinces.map(p => (
      <Link href={`/query?province=${p.province}`}>
        <card>
          <h3>{p.province}</h3>
          <span>{p.recordCount} 条录取数据</span>
          <span>{p.institutionCount} 所院校</span>
        </card>
      </Link>
    ))}
  </div>
</section>
```

**3. 样式设计**

- 卡片使用现有项目风格：圆角、阴影、hover 效果
- 省份名用大字展示，数据统计用小字灰色
- 与上方功能卡片区域保持一致的视觉间距

## 不在本次范围

- 修改 Schema
- 新增路由页面（省份入口跳转到现有 query 页面，不新建页面）
- 高级筛选参数暴露到前台（granularity、groupCode 等）

## 验证步骤

1. 登录管理后台，进入「录取数据管理」，能看到数据列表
2. 切换年份/省份/院校/招生类型筛选，数据正确过滤
3. 未登录时访问 `/admin/records`，自动跳转到登录页
4. 首页出现「按省份查看」区域，展示 5 个省份卡片
5. 点击省份卡片跳转到 `/query?province=山东`，查询结果正确
6. `npm run build` 通过
