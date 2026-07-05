# 升学数据库 - 排版修复与全面优化计划

## 一、概述

对"升学数据库"项目进行全面排版修复和代码架构优化，同时翻新设计系统，
消除 AI 痕迹，提升专业感和可维护性。

**目标用户**：高考考生及家长（查询录取数据）、数据管理员（后台导入管理）
**使用场景**：桌面/手机浏览器查询高校历年录取分数线、位次、专业数据

---

## 二、现状分析

### 2.1 已发现的排版问题

| # | 问题 | 严重度 | 涉及文件 |
|---|------|--------|---------|
| 1 | **暖白背景 #f9f9f6 是 AI 默认色** — 触犯 impeccable 禁令 | P0 | globals.css |
| 2 | **Eyebrow 文字模式** — "admissions"/"query" + 两侧装饰线重复出现 | P0 | page.tsx, query/page.tsx |
| 3 | **页面背景不一致** — globals.css 定义 #f9f9f6，但页面用 bg-white | P1 | globals.css, page.tsx, query/page.tsx |
| 4 | **select 下拉箭头 SVG 重复** — 内联 data URL 在 4 处重复 | P1 | page.tsx, query/page.tsx, school/[id]/page.tsx |
| 5 | **灰度文字对比度偏低** — gray-400/gray-500 在 #f9f9f6 背景上可能不足 4.5:1 | P1 | 多个文件 |
| 6 | **query 页双 Footer** — 页面内 `<footer>` + 全局 `<Footer />` | P2 | query/page.tsx L1394-1414 |
| 7 | **query 页筛选面板按钮无 hover 效果** — inline style 缺少交互态 | P2 | query/page.tsx L1185-1199 |
| 8 | **学校详情页 header 有两组返回按钮** — 顶部 Link + header 内 button | P2 | school/[id]/page.tsx L250-258, L277-285 |

### 2.2 已发现的代码架构问题

| # | 问题 | 严重度 | 涉及文件 |
|---|------|--------|---------|
| 9 | **PageHeader 重复 3 次** — 深蓝渐变+圆点图案 header 在 home/query/school 三页复制粘贴 | P0 | page.tsx, query/page.tsx, school/[id]/page.tsx |
| 10 | **Noto_Serif_SC 字体 3 次独立加载** — 每页各自 import，增加 bundle | P0 | page.tsx, query/page.tsx, school/[id]/page.tsx |
| 11 | **CSS 变量利用不足** — 仅 2 个变量（--background, --foreground），品牌色硬编码 | P1 | globals.css |
| 12 | **JS hover 效果冗余** — 大量 onMouseEnter/onMouseLeave 替代 CSS `hover:` | P1 | page.tsx, school/[id]/page.tsx |
| 13 | **无 reduced-motion 支持** — slideInRight 动画和 hover 位移无 @media 回退 | P1 | globals.css, 多个 inline style |
| 14 | **SelectField 组件仅首页使用** — query 页手写了相同的 select+label | P2 | page.tsx, query/page.tsx |
| 15 | **Admin 侧边栏用 emoji 作图标** — 📊🏫📋📥，不专业 | P2 | admin/layout.tsx |
| 16 | **COLORS/STYLES 常量在 query 和 school 两页各定义一份** — CATEGORY_COLORS 等 | P2 | query/page.tsx, school/[id]/page.tsx |
| 17 | **无全局 Loading/Error/Empty 状态组件** — 各页状态 UI 不一致 | P2 | 多个文件 |

---

## 三、设计方案

### 3.1 新设计系统

**核心转变**：从"暖白 AI 默认"转为"深蓝权威 + 白色底 + 金色点缀"的专业数据平台风格。

| Token | 旧值 | 新值 | 说明 |
|-------|------|------|------|
| `--background` | `#f9f9f6` (暖白) | `#ffffff` (纯白) | 去掉 AI 痕迹 |
| `--brand-dark` | `#1a1a2e` (硬编码) | `#0f172a` (slate-900) | CSS 变量统一 |
| `--brand-mid` | `#16213e` (硬编码) | `#1e293b` (slate-800) | CSS 变量统一 |
| `--brand-accent` | `#c9a96e` (硬编码) | `#b8860b` (dark goldenrod, 提高对比度) | 从 #c9a96e 升级 |
| `--brand-surface` | 无 | `#f8fafc` (slate-50) | 卡片背景 |

**注册表**：product（后台管理+数据查询工具）

### 3.2 排版层级

- **H1**: Noto Serif SC, font-black, 去掉 eyebrow 装饰线
- **H2**: Noto Serif SC, font-bold
- **Body**: Geist Sans, text-sm/text-base, 默认 #334155 (slate-700) 确保 ≥4.5:1 对比度
- **辅助文字**: slate-500, ≥4.5:1 对比度（不使用 slate-400）

### 3.3 浏览器兼容

