---
report_uuid: <%* tR += tp.user.uuid() %>
type: month-summary
<%*
const moment = window.moment;

// Prompt for year
let inputYear;
while (true) {
    inputYear = await tp.system.prompt("Enter year (e.g. 2025):", moment().year());
    if (/^\d{4}$/.test(inputYear)) break;
    await tp.system.suggest(["OK"], "Invalid year. Please enter a 4-digit year.");
}
const year = parseInt(inputYear, 10);

// Prompt for month number
let inputMonth;
while (true) {
    inputMonth = await tp.system.prompt("Enter month number (1-12):", moment().month() + 1);
    if (/^(?:[1-9]|1[0-2])$/.test(inputMonth)) break;
    await tp.system.suggest(["OK"], "Invalid month. Please enter a number between 1 and 12.");
}
const monthNum = parseInt(inputMonth, 10);

// Calculate month start and end
const monthStart = moment().year(year).month(monthNum - 1).startOf("month");
const monthEnd = moment().year(year).month(monthNum - 1).endOf("month");

// Suggest file name
const suggestedFileName = `${year}-M${monthNum}-month-Review`;

tR += `title: ${year} Month ${monthNum} Review\n`;
tR += `month: ${monthNum}\n`;
tR += `year: ${year}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `month_start: ${monthStart.format("MMMM D, YYYY")}\n`;
tR += `month_end: ${monthEnd.format("MMMM D, YYYY")}\n`;
tR += `suggested_file_name: ${suggestedFileName}`;
%>
tags: summary/month
---

# <% year %> Month <% monthNum %> Review

## 🗓️ This Month
- Start: <% monthStart.format("MMMM D, YYYY") %>
- End: <% monthEnd.format("MMMM D, YYYY") %>
- Month: <% monthNum %>

---

## ⏱️ Monthly Task Time Statistics

```dataviewjs
const moment = window.moment;

// 获取本月起止
const inputYear = "<% year %>";
const inputMonth = "<% monthNum %>";
const monthStart = moment().year(Number(inputYear)).month(Number(inputMonth) - 1).startOf("month");
const monthEnd = moment().year(Number(inputYear)).month(Number(inputMonth) - 1).endOf("month");

// 收集所有打卡记录
let slots = [];

for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);
    if (!date.isValid() || date.isBefore(monthStart) || date.isAfter(monthEnd)) continue;
    if (!daily.file.tasks) continue;

    for (let t of daily.file.tasks) {
        if (!t.task_uuid || !t.start || !t.end) continue;
        let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
        let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
        let duration = Math.round((end - start) / (1000 * 60));
        if (duration <= 0) continue;

        let taskPage = dv.pages().where(p => p.task_uuid === t.task_uuid).first();
        let taskName = taskPage?.task_name || taskPage?.file?.name || t.text;
        let taskFile = taskPage?.file?.name;
        let projectName = taskPage?.project ? (Array.isArray(taskPage.project) ? taskPage.project[0] : taskPage.project) : "Unknown Project";
        let projectFile = null;
        if (typeof projectName === "string" && projectName.startsWith("[[")) {
            projectFile = projectName.replace(/^\[\[|\]\]$/g, "");
        }
        slots.push({
            date: date.format("YYYY-MM-DD"),
            start: t.start,
            end: t.end,
            duration,
            taskName,
            taskFile,
            projectName,
            projectFile
        });
    }
}

// 排序，默认升序（asc），如需降序改为 slots.sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
slots.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

// 输出详细打卡表格
let rows = [];
for (let s of slots) {
    let projectLink = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    let taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;
    rows.push([
        s.date,
        `${s.start}-${s.end}`,
        projectLink,
        taskLink,
        s.duration + " min"
    ]);
}

dv.header(3, `Monthly Task Time Slots (${inputYear}-${inputMonth})`);
dv.table(["Date", "Time", "Project", "Task", "Duration"], rows);

// 统计每个 project 的总耗时
let projectTotals = {};
for (let s of slots) {
    let projectKey = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;
}

// 输出 project 总耗时表
let projectRows = [];
for (let [project, total] of Object.entries(projectTotals)) {
    projectRows.push([project, total + " min"]);
}

dv.header(3, "Project Total Time");
dv.table(["Project", "Total Time (min)"], projectRows);

// 总结统计
let monthTotal = slots.reduce((sum, s) => sum + s.duration, 0);
dv.paragraph(`Total time this month: ${monthTotal} min`);
```

---

## 📝 Monthly Summary

- Main progress:
    -
- Issues & reflections:
    -
- Next month's plan:
    -

---

## 🔗 Related Links
- [[Project_Obsidian建立Journal系统]]
- [[Related Task 1]]
- [[Related Task 2]]