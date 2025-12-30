---
type: project
created: <% tp.date.now("YYYY-MM-DD") %>
status: active
area: "[[Your Area Here]]"
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

## ⏱️ 当前任务耗时统计

```dataviewjs
// 获取本文件所有 checklist 里的链接（只要是 checklist，不管在哪个 section）
const taskLinks = dv.current().file.tasks
    .map(t => t.text.match(/\[\[([^\]]+)\]\]/))
    .filter(m => m)
    .map(m => m[1]);

let rows = [];
let projectTotal = 0;

for (let link of taskLinks) {
    const page = dv.page(link);
    if (!page || !page.task_uuid) continue;
    const taskId = page.task_uuid;

    // 统计该 task 的总耗时
    let total = 0;
    for (let daily of dv.pages('#journal/daily')) {
        if (!daily.file.tasks) continue;
        for (let t of daily.file.tasks) {
            if (
                t.task_uuid === taskId &&
                t.start && t.end &&
                t.section && t.section.subpath && t.section.subpath.startsWith("⏳ 时间块记录")
            ) {
                let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
                let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
                total += Math.round((end - start) / (1000 * 60));
            }
        }
    }
    projectTotal += total;
    rows.push([`[[${link}|${page.task_name || page.file.name}]]`, total + " 分钟"]);
}

dv.table(["任务", "总耗时"], rows);
dv.paragraph("项目总耗时：" + projectTotal + " 分钟");


```