- 目标浏览器: Chrome, Safari, Firefox, Edge 最新两个大版本
- 移动端响应式: 已用 Tailwind sm:/lg: 断点，保持

---

## 四、具体变更计划

### 阶段 1: 基础架构重构（为后续改动打底）

#### 4.1.1 建立 CSS 变量体系
**文件**: `src/app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --brand-dark: #0f172a;
  --brand-mid: #1e293b;
  --brand-accent: #b8860b;
  --brand-accent-light: rgba(184, 134, 11, 0.1);
  --brand-surface: #f8fafc;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border-default: #e2e8f0;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-brand-dark: var(--brand-dark);
  --color-brand-mid: var(--brand-mid);
  --color-brand-accent: var(--brand-accent);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-serif: var(--font-noto-serif);
}

@keyframes slideInRight { ... }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 4.1.2 字体统一加载
**文件**: `src/app/layout.tsx`

将 `Noto_Serif_SC` 从各页面移到 RootLayout，通过 CSS 变量 `--font-noto-serif` 全局使用。

移除以下文件中的字体 import：
- `src/app/page.tsx`
- `src/app/query/page.tsx`
- `src/app/school/[id]/page.tsx`
- `src/components/CompareDrawer.tsx`

#### 4.1.3 提取共享样式常量
**新建文件**: `src/lib/constants.tsx`

```typescript
// 院校分类颜色
export const CATEGORY_STYLES: Record<string, string> = { ... }
// 院校类型颜色
export const TYPE_STYLES: Record<string, string> = { ... }
// 图表色板
export const CHART_COLORS = [...]
// 招生类型列表
export const ADMISSION_TYPES = [...]
// 选科组合
export const SUBJECT_GROUPS = [...]
// 批次
export const BATCHES = [...]
```

移除以下文件中的重复定义：
- `src/app/page.tsx` (ADMISSION_TYPES, SUBJECT_GROUPS, BATCHES)
- `src/app/query/page.tsx` (ADMISSION_TYPES, CATEGORY_COLORS)
- `src/app/school/[id]/page.tsx` (CATEGORY_STYLES, TYPE_STYLES, SUBJECT_COLORS)

### 阶段 2: 共享组件提取

#### 4.2.1 PageHeader 组件
**新建文件**: `src/components/PageHeader.tsx`

Props:
- `title`: 主标题
- `subtitle?`: 副标题
- `highlightChar?`: 高亮的第一个字符（如"升"、"录"）
- `size?`: 'large' | 'medium' — 控制 padding 和字体大小

替代以下位置：
- `src/app/page.tsx` L166-199 (header section)
- `src/app/query/page.tsx` L956-988 (header section)
- `src/app/school/[id]/page.tsx` L261-368 (header section)

**重要**: 去掉 eyebrow 装饰线（AI 痕迹），改为简洁的标题+副标题结构。

#### 4.2.2 SelectField 组件提取到独立文件
**新建文件**: `src/components/SelectField.tsx`

从 `src/app/page.tsx` L75-L105 提取并增强，支持 loading 状态。

替代：
- `src/app/page.tsx` 内联定义
- `src/app/query/page.tsx` 内联 select+label 代码

#### 4.2.3 空状态组件
**新建文件**: `src/components/EmptyState.tsx`

Props:
- `icon`: ReactNode
- `title`: string
- `description?`: string
- `variant?`: 'search' | 'data' | 'error' | 'recommend'

替代 query 页和 school 页中的多处重复空状态 JSX。

#### 4.2.4 错误状态组件
**新建文件**: `src/components/ErrorState.tsx`

Props:
- `message`: string
- `onRetry?`: () => void

### 阶段 3: 排版与样式修复

#### 4.3.1 全局背景与颜色统一
- `globals.css`: `--background` 改为 `#ffffff`
- 所有页面的 `min-h-screen bg-white` → `min-h-screen`（跟随全局背景）
- `bg-gray-50` 替换为 `var(--brand-surface)` (slate-50)
- 品牌色 `#1a1a2e` / `#16213e` / `#0f3460` / `#c9a96e` 全部替换为 CSS 变量引用

#### 4.3.2 JS hover → CSS hover 迁移
将内联 `onMouseEnter`/`onMouseLeave` 的 hover 效果改为 Tailwind 的 `hover:` 前缀类。

涉及文件：
- `src/app/page.tsx` L269-276, L289-296 (按钮 hover)
- `src/app/school/[id]/page.tsx` L352-359 (加入对比按钮)

#### 4.3.3 Select 下拉箭头统一
将内联 data URL SVG 提取为全局 CSS 类或 Tailwind utility。

#### 4.3.4 query 页双 Footer 修复
**文件**: `src/app/query/page.tsx`

删除 L1394-1414 的页面内 `<footer>`（返回首页链接），改为在 `<Footer />` 组件上方显示面包屑导航（由 PageHeader 组件提供）。

