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
const inputYear = "<% year %>";
const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

// === 1. 收集全年的打卡记录 ===
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
        let projectName = taskPage?.project ? (Array.isArray(taskPage.project) ? taskPage.project[0] : taskPage.project) : "Unknown Project";
        let projectFile = null;
        if (typeof projectName === "string" && projectName.startsWith("[[")) {
            projectFile = projectName.replace(/^\[\[|\]\]$/g, "");
        }

        slots.push({
            dateObj: date, // 保留 moment 对象以便后续提取月份
            duration,
            projectName,
            projectFile
        });
    }
}

// === 2. 核心计算：按月聚合 & 项目汇总 ===
let projectTotals = {};
let monthlyStats = {};
// 初始化 12 个月的数据结构
for (let i = 0; i < 12; i++) {
    monthlyStats[i] = { total: 0, projects: {} };
}

for (let s of slots) {
    // --- 累计项目总耗时 (为了后面的图表) ---
    let projectKey = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;

    // --- 累计月度数据 (为了方案1的表格) ---
    let monthIndex = s.dateObj.month(); // 0-11
    if (monthlyStats[monthIndex]) {
        monthlyStats[monthIndex].total += s.duration;
        // 记录该月内每个项目的耗时，以便找出“当月重点”
        if (!monthlyStats[monthIndex].projects[projectKey]) monthlyStats[monthIndex].projects[projectKey] = 0;
        monthlyStats[monthIndex].projects[projectKey] += s.duration;
    }
}

// === 3. 输出表格：月度趋势 (Monthly Breakdown) ===
// 替代了原本的“详细打卡记录”
let monthlyRows = [];
const monthNames = moment.months(); // ["January", "February", ...]

for (let i = 0; i < 12; i++) {
    let mData = monthlyStats[i];
    let totalMin = mData.total;

    // 只有当月有数据才显示，或者显示全部 12 个月（这里选择显示全部以便看空窗期）
    let hours = Math.floor(totalMin / 60);
    let mins = totalMin % 60;
    let timeStr = totalMin > 0 ? `${hours}h ${mins}m` : "-";

    // 找出当月耗时最多的项目
    let topProjectName = "-";
    if (totalMin > 0) {
        let sortedMonthProjects = Object.entries(mData.projects).sort((a, b) => b[1] - a[1]);
        if (sortedMonthProjects.length > 0) {
            let [pName, pTime] = sortedMonthProjects[0];
            let pHours = (pTime / 60).toFixed(1);
            // 简单清理一下项目名链接格式，让表格好看点
            let cleanName = pName.includes("|") ? pName.split("|")[1].replace("]]", "") : pName.replace(/\[\[|\]\]/g, "");
            topProjectName = `${cleanName} (${pHours}h)`;
        }
    }

    monthlyRows.push([
        monthNames[i], // 月份名
        timeStr,       // 总时长
        topProjectName // 当月重点
    ]);
}

dv.header(3, `📅 Monthly Breakdown (${inputYear})`);
dv.table(["Month", "Total Time", "Main Focus"], monthlyRows);


// === 4. 输出表格：项目总排行 (Project Rankings) ===
let projectRows = [];
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);

for (let [project, total] of sortedProjects) {
    let hours = Math.floor(total / 60);
    let mins = total % 60;
    projectRows.push([project, `${hours}h ${mins}m`, total]);
}

dv.header(3, "🏆 Project Total Time (Yearly)");
dv.table(["Project", "Time", "Minutes"], projectRows);


// =========================================================
// 下方是保留的图表数据准备逻辑
// 注意：为了兼容你原有的代码，变量名保持 monthTotal 不变
// =========================================================

// 总结统计 (这里实际计算的是年度总时长)
let monthTotal = slots.reduce((sum, s) => sum + s.duration, 0);

// === 准备图表数据：只取项目名最后一段 + 小时数 ===
let projectData = [];
// 这里你可以调整阈值，比如年度 0.01 (1%)
const threshold = monthTotal * 0.01;

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

// =========================================================
// 以下是你原有的 3 个图表代码，完全保持原样
// =========================================================

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
dv.paragraph(`**本年总计：${monthTotal} 分钟（${(monthTotal / 60).toFixed(1)} 小时）**`);

```

---

## 📝 Yearly Summary

- **Major Milestones:**
    -
- **Reflections:**

```dataviewjs
// === 1. 配置与初始化 ===
const inputYear = "<% year %>";
const targetHeader = "## 💡 想法与反思 (Ideas & Reflections)";
const moment = window.moment;

// 计算年度起止
const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

dv.paragraph(`⏳ 正在扫描 **${inputYear}** 年的反思内容并按时间排序...`);

// === 2. 获取文件列表 ===
// 这里先不排序，等提取完有了准确日期后再排
const pages = dv.pages('#journal/daily');
let results = [];

// === 3. 核心遍历逻辑 ===
for (let page of pages) {
    // A. 解析日期 (核心修复：支持多种文件名格式)
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);

    // B. 日期过滤：必须有效、且在当年内
    if (!date.isValid() || date.isBefore(yearStart) || date.isAfter(yearEnd)) continue;

    // C. 读取文件
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) continue;

    const content = await app.vault.read(file);

    // D. 提取内容
    const lines = content.split('\n');
    let isCapturing = false;
    let capturedText = [];

    for (let line of lines) {
        // 匹配标题
        if (line.trim().startsWith(targetHeader) || line.includes("💡 想法与反思")) {
            isCapturing = true;
            continue;
        }
        // 遇到下个标题停止 (以 ## 开头)
        if (isCapturing && line.trim().startsWith("## ")) {
            break;
        }
        // 收集内容
        if (isCapturing) {
            capturedText.push(line);
        }
    }

    let cleanText = capturedText.join('\n').trim();

    // E. 严格过滤：如果去除了空格后长度为0，说明没写内容，不存入
    if (cleanText.length === 0) continue;

    // F. 存入结果 (同时存入 moment 对象用于排序)
    results.push({
        link: page.file.link,
        dateObj: date, // 存这个是为了排序
        text: cleanText
    });
}

// === 4. 排序与渲染 (核心修复) ===
dv.container.innerHTML = ""; // 清除加载提示

if (results.length === 0) {
    dv.paragraph("ℹ️ 本年度没有提取到有效的反思内容。");
} else {
    // ⬇️ 关键步骤：按日期对象正序排列 (Jan -> Dec)
    results.sort((a, b) => a.dateObj - b.dateObj);

    dv.header(4, `📝 共提取到 ${results.length} 天的记录 (按时间顺序)`);

    for (let item of results) {
        // 使用 Callout 展示
        dv.paragraph(`> [!QUOTE]+ ${item.link}\n> ` + item.text.replace(/\n/g, "\n> "));
    }
}
```
- **Goals for Next Year (<% year + 1 %>):**
    -

---

## 🔗 Related Links
- [[Project_Obsidian建立Journal系统]]
