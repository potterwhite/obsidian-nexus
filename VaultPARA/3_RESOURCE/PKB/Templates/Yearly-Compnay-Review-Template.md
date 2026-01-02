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
// 2. 计算年度起止
// ==========================================================
const yearStart = moment().year(year).startOf("year");
const yearEnd = moment().year(year).endOf("year");

// 建议文件名
const suggestedFileName = `${year}-Company-Year-Review`;

tR += `title: ${year} Company Year Review\n`;
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
const inputYear = "<% year %>";
const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

// =========================================================
// ★★★ 1. 设置过滤配置 ★★★
// =========================================================
// 在这里输入你要过滤的关键词，不区分大小写
const targetKeywords = ["Company"];
// 如果想显示所有项目（不过滤），把下面这行设为 false
const enableFilter = true;


// =========================================================
// 2. 数据收集与处理
// =========================================================
let slots = [];

// 遍历日记文件
for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    if (!date.isValid() || date.isBefore(yearStart) || date.isAfter(yearEnd)) continue;
    if (!daily.file.tasks) continue;

    for (let t of daily.file.tasks) {
        if (!t.task_uuid || !t.start || !t.end) continue;

        let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
        let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
        let duration = Math.round((end - start) / (1000 * 60));
        if (duration <= 0) continue;

        // 获取任务关联的项目信息
        let taskPage = dv.pages().where(p => p.task_uuid === t.task_uuid).first();
        let taskName = taskPage?.task_name || taskPage?.file?.name || t.text;
		let rawProjectName = taskPage?.project ? (Array.isArray(taskPage.project) ? taskPage.project[0] : taskPage.project) : "Unknown Project";
        let projectFile = null;

        // 解析项目文件名 (修正版：支持 Link 对象和字符串)
        if (rawProjectName) {
            if (rawProjectName.path) {
                // 情况A：它是 Link 对象
                projectFile = rawProjectName.path;
                // 修正显示名称，去掉路径和后缀
                rawProjectName = rawProjectName.display || rawProjectName.path.split("/").pop().replace(".md", "");
            } else if (typeof rawProjectName === "string" && rawProjectName.startsWith("[[")) {
                // 情况B：它是纯文本字符串
                projectFile = rawProjectName.replace(/^\[\[|\]\]$/g, "").split("|")[0];
            }
        }

        // --- 🛡️ 过滤逻辑开始 (强壮版) ---
        if (enableFilter) {
            if (!projectFile) continue;
            let projectPage = dv.page(projectFile);
            if (!projectPage) continue;

            let areaVal = projectPage.area;
            if (!areaVal) continue;

            // 核心修改：无论 area 是链接、字符串还是数组，都统一转成 JSON 字符串来查
            // 这样 [[Company]] 会变成 "[[Company]]"，[ "A", "B" ] 会变成 '["A","B"]'
            // 只要包含关键词就能搜到
            let areaStr = JSON.stringify(areaVal).toLowerCase();

            let isMatch = targetKeywords.some(keyword => areaStr.includes(keyword.toLowerCase()));

            if (!isMatch) continue;
        }
        // --- 🛡️ 过滤逻辑结束 ---

        slots.push({
            dateObj: date,
            duration,
            projectName: rawProjectName,
            projectFile
        });
    }
}

// =========================================================
// 3. 数据聚合
// =========================================================
let projectTotals = {};
let monthlyStats = {};
for (let i = 0; i < 12; i++) monthlyStats[i] = { total: 0, projects: {} };

for (let s of slots) {
    // 聚合项目总耗时
    let projectKey = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;

    // 聚合月度数据
    let monthIndex = s.dateObj.month();
    if (monthlyStats[monthIndex]) {
        monthlyStats[monthIndex].total += s.duration;
        if (!monthlyStats[monthIndex].projects[projectKey]) monthlyStats[monthIndex].projects[projectKey] = 0;
        monthlyStats[monthIndex].projects[projectKey] += s.duration;
    }
}

