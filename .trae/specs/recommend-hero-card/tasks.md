# Tasks

- [x] Task 1: 提取 RecommendSection 为共享组件
  - 从 `src/app/query/page.tsx` 中提取 RecommendSection、RecommendCard、SkeletonColumn、SkeletonCard
  - 创建 `src/components/RecommendSection.tsx`
  - 修改 `src/app/query/page.tsx` 从共享组件导入
  - 验证: `npx tsc --noEmit` 无错误

- [x] Task 2: 重构首页为推荐英雄卡片布局
  - 重写 `src/app/page.tsx`，改为推荐英雄大卡片为主、普通查询为次的布局
  - 考试轨道选择内嵌到推荐卡片内部
  - 推荐卡片包含：轨道 Tab、省份/年份/分数三个字段、"查看推荐结果"主按钮
  - 下方保留"普通查询"次级入口
  - 验证: `npm run build` 通过

- [x] Task 3: 创建 /recommend 独立路由
  - 创建 `src/app/recommend/page.tsx`（客户端组件，调用 `/api/recommend`）
  - 创建 `src/app/recommend/layout.tsx`
  - 参数不足时展示引导提示
  - 复用 RecommendSection 共享组件展示结果
  - 验证: `npm run build` 通过

- [x] Task 4: 构建验证与回归
  - 运行 `npm run build` 确认编译通过
  - 运行 `npm run lint` 确认 0 errors（1 预存 warning）

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3
