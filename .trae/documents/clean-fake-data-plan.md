# 清理假数据 + 聚焦香港数据 方案

## 数据全景诊断

```
数据库实际数据:
├── Institution: 29所（21所香港 + 8所内地）
├── AdmissionRecord: 1,055条
│   ├── DSE:  815条 ✅（JUPAS真实数据）
│   ├── 高考:  67条 ❌（几乎全为 seed/generated 假数据）
│   ├── IB:    58条
│   ├── ALevel: 58条
│   └── SAT:   57条
├── AssociateDegreeRecord: 113条
│   ├── DSE:   61条
│   └── 高考:  52条
```

### 假数据追踪

| 来源 | 数量 | 说明 |
|------|------|------|
| `seed.ts` 第60-67行 | 8条 | 内地高校高考分（北大689/清华693/复旦672...） |
| seed.ts 港校数据 | 约20条 | DSE示例 + HK高考分 |
| 其他 HK 高考分 | ~39条 | 简单 +5/年 递增，明显人工生成 |
| **合计假数据** | **~67条** | 全部内地院校高考 + 大部分港校高考 |

### 真实数据（可保留）

| 数据 | 数量 | 来源 |
|------|------|------|
| DSE JUPAS 录取 | 815条 | `https://www.jupas.edu.hk/f/page/3667/af_20XX_JUPAS.pdf` |
| DSE 副学士 | 61条 | 同样来自 JUPAS/public data |
| IB/ALevel/SAT | ~175条 | 各校官网 |

---

## 行动方案

### 步骤 1：清库重建

```bash
# 删除 dev.db，重建 schema
rm prisma/dev.db
npx prisma db push
```

### 步骤 2：精简 seed.ts —— 只保留真实数据

当前 `seed.ts` 混合了假数据（硬编码分数）和真实引用。需要：

- **删除**：所有手动 `create` 的高考/港校录取记录（第59-68行区域）
- **保留**：`Institution` 创建（院校本身是真实信息）
- **保留**：Admin 用户创建
- **结果**：seed 后只有 29 所院校结构，无录取记录

### 步骤 3：重新导入真实数据

已有导入脚本（确认存在）：

| 脚本 | 数据 | 真实性 |
|------|------|--------|
| `scripts/data/load-jupas-dse.ts` 或 `load-all-jupas.ts` | DSE 录取分数 | ✅ 来自 JUPAS 官网 PDF |
| `scripts/data/insert-real-associate-data.ts` | 副学士真实数据 | ✅ |
| `scripts/data/insert-hk-international-seed.ts` | IB/ALevel 国际考试 | ✅ |
| `scripts/data/insert-sat.ts` | SAT | ✅ |
| `scripts/data/load-normalized.ts` | 标准化数据 | ✅ |
| `scripts/data/insert-hk-gaokao-seed.ts` | 港校高考分 | ⚠️ **带 "seed" 后缀，疑似假数据** — 需确认 |
| `scripts/data/insert-associate-seed.ts` | 副学士 seed | ⚠️ **带 "seed" 后缀** — 优先用 `insert-real-associate-data.ts` |
| `scripts/import-all.ts` | 一键导入全部 | 包含假数据来源 |

导入顺序：
```bash
# 1. 先跑 seed（建院校结构）
npx tsx prisma/seed.ts

# 2. DSE JUPAS 数据
npx tsx scripts/data/load-all-jupas.ts

# 3. 副学士（用真实版）
npx tsx scripts/data/insert-real-associate-data.ts

# 4. 国际考试
npx tsx scripts/data/insert-hk-international-seed.ts
npx tsx scripts/data/insert-sat.ts

# 5. 标准化数据
npx tsx scripts/data/load-normalized.ts
```

---

## 预期结果

| 指标 | 当前 | 修复后 |
|------|------|--------|
| 假高考数据 | 67条 | **0条** |
| DSE 真实数据 | 815条 | 815条（重导不变） |
| 副学士数据 | 113条 | 重新导入 |
| 数据可信度 | 低（混入假数据） | **高**（仅真实来源） |

---

## 验证步骤

1. `rm prisma/dev.db && npx prisma db push` — 清空数据库
2. 运行 seed — 确认只创建院校结构
3. 运行 DSE 导入脚本 — 确认 815 条导入
4. 运行副学士导入 — 确认数据量合理
5. 打开网站 `/` — 港校卡片只显示有真数据的院校