// 计算年度总时长
let monthTotal = slots.reduce((sum, s) => sum + s.duration, 0);

// =========================================================
// 4. 渲染输出：表格部分
// =========================================================

// --- 月度表格 ---
let monthlyRows = [];
const monthNames = moment.months();
for (let i = 0; i < 12; i++) {
    let mData = monthlyStats[i];
    let totalMin = mData.total;
    let timeStr = totalMin > 0 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : "-";
    let topProjectName = "-";
    if (totalMin > 0) {
        let sorted = Object.entries(mData.projects).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            let [pName, pTime] = sorted[0];
            let cleanName = pName.includes("|") ? pName.split("|")[1].replace("]]", "") : pName.replace(/\[\[|\]\]/g, "");
            topProjectName = `${cleanName} (${(pTime / 60).toFixed(1)}h)`;
        }
    }
    monthlyRows.push([monthNames[i], timeStr, topProjectName]);
}
dv.header(3, `📅 Monthly Breakdown (${inputYear})`);
dv.table(["Month", "Total Time", "Main Focus"], monthlyRows);

// --- 项目排行榜表格 ---
let projectRows = [];
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);
for (let [project, total] of sortedProjects) {
    projectRows.push([project, `${Math.floor(total / 60)}h ${total % 60}m`, total]);
}
dv.header(3, "🏆 Project Total Time (Yearly)");
dv.table(["Project", "Time", "Minutes"], projectRows);

// =========================================================
// 5. 渲染输出：图表部分 (增加安全检查)
// =========================================================

// 准备图表数据
let projectData = [];
for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let pName = fullName.split("/").pop().trim() || "Unknown";
    let hours = Math.round(totalMin / 6) / 10;
    projectData.push({ project: pName, hours: hours });
}
projectData.sort((a, b) => b.hours - a.hours);

// ★★★ 核心修复：如果没有数据，不要渲染图表，直接显示提示 ★★★
if (projectData.length === 0) {
    dv.paragraph("⚠️ **当前过滤条件下没有数据。**");
    dv.paragraph("请检查：1. 是否有符合 `area` 要求的项目？ 2. 这些项目在今年是否有打卡记录？");
} else {

    // === 饼图 ===
    dv.header(3, "Project Share (Pie)");
    let pieYaml = projectData.map(p => `  - type: "${p.project.replace(/"/g, '\\"')}"\n    value: ${p.hours}`).join("\n");
    dv.el("div", `
\`\`\`chartsview
type: Pie
data:
${pieYaml}
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
      content: 'Total ${(monthTotal / 60).toFixed(1)}h'
\`\`\`
`);

    // === 柱状图 ===
    dv.header(3, "Project Hours (Column)");
    let colYaml = projectData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");
    dv.el("div", `
\`\`\`chartsview
type: Column
data:
${colYaml}
options:
  isStack: false
  xField: project
  yField: hours
  seriesField: project
  columnWidthRatio: 0.6
  label:
    position: top
    style: { fill: '#FFFFFF', opacity: 0.9 }
  xAxis:
    label: { autoRotate: true, rotate: 45, autoHide: false }
\`\`\`
`);

    // === 条形图 ===
    dv.header(3, "Project Hours (Bar)");
    let barYaml = projectData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");
    dv.el("div", `
\`\`\`chartsview
type: Bar
data:
${barYaml}
options:
  yField: project
  xField: hours
  seriesField: project
  barWidthRatio: 0.8
  label:
    position: right
    offset: 10
    style: { fill: "#FFFFFF" }
  legend: { position: "top-right" }
\`\`\`
`);
}

dv.paragraph(`**Total: ${monthTotal} min (${(monthTotal / 60).toFixed(1)} hours)**`);

```

---

## 📝 Yearly Summary

- **Major Milestones:**
    -
- **Reflections:**
    -
- **Goals for Next Year (<% year + 1 %>):**
    -

---

## 🔗 Related Links
- [[Project_Obsidian建立Journal系统]]
