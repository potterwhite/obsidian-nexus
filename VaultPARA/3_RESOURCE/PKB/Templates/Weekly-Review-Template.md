---
report_uuid: <%* tR += tp.user.uuid() %>
type: week-summary
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

// Prompt for week number
let inputWeek;
while (true) {
    inputWeek = await tp.system.prompt("Enter week number (1-53):", moment().isoWeek());
    if (/^(?:[1-9]|[1-4][0-9]|5[0-3])$/.test(inputWeek)) break;
    await tp.system.suggest(["OK"], "Invalid week number. Please enter a number between 1 and 53.");
}
const weekNum = parseInt(inputWeek, 10);

// Calculate week start (Sunday) and end (Saturday)
const weekStart = moment().year(year).isoWeek(weekNum).isoWeekday(0);
const weekEnd = moment().year(year).isoWeek(weekNum).isoWeekday(6);

// Suggest file name
const suggestedFileName = `${year}-W${weekNum}-week-Review`;

tR += `title: ${year} [Week] ${weekNum} Review\n`;
tR += `week: ${weekNum}\n`;
tR += `year: ${year}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `week_start: ${weekStart.format("MMMM D, YYYY")}\n`;
tR += `week_end: ${weekEnd.format("MMMM D, YYYY")}\n`;
tR += `suggested_file_name: ${suggestedFileName}`;
%>
tags: summary/week
---

# <% year %> Week <% weekNum %> Review

## 🗓️ This Week
- Start: <% weekStart.format("MMMM D, YYYY") %>
- End: <% weekEnd.format("MMMM D, YYYY") %>
- Week: <% weekNum %>

---

## ⏱️ Weekly Task Time Statistics

```dataviewjs
const moment = window.moment;

// 获取本周起止（Sunday ~ Saturday）
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";
const weekStart = moment().year(Number(inputYear)).isoWeek(Number(inputWeek)).isoWeekday(0);
const weekEnd = moment().year(Number(inputYear)).isoWeek(Number(inputWeek)).isoWeekday(6);

// 收集所有打卡记录
let slots = []; // 每条为 {date, start, end, duration, taskName, taskFile, projectName, projectFile}

for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);
    if (!date.isValid() || date.isBefore(weekStart) || date.isAfter(weekEnd)) continue;
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

dv.header(3, `Weekly Task Time Slots (Week ${inputWeek})`);
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
let weekTotal = slots.reduce((sum, s) => sum + s.duration, 0);
dv.paragraph(`Total time this week: ${weekTotal}`);
```

---

## 📝 Weekly Summary

- Main progress:
    -
- Issues & reflections:
    -
- Next week's plan:
    -

---

## 🔗 Related Links
- [[Project_Obsidian建立Journal系统]]
- [[Related Task 1]]
- [[Related Task 2]]