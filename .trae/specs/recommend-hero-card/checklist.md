# Checklist

- [x] RecommendSection 共享组件已从 query/page.tsx 提取到 components/RecommendSection.tsx
- [x] 首页展示推荐英雄大卡片（内置轨道切换 + 省份/年份/分数）
- [x] 首页保留"普通查询"次级入口链接
- [x] 推荐卡片内点击按钮跳转 `/recommend?exam=...&province=...&year=...&score=...`
- [x] `/recommend` 路由独立可访问，展示头图 + 分数摘要 + 三栏推荐结果
- [x] `/recommend` 参数不足时展示引导提示
- [x] `/query?mode=recommend` 继续正常工作（复用共享组件）
- [x] `npm run build` 通过
- [x] `npm run lint` 无新增错误（0 errors, 1 预存 warning）
