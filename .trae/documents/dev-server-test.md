# 启动开发服务器测试

## 目标
启动 `npm run dev` 开发服务器，打开浏览器预览，验证之前的排版修复和优化是否正常运行。

## 步骤
1. 运行 `npm run dev` 启动 Next.js 开发服务器
2. 获取本地预览 URL（默认 http://localhost:3000）
3. 使用 OpenPreview 工具在浏览器中打开

## 验证范围
- `/` 首页 → 标题无 eyebrow 装饰线，背景纯白，按钮 hover 正常
- `/query` 查询页 → 筛选面板正常，单 Footer
- `/school/[id]` 详情页 → 单返回按钮，颜色统一
- `/admin` 后台 → SVG 图标正常
