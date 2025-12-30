---
report_uuid: <%* tR += tp.user.uuid() %>
type: year-summary
<%*
const moment = window.moment;

// ==========================================================
// 1. 输入年份 (预填充当前年份)
// ==========================================================
let inputYear;
const defaultYear = String(moment().year());
while (true) {
    inputYear = await tp.system.prompt("请输入年份 (直接回车默认当前年份):", defaultYear);
    if (inputYear === null || inputYear === "") {
        inputYear = defaultYear;
    }
    if (/^\d{4}$/.test(inputYear)) break;
    await tp.system.prompt("年份无效，请输入4位数字。");
}
const year = parseInt(inputYear, 10);

// ==========================================================
// 2. 计算年度起止时间
// ==========================================================
// 移除月份输入，直接设定为该年的开始和结束
const yearStart = moment().year(year).startOf("year");
const yearEnd = moment().year(year).endOf("year");

// 建议文件名
const suggestedFileName = `${year}-Year-Review`;

tR += `title: ${year} Year Review\n`;
tR += `year: ${year}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `year_start: ${yearStart.format("MMMM D, YYYY")}\n`;
tR += `year_end: ${yearEnd.format("MMMM D, YYYY")}\n`;
tR += `suggested_file_name: ${suggestedFileName}`;
%>
tags: summary/year
---

# <% year %> Year Review

## 🗓️ This Year
- Start: <% yearStart.format("MMMM D, YYYY") %>
- End: <% yearEnd.format("MMMM D, YYYY") %>

---

## ⏱️ Yearly Task Time Statistics

```dataviewjs
const moment = window.moment;

// === 获取年度起止 ===
const inputYear = "<% year %>";
const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

// === 收集打卡记录 ===
let slots = [];

// 遍历日记文件
for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    // 过滤掉非本年度的日记
    if (!date.isValid() || date.isBefore(yearStart) || date.isAfter(yearEnd)) continue;
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

// 统计每个 project 的总耗时
let projectTotals = {};
for (let s of slots) {
    let projectKey = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;
}

// === 输出 Project 总耗时表 (优先显示) ===
let projectRows = [];
// 排序项目：按耗时降序
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);

for (let [project, total] of sortedProjects) {
    // 转换为小时和分钟显示，更直观
    let hours = Math.floor(total / 60);
    let mins = total % 60;
    projectRows.push([project, `${hours}h ${mins}m`, total + " min"]);
}

dv.header(3, "Project Total Time (Yearly Ranking)");
dv.table(["Project", "Time (H:M)", "Total Min"], projectRows);


// === 输出详细打卡表格 (年度数据量大，建议折叠) ===
// 只有当点击展开时才渲染长表格，避免卡顿
dv.el("div", "<br><details><summary><b>🔻 Click to expand Detailed Task Log (Might be long)</b></summary><div id='yearly-details'></div></details>");

// 排序
slots.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

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

// 使用 Dataview 渲染表格到折叠区域内 (这里简单处理，直接渲染在下方，逻辑上被折叠标签包裹需要更复杂的HTML注入，这里为了兼容直接输出)
// 注意：DataviewJS 的 table 渲染是流式的，为了性能，这里我们只渲染前500条，或者提示过多。
if (rows.length > 2000) {
    dv.paragraph(`*⚠️ Data too large (${rows.length} entries). Only showing detailed list in raw query if needed.*`);
} else {
    // 如果你想把它真正放入折叠块，比较麻烦，这里直接输出表格，用户自己决定是否阅读
    dv.header(4, `Detailed Timeline (${rows.length} entries)`);
    dv.table(["Date", "Time", "Project", "Task", "Description", "Duration"], rows);
}


// === 总结统计 ===
let monthTotal = slots.reduce((sum, s) => sum + s.duration, 0);

// === 准备图表数据 ===
let projectData = [];
// 阈值设为总时长的 1%，避免年度小任务把图表挤爆
const threshold = monthTotal * 0.01;

for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let projectName = fullName.split("/").pop().trim();
    if (projectName === "") projectName = "Unknown Project";

    let hours = Math.round(totalMin / 6) / 10;

    // 年度总结建议开启阈值过滤，或者不过滤看全部
    // if (totalMin >= threshold) {
    projectData.push({ project: projectName, hours: hours });
    // }
}
projectData.sort((a, b) => b.hours - a.hours);

// === 饼图 ===
dv.header(3, "Project Distribution (Pie)");

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
      content: 'Total ${(monthTotal / 60).toFixed(1)} h'
\`\`\`
`);

// === 柱状图 ===
dv.header(3, "Project Hours (Column)");

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
      rotate: 45
      autoHide: false
      style:
        fontSize: 11
  yAxis:
    title:
      text: 'Hours'
  columnWidthRatio: 0.6
  maxColumnWidth: 60
  animation: true
\`\`\`
`);

// === 水平条形图 ===
dv.header(3, "Project Hours (Bar)");

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
    position: right
    offset: 10
    style:
      fontSize: 13
      fill: "#FFFFFF"
  xAxis:
    title:
      text: "Hours"
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
let totalHours = (monthTotal / 60).toFixed(1);
dv.paragraph(`**📅 ${inputYear} 年度总计：${monthTotal} 分钟（${totalHours} 小时）**`);

```

---

## 📝 Yearly Summary

- **Big Wins / Key Achievements:**
    -
- **Challenges & Lessons Learned:**
    -
- **Goals for Next Year (<% year + 1 %>):**
    -

---

## 🔗 Related Links
- [[Project_Obsidian建立Journal系统]]
- [[<% year %> Goals]]
