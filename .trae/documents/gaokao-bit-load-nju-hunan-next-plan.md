# BIT 入库 + NJU/Hunan 继续 + 下一步规划

> **Status:** BIT load 在远端 Turso 逐个 upsert 7983 majors + 93 省份 synthetic parents，需要 15-30 分钟。NJU AJAX 仍 403。湖南页面用 GBK 编码。

---

## Action 1: BIT 单独入库（隔离执行）

BIT normalized 文件路径：
`data/normalized/全国/2025/bit-undergrad-html-all-06c6f3bca1d9.html.json`

**方案**：临时重命名其他 normalized 目录，只留 BIT 一个文件跑 load。

```bash
cd /Users/haoyuli/Desktop/gaokao

# 备份：把非 BIT 的 normalized 目录临时移走
mkdir -p /tmp/gaokao-backup
mv data/normalized/山东 /tmp/gaokao-backup/
mv data/normalized/广东 /tmp/gaokao-backup/
mv data/normalized/江苏 /tmp/gaokao-backup/
mv data/normalized/河北 /tmp/gaokao-backup/
mv data/normalized/浙江 /tmp/gaokao-backup/
mv data/normalized/湖南 /tmp/gaokao-backup/
mv data/normalized/贵州 /tmp/gaokao-backup/
mv data/normalized/辽宁 /tmp/gaokao-backup/
mv data/normalized/陕西 /tmp/gaokao-backup/
# 也删掉 全国 下的旧文件（NJU shell、HIT 旧版、BIT 2026 shell）
rm -f data/normalized/全国/2025/nju-undergrad-html-all-a6b8d0f8d443.html.json
rm -f data/normalized/全国/2025/hit-undergrad-html-all-1b83737df6d9.html.json
rm -f data/normalized/全国/2025/hit-undergrad-html-all-dd685d41e8e1.html.json
rm -f data/normalized/全国/2026/bit-undergrad-html-all-ccd34f769383.html.json
# 只留 BIT 7983 majors 这个文件

# 单线程跑 load
LOAD_CONCURRENCY=1 npm run import:load
```

**预期结果**：
- 93 个省份的 synthetic parent institution 级 admission 被创建
- 7983 条 BIT majors 挂到对应的 synthetic parent 上
- `adm: +93/~0 maj: +7983/~0 sk:0` 或接近

---

## Action 2: 跑 import:report 更新 coverage

```bash
cd /Users/haoyuli/Desktop/gaokao

# 先把备份的 normalized 目录移回来
mv /tmp/gaokao-backup/* data/normalized/
rmdir /tmp/gaokao-backup

# 跑 report
npm run import:report
```

**验证点**：
- `coverage-summary.json` 中 BIT/HIT `majorImportedCount > 0`
- `source-load-summary.json` 重新生成
- 河北/山东/贵州历史类条目有正确的 `nativeMajorCount`

---

## Action 3: NJU 抓包（站点恢复后）

```bash
cb /Users/haoyuli/Desktop/gaokao

# 安装 chromium（首次需要）
python3 -m playwright install chromium

# 运行抓包脚本
python3 scripts/sniff-nju-ajax.py
```

NJU 当前仍返回"网络维护"403。站点恢复为 200 后：
- 抓包确认 `f/ajax_lnfs_param` 和 `f/ajax_lnfs` 端点可用
- 确认返回字段名（`zymc` vs `zyname` 等）
- 解注释 `fetchNjuAllProvinces` → 激活 `fetchOne()` 分发
- `npm run import:fetch -- --province=全国 --year=2025`

---

## Action 4: 湖南 2025 本科批 URL（GBK 解码翻页）

```bash
cd /Users/haoyuli/Desktop/gaokao

# 尝试翻更早的页码（index_3 到 index_8）
for page in 3 4 5 6 7 8; do
  echo "=== page $page ==="
  curl -s "https://www.hneeb.cn/hnxxg/741/742/index_${page}.htm" | iconv -f GBK -t UTF-8 2>/dev/null | grep -oP '本科批.*?投档分数' | head -5
done
```

如果 `iconv` 解码后仍找不到，尝试逐个 content ID 翻查：
```bash
# 2025 年 7 月公告的 content ID 范围约 4455-4565
for id in $(seq 4455 4565); do
  text=$(curl -s "https://www.hneeb.cn/hnxxg/741/742/content_${id}.html" | iconv -f GBK -t UTF-8 2>/dev/null)
  if echo "$text" | grep -q "本科批\|投档分"; then
    echo "content_${id}: $(echo "$text" | grep -oP '(?<=title>).*?(?=</title>)' | head -1)"
  fi
done
```

找到 URL 后，补入 `source-registry.ts`：
```typescript
{
  province: '湖南',
  year: 2025,
  title: '湖南省2025年普通高校招生本科批平行志愿投档分数线（物理类）',
  officialUrl: 'https://www.hneeb.cn/hnxxg/741/742/202507XXXXpt.xlsx',
  sourceType: 'xlsx',
  granularity: 'major',
  sourceLevel: 'province-official',
  expectedGranularity: 'major',
  parserKey: 'hunan',
  parserVersion: '1',
  subjectGroup: '物理类',
  batch: '本科批',
},
```

---

## 下一步优化建议

### 短期（本周）

1. **BIT solo load + import:report**：让 7983 majors 落库，coverage 报告反映真实进度
2. **NJU 抓包**：站点 AJAX 恢复后，5 分钟完成确认+激活+fetch
3. **湖南翻页提取**：用 iconv GBK 解码找到 2025 本科批 xlsx
4. **贵州 load**：贵州历史类 4856 majors 已 parse，跑 `import:load` 入库

### 中期（2 周内）

5. **load 性能优化**：7983 majors 的 BIT 逐个 upsert 太慢 → 批量 createMany 或 chunked create
6. **NJU adapter + fetch**：接上 NJU 后获得又一个 filter-page 学校源
7. **湖南 parser 适配**：如果湖南本科批 xlsx 格式与提前批不同，需要新 parser
8. **贵州补全**：除了第2次征集志愿+主投档，还有其他批次 PDF 可补

### 长期

9. **SAT PDF → 数据提取**：已下载 927KB SAT Total Group PDF，可用 pdf2json/tabula 提取 mean/percentile 数据
10. **AP + ACT + IB PDF 收集**：同理下载更多海外官方年度报告
11. **synthetic parent 性能**：当前逐个 create → 改为 batch `createMany`（Prisma 5.x 支持）
12. **省级补线评估**：天津、福建、安徽等有稳定下载源的新省份

---

## 当前数据总量预估

完成以上短期工作后：

| 来源 | 类型 | 估计条数 |
|------|------|----------|
| 广东 2023-2025 | provincial group | ~13,000 |
| 江苏 2023-2025 | provincial group | ~20,000 |
| 浙江 2023-2025 | provincial major | ~60,000 |
| 山东 2025 | provincial major | ~21,000 |
| 河北 2025 | provincial major | ~50,000 |
| 湖南 2025 | provincial | ~10,000 |
| 贵州 2025 | provincial major | ~10,000 |
| 辽宁 2024 | provincial major | ~20,000 |
| 陕西 2024 | provincial institution | ~1,000 |
| BIT 2023-2025 | school-official major | **7,983** |
| HIT 2025 | school-official major | **58** |
| NJU 2023-2025 | school-official major | 待抓包 |
| SAT 2025 | overseas research | 待提取 |

**国内 ~205,000 条 + 学校 ~8,000 条 + 海外待定**
