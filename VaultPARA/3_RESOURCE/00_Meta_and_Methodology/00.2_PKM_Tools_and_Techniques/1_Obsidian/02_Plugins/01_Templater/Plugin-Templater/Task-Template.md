---
# 全局唯一ID，建议用uuid或项目名+简短描述
task_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
task_name: <% tp.file.title %>
project:
  - "[[Project_Markdown_FILE_NAME]]"
created: <% tp.date.now("YYYY-MM-DD") %>
status: todo                          # todo, doing, done, cancelled
priority: medium                      # 可选: low, medium, high
tags: journal/task
# 可扩展更多属性，如 deadline, owner, etc.
---

# <% tp.file.title %>

## 任务描述
请填写任务目标、背景、预期成果等。

## 进展记录
- [ ] <% tp.date.now("YYYY-MM-DD") %> 在 [[<% tp.date.now("MMMM D, YYYY") %>]] 完成阶段性工作

## 相关链接
- [[wiki_url]]

## 统计进展情况 (Time Tracking)
```dataviewjs
// 数据收集与渲染复用共享库（路径集中在 lib_config.js）
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
lib.renderTaskTimeTable(dv, cfg);
```