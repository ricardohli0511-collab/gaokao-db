# Load + Verify 专项计划

> 全量数据入库验证：BIT 7983 + provincial + JUPAS DSE 320 条，三步走。

---

## Step 1: import:load（createMany batch 优化后）

```bash
cd /Users/haoyuli/Desktop/gaokao
LOAD_CONCURRENCY=1 npm run import:load
```

优化效果：
- **synthetic parents**: 93 条 → 1 次 batch
- **BIT majors**: 7983 条 → 16 次 batch × 500
- **provincial majors**: 贵州/河北/山东等同理 batch
- **预期时间**: 2-3 分钟（vs 原来 ~25 分钟）

---

## Step 2: import:report 验证

```bash
npm run import:report
```

验证脚本：
```bash
# BIT major 入库数
grep -A20 '"bit-undergrad"' data/reports/coverage-summary.json | grep majorImportedCount

# 贵州/河北/山东 入库
python3 -c "
import json
with open('data/reports/source-load-summary.json') as f:
    data = json.load(f)
for item in data:
    p = item.get('province','')
    if p in ['贵州','河北','山东']:
        print(f'{p}: importedMajors={item.get(\"importedMajors\",0)}')
"
```

---

## Step 3: JUPAS DSE import:load 入库

```bash
# 确保香港 normalized 目录中有 jupas-dse-2025.json
ls -lh data/normalized/香港/2025/jupas-dse-2025.json

# 跑 load（会加载 normalized 目录下所有文件，含 JUPAS + provincial）
LOAD_CONCURRENCY=1 npm run import:load
```

---

## Step 4: 全量测试

```bash
npx tsx --test src/lib/import/source-registry.test.ts \
  src/lib/import/parsers/schools/bit-undergrad-html.test.ts \
  src/lib/import/parsers/schools/hit-undergrad-html.test.ts
```

## 验证清单

- [ ] `import:load` 完成，无报错
- [ ] BIT `majorImportedCount > 0`
- [ ] 贵州/河北/山东 `importedMajors > 0`
- [ ] `AdmissionRecord` 表中有 `examCategory: 'dse'` 记录（SELECT count(*)... ≈ 320）
- [ ] 测试 7/7 通过
