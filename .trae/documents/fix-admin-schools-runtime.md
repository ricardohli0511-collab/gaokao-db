# 修复 admin/schools 页面 Runtime TypeError

## 问题
`src/app/admin/schools/page.tsx` L264：`institutions.length` 报错 `undefined is not an object`，说明 API `/api/admin/institutions` 返回数据格式异常导致 `institutions` 为 `undefined`。

## 修复方案
1. 在 `schools/page.tsx` 中将 `institutions` 初始值改为空数组 `[]`，并检查 API 返回是否异常
2. 检查 `/api/admin/institutions` 路由是否有问题

## 变更文件
- `src/app/admin/schools/page.tsx`：修复 `institutions` 初始化和防御性检查

## 验证
- 页面正常加载不再报错
- `npm run build` 通过
