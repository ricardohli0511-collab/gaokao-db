# 优先级一~四 执行计划：变现 + NJU 接入 + 省级补完 + 海外研究

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本轮已完成的 BIT 7983 majors + synthetic parent + HIT 回填数据真正落库并产出报告；通过 Playwright 浏览器端抓包确认 NJU AJAX 端点；补全贵州/辽宁/湖南 2025；启动海外数据研究。

**Architecture:** 优先级一直接跑现有 `import:load` + `import:report`；优先级二用 Playwright 打开 NJU 页面 → 切换筛选 → 捕获 Network XHR 请求；优先级三从已发现的贵州公告 URL 模式推断历史 PDF 路径；优先级四做信息收集 + Schema 兼容性验证。

**Tech Stack:** Node.js、TypeScript、Playwright（优先级二）

---

## 完成度盘点

### 国内省级数据覆盖

| 省份 | 年份 | 科目组 | 粒度 | 状态 |
|------|------|--------|------|------|
| 广东 | 2023-2025 | 全科 | group | ✅ 已入库 |
| 江苏 | 2023-2025 | 物理+历史 | group | ✅ 已入库 |
| 浙江 | 2023-2025 | 综合 | major | ✅ 已入库 |
| 山东 | 2025 | 综合 | major | ✅ 已入库（第1次+第2次志愿） |
| 河北 | 2025 | 物理+历史 | major | ✅ fetch+parse 通过，待 load |
| 湖南 | 2025 | 普通类 | group | ✅ 已入库（仅提前批） |
| 贵州 | 2025 | 物理类 | major | ✅ 已入库（仅物理+征集志愿） |
| 辽宁 | 2024 | 物理+历史 | major | ✅ 已入库（2025 待发布） |
| 陕西 | 2024 | 物理类 | institution | ✅ 已入库 |

### 学校官网适配器覆盖

| 学校 | pageMode | 数据规模 | 状态 |
|------|----------|----------|------|
| BIT | filter-page → AJAX 枚举 | **7983 majors** | ✅ fetch+parse 通过，待 load |
| HIT | static-table → token 回填 | **34+ majors** | ✅ fetch+parse 通过，含 synthetic parent |
| NJU | filter-page（CMS 同源） | 待抓包确认 | 🔶 适配器已有，AJAX 端点待抓包 |
| SEU | article-list | ─ | 🔶 review 态，未激活 |

### 海外数据

完全空白。`schema.prisma` 中有 `ExamCategory.sat | act | ap | ib` 枚举但没有任何来源、parser、registry、数据。

---

## 优先级一：把本轮改动变现

### 目标

跑完整 `import:load`，让 BIT 7983 majors + HIT 34 majors 实际入库，让 `source-load-summary.json` 和 `coverage-summary.json` 反映真实进度。

### 执行步骤

- [ ] **Step 1: 清理 stale normalized files**

  删除重复/过期的 normalized JSON（HIT/BIT 的旧 sha256 版本），只保留最新且含数据的版本。

  ```bash
  # 保留最新含数据的 HIT（dd685d / 1b837）
  # 保留最新含数据的 BIT（06c6f3bca1d9）
  # 删除旧的空壳版本（cd8b4105f7ca、84792242b3a7、e2e6eb435f25、fc704ac148c8）
  ```

- [ ] **Step 2: 运行 import:load**

  ```bash
  npm run import:load
  ```

  **验证点**：
  - BIT majors 行显示 `maj: +xxx` 非零
  - HIT majors 不被 skip（`sk:0` 或接近 0）
  - 日志中 `syntheticParentsCreated` 被计入 ImportJob 的 errorMessage 字段

- [ ] **Step 3: 运行 import:report**

  ```bash
  npm run import:report
  ```

  **验证点**：
  - `source-load-summary.json` 被重新生成
  - 河北/山东条目有非零 importedMajors
  - `coverage-summary.json` 中 BIT `schoolGapState` 从 `school_page_filter_enumeration_unverified` → `null`
  - HIT `schoolGapState` 从 `school_adapter_pending` → `schoolSourceCompleted: true`

