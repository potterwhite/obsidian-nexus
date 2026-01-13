---
report_uuid: <%* tR += tp.user.uuid() %>
type: month-summary
<%*
const moment = window.moment;

// ==========================================================
// 1. 输入年份 (优化版：预填充当前年份，直接回车即可)
// ==========================================================
let inputYear;
const defaultYear = String(moment().year());
while (true) {
    // 第二个参数 defaultYear 会让输入框默认填好年份
    inputYear = await tp.system.prompt("请输入年份 (直接回车默认当前年份):", defaultYear);

    // 如果用户点了取消或没输入，就用默认年份兜底
    if (inputYear === null || inputYear === "") {
        inputYear = defaultYear;
    }

    if (/^\d{4}$/.test(inputYear)) break;
    await tp.system.prompt("年份无效，请输入4位数字。");
}
const year = parseInt(inputYear, 10);


// Prompt for month number
let inputMonth;
while (true) {
    inputMonth = await tp.system.prompt("Enter month number (1-12):", moment().month() + 1);
    if (/^(?:[1-9]|1[0-2])$/.test(inputMonth)) break;
    await tp.system.suggester(["OK"], "Invalid month. Please enter a number between 1 and 12.");
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
            projectFile,
            text: t.text
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
    let displayText = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;
    rows.push([
        s.date,
        `${s.start}-${s.end}`,
        projectLink,
        taskLink,
        displayText,
        s.duration + " min"
    ]);
}

dv.header(3, `Monthly Task Time Slots (${inputYear}-${inputMonth})`);
dv.table(["Date", "Time", "Project", "Task", "Description", "Duration"], rows);

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
    projectRows.push([project, total]);
}

projectRows.sort((a, b) => b[1] - a[1]);
// 修改开始：增加小时显示逻辑
let formattedProjectRows = projectRows.map(row => {
    let total = row[1];
    let h = Math.floor(total / 60);
    let m = total % 60;

    // 如果超过1小时，显示 "总分钟 (X小时 Y分钟)"，否则只显示分钟
    let timeString = (h > 0)
        ? `${total} min (${h}hour ${m}min)`
        : `${total} min`;

    return [row[0], timeString];
});
// 修改结束

dv.header(3, "Project Total Time");
if (formattedProjectRows.length > 0) {
    dv.table(["Project", "Total Time"], formattedProjectRows);
} else {
    dv.paragraph("No project found。");
}


// 总结统计
let monthTotal = slots.reduce((sum, s) => sum + s.duration, 0);

// === 准备图表数据：只取项目名最后一段 + 小时数 ===
let projectData = [];
const threshold = monthTotal * 0.03; // 仍保留阈值，用于过滤太小的项目（而不是归入“其他”）

for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    // 提取干净的项目名：去掉 [[ ]] 和 | 显示文字，取路径最后一段
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let projectName = fullName.split("/").pop().trim(); // 只取最后一段
    if (projectName === "") projectName = "Unknown Project";

    let hours = Math.round(totalMin / 6) / 10; // 保留一位小数

    /*// 只保留占总时长 3% 以上的项目（小项目直接忽略，不显示“其他”）
    if (totalMin >= threshold) {
        projectData.push({ project: projectName, hours: hours });
    }*/
    projectData.push({ project: projectName, hours: hours });
}
// 从大到小排序
projectData.sort((a, b) => b.hours - a.hours);

// === 饼图：项目时间占比 ===
dv.header(3, "项目时间占比（饼图）");

let pieYamlData = projectData.map(p => {
    let safeName = p.project.replace(/"/g, '\\"');
    return `  - type: "${safeName}"\n    value: ${p.hours.toFixed(1)}`;
}).join("\n");

dv.el("div", `
\`\`\`chartsview
type: Pie
data:
${pieYamlData}
options:
  angleField: value
  colorField: type
  innerRadius: 0.6
  label:
    type: inner
    content: "{percentage}"
  statistic:
    title: false
    content:
      content: '总 ${(monthTotal / 60).toFixed(1)} h'
\`\`\`
`);

// === 柱状图：项目总时长（已修复）===
dv.header(3, "项目总时长（柱状图）");

let columnYamlData = projectData.map(p => {
    let safeName = p.project.replace(/"/g, '\\"');
    return `  - project: "${safeName}"\n    hours: ${p.hours.toFixed(1)}`;
}).join("\n");

dv.el("div", `
\`\`\`chartsview
type: Column
data:
${columnYamlData}
options:
  isStack: false
  xField: project
  yField: hours
  seriesField: project
  label:
    position: top
    style:
      fontSize: 12
      fill: '#FFFFFF'
      opacity: 0.9
  xAxis:
    label:
      autoRotate: true
      rotate: 45          # 强制45度倾斜，彻底避免重叠
      autoHide: false     # 关闭自动隐藏，所有标签都显示
      style:
        fontSize: 11
  yAxis:
    title:
      text: '小时数'
  columnWidthRatio: 0.6   # 柱子宽度适中
  maxColumnWidth: 60      # 防止柱子太宽
  animation: true
\`\`\`
`);

// === 项目总时长（水平条形图 - 已修复）===
dv.header(3, "项目总时长（水平条形图）");

let barYamlData = projectData.map(p => {
    let safeName = p.project.replace(/"/g, '\\"');
    return `  - project: "${safeName}"\n    hours: ${p.hours.toFixed(1)}`;
}).join("\n");

dv.el("div", `
\`\`\`chartsview
type: Bar
data:
${barYamlData}
options:
  yField: project
  xField: hours
  seriesField: project
  barWidthRatio: 0.8
  maxBarWidth: 40
  label:
    position: right    # 让数字显示在条形图右侧
    offset: 10
    style:
      fontSize: 13
      fill: "#FFFFFF"  # 数字颜色
  xAxis:
    title:
      text: "小时数"
  yAxis:
    label:
      style:
        fontSize: 12
  legend:
    position: "top-right"
  animation: true
\`\`\`
`);

// === 总计 ===
dv.paragraph(`**本月总计：${monthTotal} 分钟（${(monthTotal / 60).toFixed(1)} 小时）**`);


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