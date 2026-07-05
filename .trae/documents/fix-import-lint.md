# 修复 admin/import/page.tsx 历史 lint 问题

## 目标
清理 `src/app/admin/import/page.tsx` 中的 3 个 `react-hooks/static-components` lint 错误。

## 问题根因
`StepBadge` 组件在 `ImportPage` 函数体内部定义（第 160-167 行），违反了 React 规则 `rerender-no-inline-components`：每次渲染都会重新创建组件，导致状态重置。

## 修复方案
将 `StepBadge` 组件提取到文件顶层（函数体外部），其他代码不变。

## 变更文件
- `src/app/admin/import/page.tsx`：将 `StepBadge` 从函数体内部移到模块顶层

## 验证
- `npm run lint` 应消除这 3 个错误
- `npm run build` 保持不变
