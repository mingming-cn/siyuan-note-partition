## 思源笔记分区

[English](https://github.com/mingming-cn/siyuan-note-partition/blob/main/README.md)

笔记分区是一个思源笔记插件，用于在不切换真实思源工作空间的前提下，提供“工作分区”能力。

## 项目定位

- 用分区模拟工作空间切换
- 每个分区维护自己关联的笔记本集合
- 通过打开当前分区关联的笔记本、关闭未关联笔记本来控制可见范围
- 不提供安全隔离、加密或真正的工作空间级别隔离

## 当前功能

- 首次使用自动创建“默认分区”，并关联当前全部笔记本
- 支持分区添加、删除、重命名
- 支持分区与笔记本的关联管理
- 至少保留一个分区，最后一个分区不允许删除
- 顶部左侧提供“图标 + 当前分区名称”的快捷入口
- 支持从顶部菜单快速切换分区或打开分区管理界面
- 切换分区时按关联关系打开或关闭笔记本
- 新建笔记本时，自动关联到当前分区

## 当前边界

- 只支持笔记本过滤，不支持路径级过滤
- 不支持单篇笔记级关联
- 当前主入口只有顶部左侧按钮

## 技术栈

- TypeScript
- Svelte 4
- Vite 5
- Sass
- SiYuan Plugin API（`siyuan`）

## 开发

```bash
pnpm install
pnpm run dev
```

## 文档

- 详细设计见 [docs/feature-design.md](https://github.com/mingming-cn/siyuan-note-partition/blob/main/docs/feature-design.md)
- Codex 参考见 [AGENTS.md](https://github.com/mingming-cn/siyuan-note-partition/blob/main/AGENTS.md)

## 参考资料

- 思源社区文档: https://docs.siyuan-note.club/zh-Hans/reference/
- 插件开发 Quick Start: https://ld246.com/article/1723732790981
- SiYuan Plugin API: https://github.com/siyuan-note/petal
- 官方插件示例: https://github.com/siyuan-note/plugin-sample
- 虚拟工作空间插件: https://github.com/zxkmm/siyuan_fake_workspace