---

## 优先级二：NJU filter-page AJAX 抓包接入

### 调研结论

NJU 与 BIT 是**同一套 CMS**（云智技术服务），证据：
- 相同的 JS 栈：`artTemplate.js`、`util.js`、`tplt.js`、`common.js`、`filterCache_copy.js`
- 相同的 filter 模式：`data-param="ssmc"`、`filter.prototype` 类
- 相同的页面结构：`lnfs.html`、`zsjh.html`、`lqcx.html`
- BIT 的 AJAX 路径在域名根 `/f/ajax_lnfs_param` 而非 `static/front/` 下

**推断**：NJU 的 AJAX 端点大概率是 `https://bkzs.nju.edu.cn/f/ajax_lnfs_param` 和 `f/ajax_lnfs`，但也可能被 CMS 配置成其他路径。需要通过浏览器实际操作抓包确认。

### 执行步骤

- [ ] **Step 1: 编写 Playwright 抓包脚本**

  创建 `/Users/haoyuli/Desktop/gaokao/scripts/sniff-nju-ajax.py`：

  ```python
  from playwright.sync_api import sync_playwright

  with sync_playwright() as p:
      browser = p.chromium.launch(headless=True)
      page = browser.new_page()

      # 监听所有 XHR/Fetch 请求
      ajax_requests = []
      page.on('request', lambda req: ajax_requests.append(req) if req.resource_type in ['xhr', 'fetch'] else None)

      page.goto('https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html')
      page.wait_for_load_state('networkidle')
      page.wait_for_timeout(2000)  # 等 AJAX 初始请求完成

      # 先截图看默认态
      page.screenshot(path='/tmp/nju_default.png', full_page=True)

      # 尝试选择省份下拉
      try:
          # 点击省份筛选下拉
          province_dd = page.locator('dd[data-param="ssmc"]')
          province_dd.click()
          page.wait_for_timeout(500)

          # 选择"北京"（非默认省份，触发请求）
          page.locator('dd[data-param="ssmc"] a[data-value="北京"]').click()
          page.wait_for_timeout(3000)  # 等 AJAX 完成
          page.screenshot(path='/tmp/nju_beijing.png', full_page=True)
      except Exception as e:
          print(f"交互失败: {e}")

      # 输出所有捕获到的 AJAX 请求
      print('\n=== 捕获到的 AJAX 请求 ===')
      for req in ajax_requests:
          print(f'[{req.method}] {req.url}')
          if req.post_data:
              print(f'  Body: {req.post_data[:200]}')

      browser.close()
  ```

  运行：
  ```bash
  pip install playwright --break-system-packages && python -m playwright install chromium
  python scripts/sniff-nju-ajax.py
  ```

- [ ] **Step 2: 确认 AJAX 端点并填入配置**

  根据抓包结果，将 NJU 的 `paramEndpoint` 和 `dataEndpoint` 填入 `fetch-official-sources.ts` 中的 `fetchNjuAllProvinces` 配置骨架。

  预期的字段映射（基于同一 CMS 系统推断）：
  ```typescript
  paramEndpoint: '/f/ajax_lnfs_param',  // 大概率同 BIT
  dataEndpoint: '/f/ajax_lnfs',         // 大概率同 BIT
  provinceParamName: 'ssmc',            // 同 BIT
  yearParamName: 'nf',                  // 同 BIT
  ```

  但需要确认：
  - NJU 的 `dataEndpoint` 返回字段名（`zyname` vs `zymc` vs `zyminScore` 等）
  - NJU 的 `paramEndpoint` 返回结构是否同 BIT（数组+单键对象）

- [ ] **Step 3: 接入 fetch 分发**

  在 `fetchOne()` 中激活 NJU 分支：
  ```typescript
  if (entry.schoolKey === 'nju-undergrad' && entry.sourceType === 'html') {
    buffer = await fetchNjuAllProvinces(entry);
  }
  ```

