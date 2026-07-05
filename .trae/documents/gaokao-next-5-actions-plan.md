# 下一步 5 项优化执行计划

> **For agentic workers:** 直接执行，每步不超过 5 分钟，全部可并行。

**Status:** NJU 站点已恢复（200 OK），SAT 报告可访问，湖南/辽宁 2025 本科批未在搜索首页出现（当前日期 2026 年，旧公告可能被覆盖）。

---

## Action 1: BIT solo load

将 BIT 7983 majors 单独入库。

```bash
cd /Users/haoyuli/Desktop/gaokao
# 先确认 BIT 的 normalized 文件路径
LOAD_CONCURRENCY=1 npm run import:load
```

如果仍有 provincial 大文件干扰，临时创建只含 BIT 的 normalized 子集：
```bash
mkdir -p data/normalized/_bit-only/全国/2025
cp data/normalized/全国/2025/bit-undergrad-html-all-06c6f3bca1d9.html.json data/normalized/_bit-only/全国/2025/
# 然后修改 load-normalized.ts 读取 _bit-only 目录
```

---

## Action 2: NJU 抓包（站点已恢复 200）

```bash
cd /Users/haoyuli/Desktop/gaokao
python3 scripts/sniff-nju-ajax.py
```

若 playwright chromium 未安装：
```bash
python3 -m playwright install chromium
```

抓包后确认 AJAX 字段 → 在 `scripts/data/fetch-official-sources.ts` 中解注释 `fetchNjuAllProvinces` → 在 `fetchOne()` 中激活 NJU 分发 → `npm run import:fetch -- --province=全国 --year=2025`

---

## Action 3: 贵州历史类 fetch+parse

```bash
cd /Users/haoyuli/Desktop/gaokao
npm run import:fetch -- --province=贵州 --year=2025 && npm run import:parse
```

---

## Action 4: 湖南/辽宁 URL 补入

搜索已确认 2025 公告不在首页。尝试翻页搜索：

```bash
# 湖南 - 尝试 content ID 范围 4455-4700
curl -s "https://www.hneeb.cn/hnxxg/741/742/index_2.htm" | grep -o 'content_[0-9]*.html' | head -20
```

如果找不到：标记为 `todo`，等下一个 7 月下旬手动补充。

```bash
# 辽宁 - 2025 投档数据未在搜索结果出现
# 结论：暂不更新，保持 review 态，后续手动确认
```

---

## Action 5: SAT PDF 收集

College Board 官方入口可访问：
- `https://reports.collegeboard.org/` 有 SAT Suite 和 AP 结果
- Studocu 有 2025 SAT Annual Report 全文（第三方转载）

```bash
cd /Users/haoyuli/Desktop/gaokao
mkdir -p data/raw/海外/SAT
# 下载 SAT Annual Report PDF（需手动定位 URL）
```

更新 `overseas-source-registry.ts` 中 SAT 条目 `status: 'collected'`。

---

## 建议执行顺序

1. NJU 抓包（先跑，站点已恢复） + 贵州 fetch（后台并行）
2. BIT solo load（需要较长时间，后台跑）
3. SAT 报告下载 + 湖南 URL 翻页搜索（轻量，随时可做）