#### 4.3.5 school 详情页双返回按钮修复
**文件**: `src/app/school/[id]/page.tsx`

保留 header 内的"返回"按钮，删除顶部独立的 `<Link href="/">` 返回链接（或合并为面包屑）。

#### 4.3.6 Eyebrow 文字模式移除
**文件**: `src/app/page.tsx`, `src/app/query/page.tsx`

删除 header 中的 `<div className="h-px w-10 ..."> + <span>ADMISSIONS</span> + <div className="h-px w-10 ...">` 装饰线结构。

### 阶段 4: Admin 后台优化

#### 4.4.1 侧边栏图标 SVG 化
**文件**: `src/app/admin/layout.tsx`

将 emoji 图标（📊🏫📋📥）替换为 SVG 图标。

#### 4.4.2 Admin 页面色彩统一
将 admin 页面的 `#c9a96e` 引用更新为新的 `--brand-accent` 变量。

### 阶段 5: 性能与可访问性

#### 5.0.1 Reduced motion 支持
在 `globals.css` 添加 prefers-reduced-motion 媒体查询，禁用动画和过渡。

#### 5.0.2 颜色对比度检查
确保：
- 正文文字 vs 背景 ≥ 4.5:1
- 大号文字 (≥18px) vs 背景 ≥ 3:1
- 占位符文字 ≥ 4.5:1

涉及调整：
- `text-gray-400` (placeholder) → `text-gray-500` 或更深的 gray 色值
- `text-gray-500` (辅助文字) → `text-gray-600` 确保对比度

#### 5.0.3 CompareDrawer 组件优化
**文件**: `src/components/CompareDrawer.tsx`

- 移除独立字体加载（使用全局 Noto Serif SC）
- 移除多余的 `loadCompareList`/`saveCompareList`（Zustand store 已有 persist）
- 品牌色引用更新为 CSS 变量

---

## 五、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `src/app/globals.css` | 新增 CSS 变量、reduced-motion、品牌色定义 |
| **修改** | `src/app/layout.tsx` | 加载 Noto Serif SC 字体，注入 CSS 变量 |
| **新建** | `src/lib/constants.tsx` | 共享样式常量、选项列表 |
| **新建** | `src/components/PageHeader.tsx` | 通用页面 Header 组件 |
| **新建** | `src/components/SelectField.tsx` | 通用下拉选择组件 |
| **新建** | `src/components/EmptyState.tsx` | 通用空状态组件 |
| **新建** | `src/components/ErrorState.tsx` | 通用错误状态组件 |
| **修改** | `src/app/page.tsx` | 使用新组件，移除字体Import，移除JS hover，修改颜色 |
| **修改** | `src/app/query/page.tsx` | 使用新组件，移除字体Import，移除重复常量，修复双Footer |
| **修改** | `src/app/school/[id]/page.tsx` | 使用新组件，移除字体Import，删除顶部返回链接，修改颜色 |
| **修改** | `src/components/CompareDrawer.tsx` | 移除字体Import，品牌色更新 |
| **修改** | `src/components/Footer.tsx` | 品牌色更新 |
| **修改** | `src/app/admin/layout.tsx` | emoji → SVG 图标 |
| **修改** | `src/app/admin/page.tsx` | 品牌色更新 |
| **修改** | `src/app/admin/schools/page.tsx` | 品牌色更新 |
| **修改** | `src/app/admin/records/page.tsx` | 品牌色更新 |
| **修改** | `src/app/admin/import/page.tsx` | 品牌色更新 |

---

## 六、验证步骤

1. `npm run dev` 启动开发服务器
2. 逐页检查：
   - `/` 首页 → 标题无 eyebrow 装饰线，背景纯白，按钮 hover 正常
   - `/query` 查询页 → 筛选面板正常，空/错误/数据状态正常，单 Footer
   - `/school/[id]` 详情页 → 单返回按钮，颜色统一
   - `/admin` 后台 → SVG 图标正常，颜色统一
3. 测试 reduced-motion（系统设置 → 辅助功能 → 减弱动态效果）
4. 测试移动端响应式（Chrome DevTools 设备模拟）
5. 运行 `npm run lint` 确保无错误
6. 运行 `npm run build` 确保构建成功

---

## 七、假设与决策

1. **品牌色升级**: `#c9a96e`（浅金）→ `#b8860b`（dark goldenrod），因为后者在白色背景上对比度更好（≥4.5:1 vs ~3.2:1）
2. **背景色**: `#f9f9f6` → `#ffffff`，移除 AI 痕迹
3. **Noto Serif SC**: 保留作为标题字体，这是项目唯一的品牌差异字体
4. **保持深蓝 Header**: 保留渐变背景+圆点图案（这是项目的视觉标识），但提取为 PageHeader 组件
5. **不修改业务逻辑**: 所有变更限于 UI 层（样式、组件结构），不触及 API、数据库、认证等
