# Tasks

- [x] Task 1: ResultCard 默认展示缩略趋势图
  - 修改 `src/app/query/page.tsx` 中的 ResultCard 组件
  - 在卡片闭合状态下渲染 h-28 紧凑折线图（不依赖 expandedId）
  - records 请求成功后预加载 institution 趋势数据
  - 验证: `npm run build` 通过

- [x] Task 2: RecommendCard 分数差值标签 + 动态阈值
  - 修改 `src/components/RecommendSection.tsx`
  - RecommendCard 新增 userScore prop，渲染差值标签
  - 三栏副标题从 getRecommendThresholds 动态读取
  - RecommendSection 新增 userScore prop
  - 验证: `npm run build` 通过

- [x] Task 3: 对比状态栏
  - 修改 `src/app/query/page.tsx` 和 `src/app/recommend/page.tsx`
  - 在结果区上方增加对比状态栏："已选 N 所 | 开始对比"
  - 修改 `src/components/CompareDrawer.tsx` 对比面板增加柱状图对比
  - 验证: `npm run build` 通过

- [x] Task 4: 详情页图表与年份筛选联动
  - 修改 `src/app/school/[id]/page.tsx`
  - 趋势图响应 selectedYear 筛选
  - 验证: `npm run build` 通过

- [x] Task 5: 构建验证与回归
  - `npm run build` 通过
  - `npm run lint` 0 errors, 1 预存 warning

# Task Dependencies

- Task 2 无依赖
- Task 1 无依赖
- Task 3 无依赖
- Task 4 无依赖
- Task 5 depends on Task 1, 2, 3, 4
