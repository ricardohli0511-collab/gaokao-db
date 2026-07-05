# 补齐香港院校 + 清理残留假数据 修复计划

## 诊断结果

### 问题1：香港院校不全

当前 21 所，缺失以下可补充的院校：

| 缺失院校 | 类型 | 备注 |
|---------|------|------|
| 香港演艺学院 (HKAPA) | 法定院校 | 表演艺术，学士/硕士 |
| 香港高等教育科技学院 (THEi) | 自资 | VTC 旗下，应用科学学士 |
| 耀中幼教学院 (YCCECE) | 自资 | 幼儿教育学士 |
| 圣方济各大学 (SFU) | 自资 | 原明爱专上学院已升格，name 需更新 |
| 香港伍伦贡学院 (UOWCHK) | 副学士 | 原香港城市大学专上学院拆分 |

> **总计可补 3-5 所 → 达到 24-26 所香港院校**

### 问题2：后台"返回网站"按钮

**已验证：按钮存在且可用。** 侧边栏底部有「返回网站」链接 → `/`，页面返回 200。

用户可能需要**缓存清除**（Cmd+Shift+R）才能看到。`layout.tsx` 已添加 `dynamic = 'force-dynamic'`。

### 问题3：仍然存在大量手动构造数据

| 脚本 | 数据量 | 性质 |
|------|--------|------|
| `insert-hk-international-seed.ts` | **191 条** (IB 57 + A-Level 57 + SAT 57 + 高考 20) | ❌ 手动硬编码数组 |
| `insert-real-associate-data.ts` | **96 条** (副学士) | ❌ 手动硬编码数组 |
| `load-all-jupas.ts` | 806 条 (DSE JUPAS) | ✅ 解析官方 PDF |

**当前 DB 中 287/997 条 AdmissionRecord 是手动硬编码的。**

---

## 行动方案

### 步骤 1：新增缺失香港院校到 seed.ts

在 `prisma/seed.ts` 中补充：

```typescript
// 演艺学院
{ name: '香港演艺学院', code: 'HKAPA', category: '法定院校', type: '艺术', ... }
// 高科院
{ name: '香港高等教育科技学院', code: 'THEi', category: '自资院校', type: '理工', ... }
// 耀中幼教
{ name: '耀中幼教学院', code: 'YCCECE', category: '自资院校', type: '师范', ... }
```

### 步骤 2：清库 → 种子 → 只导真实数据

```bash
rm prisma/dev.db && npx prisma db push
npx tsx prisma/seed.ts                    # 院校结构 + 考试体系
npx tsx scripts/data/load-all-jupas.ts     # DSE JUPAS (806条真实)
```

**不运行** `insert-hk-international-seed.ts` 和 `insert-real-associate-data.ts`（全是硬编码）。

### 步骤 3：确认结果

导入后数据库结构：
- Institution: 24-26 所香港 + 8 所内地 = 32-34 所
- AdmissionRecord: 仅 806 条 DSE（100% 真实来源）
- AssociateDegreeRecord: 0 条（等找到真实来源再导入）

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `prisma/seed.ts` | **修改** | 增加 3-5 所缺失港校 |

---

## 验证

1. `sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Institution WHERE region='hongkong'"` → 24+
2. `sqlite3 prisma/dev.db "SELECT examCategory,COUNT(*) FROM AdmissionRecord"` → 只有 dse:806
3. 首页港校卡片增加 3-5 所
