---
tags: journal/daily
date: <% tp.date.now("MMMM D, YYYY") %>
project: [[Area-Journal]]
---

# Daily_Log - <% tp.file.title %>

## ✅ 今日目标 (Today's Goals)
```dataviewjs
/*
// ----------------------------
// Plan A: Search all uncompleted tasks
// ----------------------------
const yesterday = window.moment(dv.current().file.name, "MMMM D, YYYY").subtract(1, "day").format("MMMM D, YYYY");
const file = dv.page(yesterday);
if (file && file.file.tasks) {
  dv.taskList(file.file.tasks.filter(t => !t.completed), true);
} else {
  dv.paragraph("昨天没有任务或文件不存在。");
}
*/


// ----------------------------
// Plan B(More Accurate): Search all uncompleted tasks only under Tomorrow`s Plan
// ----------------------------
const yesterday = window.moment(dv.current().file.name, "MMMM D, YYYY").subtract(1, "day").format("MMMM D, YYYY");
const file = dv.page(yesterday);
if (file && file.file && file.file.path) {
    const content = await app.vault.read(app.vault.getAbstractFileByPath(file.file.path));
    const lines = content.split('\n');
    let inTomorrow = false;
    let tasks = [];
    for (let line of lines) {
        if (/^##\s*➡️?\s*明日计划/.test(line)) inTomorrow = true;
        else if (/^## /.test(line) && inTomorrow) break;
        else if (inTomorrow && /^\s*-\s*\[.\]/.test(line)) tasks.push(line);
    }
    if (tasks.length) dv.paragraph(tasks.join('\n'));
    else dv.paragraph("昨天的明日计划没有任务。");
} else {
    dv.paragraph("昨天没有任务或文件不存在。");
}
```

---

## ⏳ 时间块记录 (Time Blocks)

**请使用templater插入模板TimeBlock-Insert-Templater.md**

- [ ] Task description (start:: ) (end:: ) (task:: [[Task-UUID-Name]]) (task_name:: [[Task-Name]])

---

## 📈 今日时间分析 (Time Analysis)

```dataviewjs
const fileDateStr = window.moment().format("YYYY-MM-DD");
const tasks = dv.current().file.tasks.where(t => t.start && t.end);

function padTime(t) {
  let [h, m] = t.split(":");
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

dv.table(["任务", "开始时间", "结束时间", "时长", "分类", "项目"],
  tasks.map(t => {
    let start = padTime(t.start);
    let end = padTime(t.end);
    let startTime = new Date(fileDateStr + "T" + start);
    let endTime = new Date(fileDateStr + "T" + end);
    let duration = Math.round((endTime - startTime) / (1000 * 60));
    return [t.text, start, end, duration + " 分钟", t.category, t.task];
  })
);
```

---

## 💡 想法与反思 (Ideas & Reflections)

---

## ➡️ 明日计划 (Tomorrow's Plan)

在这里为明天做计划。当你明天创建新的每日笔记时，这些内容会出现在“今日目标”中。

- [ ]
