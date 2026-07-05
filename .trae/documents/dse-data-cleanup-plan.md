# DSE 假分数清理 + 学校详情页修复 计划

## 数据问题诊断

JUPAS PDF 解析器 (`load-all-jupas.ts`) 将非数字文本写入了 `minScore`/`medianScore` 字段：

| 指标 | 数量 | 示例 |
|------|------|------|
| minScore > 100 | **82条** | 教育大学 JS8813 = **8813** 分（实际约20分） |
| medianScore > 100 | **64条** | 最高 **299**（DSE满分仅49） |
| **问题根因** | PDF 解析把 page metadata/code number 当分数塞进去了 | JS8813 本是 groupCode，被当作 minScore 写入 |

**修复：** 只保留 `minScore BETWEEN 4 AND 50` 的记录（DSE 合理范围），其余全部删除。

---

## UI 问题

### 学校详情页混乱

| 问题 | 说明 |
|------|------|
| 表格缺 groupCode+programmeName 列 | DSE 学校的 `subjectGroup` 全是"联招"，用户看不出哪条是医学、哪条是工程 |
| "按选科"图表无意义 | DSE 的 subjectGroup 不区分课程 → 全部合并成一条线，各专业分数差异被抹平 |
| 假数据污染图表 | 8813 分把 Y 轴拉爆 |

### 修复

**文件**：`src/app/school/[id]/page.tsx`

1. **DSE 学校默认用 groupCode 模式**（`chartGroupMode` 初始检测）
2. **表格动态增加 groupCode + programmeName 列**（有 groupCode 数据时显示）
3. **隐藏 DSE 学校无意义的 subjectGroup 列**

**文件**：`prisma/dev.db`（SQL）

4. **删除所有垃圾 DSE 记录**

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `prisma/dev.db` | SQL: 删除 DSE 垃圾分数 |
| `src/app/school/[id]/page.tsx` | 表格加列 + chartMode 默认值 |
| `scripts/data/load-all-jupas.ts` | 等后续修复解析器 |

---

## 验证

1. DSE minScore 范围 4~49，无误值
2. 港大详情页 → 默认显示「按课程」图表
3. 表格中能看到 JS6406 等课程代码和名称
