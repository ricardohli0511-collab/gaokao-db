# Tasks

- [x] Task 1: 新增 EXAM_CATEGORIES 考试分组定义与工具函数
  - 在 `src/lib/constants.tsx` 末尾追加 `ExamCategoryConfig` 接口和 `EXAM_CATEGORIES` 对象
  - 追加 `getRecommendThresholds`、`getExamCategoryByType`、`formatScoreForDisplay` 工具函数
  - 验证: `npx tsc --noEmit src/lib/constants.tsx` 无错误

- [x] Task 2: 改造推荐 API 使用动态阈值
  - 修改 `src/app/api/recommend/route.ts`
  - 读取 `examCategory` 参数，调用 `getRecommendThresholds` 计算阈值
  - 验证: `npx tsc --noEmit src/app/api/recommend/route.ts` 无错误

- [x] Task 3: Records API 增加 examCategory 过滤支持
  - 修改 `src/app/api/records/route.ts`
  - 当传入 `examCategory` 时自动展开为对应 `admissionType in [...]` 过滤
  - 验证: `npx tsc --noEmit src/app/api/records/route.ts` 无错误

- [x] Task 4: 首页改为考试轨道选择 + 条件表单
  - 重写 `src/app/page.tsx`
  - 实现两步式体验：先选轨道（国内高考/国际升学），再填表单
  - 国内高考表单：省份/年份/分数/选科/批次
  - 国际升学表单：IB/A-Level/DSE 子切换 + 年份 + 分数/等级
  - 查询和推荐按钮跳转时携带 `exam` 和 `examCategory` 参数

- [x] Task 5: 查询页支持考试分类参数
  - 修改 `src/app/query/page.tsx`
  - 读取 `exam` 和 `examCategory` 路由参数
  - `buildSearchParams` 始终携带 `exam` 和 `examCategory`
  - 查询/推荐 API 请求携带 `examCategory`
  - 国际考试结果卡隐藏"最低位次"列

- [x] Task 6: 院校详情页国际考试字段隐藏
  - 修改 `src/app/school/[id]/page.tsx`
  - 根据 `admissionType` 判断是否国际考试
  - 国际考试隐藏"最低位次"表格列

- [x] Task 7: 构建验证与回归
  - 运行 `npm run build` 确认编译通过
  - 运行 `npm run lint` 确认无新增错误

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 1
- Task 6 无依赖
- Task 7 depends on Task 2, Task 3, Task 4, Task 5, Task 6