- [ ] **Step 4: 更新 NJU adapter**

  如果 NJU 返回结构与 BIT 相同（同 CMS），可直接复用 BIT 的合成 HTML parser。如果需要差异列，则在 `nju-undergrad-html.ts` 中新增合成格式解析。

- [ ] **Step 5: 验证**

  ```bash
  npm run import:fetch -- --province=全国 --year=2025
  npm run import:parse
  ```

---

## 优先级三：贵州/辽宁/湖南 2025 年补完

### 3A. 贵州 2025 历史类

- [ ] **调研结论**：贵州物理类 PDF 在 `P020250728609925730354.pdf`。同一公告页的历史类 PDF 应该在同一天发布，遵循同一命名模式。公告页 `http://zsksy.guizhou.gov.cn/ygpt/tdqk/202508/t20250819_88489425.html` 同时包含物理类和历史类链接。查看该页面即可确认历史类 PDF 的准确文件名。

- [ ] **步骤**：
  1. 用 WebFetch 或 curl 获取 `http://zsksy.guizhou.gov.cn/ygpt/tdqk/202508/t20250819_88489425.html` 页面
  2. 提取 `P02025.*?历史.*?\.pdf` 链接
  3. 在 `source-registry.ts` 中新增一条贵州 2025 历史类来源（同 parser：`guizhou`，同 `batch：本科批`，`subjectGroup：历史类`）
  4. 跑 `import:fetch --province=贵州 --year=2025` + `import:parse`

### 3B. 辽宁 2025

- [ ] **调研结论**：辽宁招生考试之窗 `lnzsks.com` 目前只有 2024 投档数据。2025 年本科批投档预计在 7 月中下旬发布（同 2024 年模式）。当前不可用。

- [ ] **预置**：在 `source-registry.ts` 中预置 2025 的 URL 模式（期望 `https://www.lnzsks.com/lnzkbfiles/2025/2025gkbkptd...zip`），`status: 'review'`，待发布后改成 `active`。

### 3C. 湖南 2025 本科批

- [ ] **调研结论**：湖南已有 2025 提前批。本科批同域名同一目录 `https://www.hneeb.cn/hnxxg/741/742/`，需要查找 `content_` ID 更高序号的公告。

- [ ] **步骤**：
  1. WebSearch `site:hneeb.cn 2025 湖南省 普通高校招生 本科批 平行志愿 投档分数线`
  2. 提取下载链接（预期格式：`https://www.hneeb.cn/hnxxg/741/742/202507XXXXpt.xlsx`）
  3. 新增 `subjectGroup: '物理类'` + `subjectGroup: '历史类'` 两条来源
  4. 可选新增 `hunan-undergrad-html` parser（如果格式不同）

---

## 优先级四：海外数据研究启动

### 现状

`prisma/schema.prisma` 已有 `ExamCategory` 枚举：
```prisma
enum ExamCategory {
  gaokao
  sat
  act
  ap
  ib
}
```

但没有任何：
- 海外来源 registry
- 海外 parser
- 海外 ETL 链路
- 前端展示

### 最小可行性方案

- [ ] **Step 1: 手动收集官方 PDF 报告**

  目标来源（College Board / ACT 官方站点）：
  - SAT Suite Annual Report (College Board)：每年发布一份 PDF，包含年度总分分布、分项得分、考生统计
  - AP Program Results (College Board)：年度发布，包含各科目 5/4/3 分率
  - ACT National Profile Report：年度发布，包含 composite score 分布
  - IB Statistical Bulletin (IBO)：年度发布，包含全球/地区 DP 成绩统计

  **动手做法**：WebSearch 然后手动下载 1-2 份最新 PDF，放到 `data/raw/海外/` 目录。

- [ ] **Step 2: Schema 兼容性检查**

  用现有 `AdmissionRecord` 模型模拟一条海外数据，检查字段兼容性：
  - `examCategory: 'sat'`：✅ schema 支持
  - `province: '全国'`：SAT/ACT/AP 数据通常不按省分
  - `year`: 年度报告年份
  - `minScore / avgScore`: SAT 总分 400-1600 / ACT 1-36
  - `subjectGroup`: 不需要
  - `batch`: 不需要
  - `granularity: 'institution'`: 暂时用 institution 级别
  - `institutionName: 'SAT National'` 等占位

  **结论**：现有 schema 可以容纳海外数据，不需要 schema 变更。但需要一个独立的 `OverseasSourceRegistry`（类比 `SCHOOL_SOURCE_REGISTRY`）来管理这些 research 来源。

