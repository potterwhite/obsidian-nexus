---
type: project
created: <% tp.date.now("YYYY-MM-DD") %>
status: active
area:
  - "[[Your Area Here]]"
archive: false
tags: journal/project
---

# <% tp.file.title %>



## 📋 Project Brief
Describe the project's goals, background, and significance.

## 🎯 Goals & Deliverables
- [ ] Main Goal 1
- [ ] Main Goal 2
- [ ] Deliverable/Milestone

## 🗂 Tasks
<%*
const tasks = [
  "Requirement analysis",
  "System design",
  "Data migration",
  "Automation scripting"
];
for (let i = 0; i < tasks.length; i++) {
  tR += `- [ ] Task ${i+1}: ${tasks[i]}\n`;
}
%>

## ⏳ Progress Tracking
- Current phase: Requirement/Design/Development/Testing/Delivery
- Next milestone: ______

## 📝 Notes & Retrospective
- Record important decisions, issues, and lessons learned during the project.

## 🔗 Related Links
- [[Related Document 1]]
- [[Related Daily Note]]
- [[Related Project]]

## 🗃 Archive
- Archive date: ______
- Archive reason/summary: ______

## ⏱️ Task Time Tracking (当前任务耗时统计)

```dataviewjs
// 数据收集与渲染复用共享库（路径集中在 lib_config.js）
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
lib.renderProjectTimeTable(dv, cfg);
```