- [ ] **Step 3: 建立最小海外来源体系**

  创建 `src/lib/import/overseas-source-registry.ts`：
  ```typescript
  interface OverseasSourceEntry {
    examCategory: 'sat' | 'act' | 'ap' | 'ib';
    title: string;
    officialUrl: string;
    sourceType: 'research-pdf' | 'research-csv';
    publicationYear: number;
    dataYear: number;
    status: 'collected' | 'searched-only' | 'todo';
    notes: string;
  }
  ```

  预置第一批条目（标记为 `searched-only`）：
  - SAT 2024/2025 Annual Report
  - ACT 2024/2025 National Profile
  - AP 2024/2025 Program Results
  - IB 2024/2025 Statistical Bulletin

- [ ] **Step 4: 验证前端兼容性**

  在数据库中手动插入一条 `examCategory: 'sat'` 的 AdmissionRecord，打开管理后台 / 前端页面，确认：
  - examCategory 下拉/筛选正常
  - 分数展示正常（SAT 400-1600）
  - 不因为 province 或 subjectGroup 为空而报错

### 海外 vs 国内：差异对照

| 维度 | 国内（gaokao） | 海外（sat/act/ap/ib） |
|------|---------------|----------------------|
| 来源性质 | 各省教育考试院定期发布 | 考试机构年度报告 PDF |
| 更新周期 | 每年 7-8 月 | 每年 9-12 月（次年报告） |
| 粒度 | province/major | national/考试级别 |
| 分数范围 | 750 分制（各省不同） | SAT 400-1600，ACT 1-36，AP 1-5，IB 1-7 |
| 下载稳定性 | 固定 URL 长期有效 | 报告 URL 可能跨年变更 |
| 处理方式 | 自动 fetch + parse + load | 手动收集 + research scope |

### 建议：海外数据分两阶段推进

**阶段 A（本周）**：完成上述 Step 1-4，建立最小骨架
**阶段 B（下周）**：当 `overseas-source-registry.ts` 有 4+ 条已收集来源后，再决定是否需要独立的 `overseas-fetch.ts` / `overseas-parser.ts`，还是复用现有链路只换 registry

---

## 后续建议优先级总结

按推荐执行顺序排列：

### 🥇 优先级一：直接变现（1 次执行即可）
> 清理 stale normalized → `import:load` → `import:report`  
> 产出：BIT 7983 majors 入库，HIT 34 majors 通过 synthetic parent 入库，河北/山东落库确认  
> 文件：无代码改动，仅清理 + 执行

### 🥈 优先级二：NJU AJAX 抓包（5-15 分钟）
> Playwright 脚本 → 确认端点 → 填入配置 → `import:fetch --province=全国`  
> 产出：NJU filter-page 可自动化拉取全省份×3年数据  
> 文件：新增 `scripts/sniff-nju-ajax.py`，修改 `fetch-official-sources.ts` + `fetchOne()`

### 🥉 优先级三：省级补完（30 分钟）
> 3A 贵州历史类：获取 PDF URL → 新增 source registry → `import:fetch`
> 3B 辽宁：预置 `review` 态（等官方发布）
> 3C 湖南本科批：搜索公告 → 新增 source registry
> 产出：贵州历史类入库，辽宁待发布预置，湖南本科批新增
> 文件：修改 `source-registry.ts`

### 🏅 优先级四：海外研究启动（1-2 小时）
> 手动收集 PDF → Schema 兼容性验证 → 预置 OverseasSourceRegistry → 前端兼容性测试
> 产出：海外数据体系从零到骨架
> 文件：新增 `src/lib/import/overseas-source-registry.ts`，无 schema 变更
