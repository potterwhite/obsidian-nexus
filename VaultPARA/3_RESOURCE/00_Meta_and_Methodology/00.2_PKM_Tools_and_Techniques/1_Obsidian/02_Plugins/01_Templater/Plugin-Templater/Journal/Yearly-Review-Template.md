---
report_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
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
    if (inputYear === null || inputYear === "") inputYear = defaultYear;
    if (/^\d{4}$/.test(inputYear)) break;
    await tp.system.prompt("年份无效，请输入4位数字。");
}
const year = parseInt(inputYear, 10);

// ==========================================================
// 2. 计算年度起止（对象构造，避免 2 月 29 日溢出）
// ==========================================================
const yearStart = moment({ year: year, month: 0, day: 1 }).startOf("year");
const yearEnd = moment({ year: year, month: 0, day: 1 }).endOf("year");

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
<%*
// 统一自动改名（CONS-4）；失败时给用户可见提示而不是中断模板
try {
    await tp.file.rename(suggestedFileName);
} catch (e) {
    new Notice(`⚠️ 自动重命名失败（可能同名文件已存在）: ${suggestedFileName}`, 8000);
}
_%>

# 🗓️ <% year %> Year Review

- **Start (开始)**: <% yearStart.format("MMMM D, YYYY") %>
- **End (结束)**: <% yearEnd.format("MMMM D, YYYY") %>

---

## 💡 Ideas & Reflections (想法与反思)

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
// 与周/月报共用同一套实现：批量渲染（CONS-1）+ AI 复制按钮（CONS-2）
await lib.renderReflectionSection(dv, app, cfg, "<% yearStart.format("YYYY-MM-DD") %>", "<% yearEnd.format("YYYY-MM-DD") %>");
```

## ⏱️ Yearly Task Time Statistics (年度任务时间统计)

```dataviewjs
// 年度专属布局（月度趋势 + 项目排行 + 分页大图），数据收集复用共享库
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
const moment = window.moment;

const { slots, warnings } = lib.collectTimeSlots(dv, cfg, "<% yearStart.format("YYYY-MM-DD") %>", "<% yearEnd.format("YYYY-MM-DD") %>");

// -----------------------------------------------------------
// 辅助函数：插入强制分页符 (Page Break Helper)
// -----------------------------------------------------------
function insertPageBreak() {
    dv.el("div", "", { attr: { style: "page-break-after: always; height: 0; overflow: hidden;" } });
}

// -----------------------------------------------------------
// 1. 按月聚合 & 项目汇总
// -----------------------------------------------------------
let projectTotals = {};
let monthlyStats = {};
for (let i = 0; i < 12; i++) monthlyStats[i] = { total: 0, projects: {} };

for (let s of slots) {
    const cleanName = lib.getCleanProjectName(s.projectName);
    const projectKey = s.projectFile ? `[[${s.projectFile}|${cleanName}]]` : cleanName;

    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;

    const monthIndex = s.dateObj.month(); // 0-11
    monthlyStats[monthIndex].total += s.duration;
    if (!monthlyStats[monthIndex].projects[projectKey]) monthlyStats[monthIndex].projects[projectKey] = 0;
    monthlyStats[monthIndex].projects[projectKey] += s.duration;
}

// -----------------------------------------------------------
// 2. 表格：月度趋势 (Monthly Breakdown)
// -----------------------------------------------------------
let monthlyRows = [];
const monthNames = moment.months();

for (let i = 0; i < 12; i++) {
    let mData = monthlyStats[i];
    let totalMin = mData.total;
    let hours = Math.floor(totalMin / 60);
    let mins = totalMin % 60;
    let timeStr = totalMin > 0 ? `${hours}h ${mins}m` : "-";

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

dv.header(3, `📅 Monthly Breakdown (月度趋势, <% year %>)`);
dv.table(["Month", "Total Time", "Main Focus"], monthlyRows);

// -----------------------------------------------------------
// 3. 表格：项目总排行 (Project Rankings)
// -----------------------------------------------------------
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);
dv.header(3, "🏆 Project Total Time (项目年度排行)");
dv.table(["Project", "Time", "Minutes"], sortedProjects.map(([project, total]) => [
    project, `${Math.floor(total / 60)}h ${total % 60}m`, total
]));

// -----------------------------------------------------------
// 4. 图表数据准备
// -----------------------------------------------------------
let totalMinutes = slots.reduce((sum, s) => sum + s.duration, 0);
let totalHours = totalMinutes / 60;

let projectData = [];
for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let projectName = fullName.split("/").pop().replace(/\.md$/i, "").trim() || "Unknown Project";
    projectData.push({
        project: projectName,
        hours: Math.round(totalMin / 6) / 10,
        minutes: totalMin
    });
}
projectData.sort((a, b) => b.hours - a.hours);

// === 图表 A：工作权重分布 (Pie) ===
dv.header(3, "A. 工作权重分布 (Pie)");
let pieYamlData = projectData.map(p => `  - type: "${p.project.replace(/"/g, '\\"')}"\n    value: ${p.hours}`).join("\n");
dv.el("div", `
\`\`\`chartsview
type: Pie
data:
${pieYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: 500
  autoFit: false
  angleField: value
  colorField: type
  innerRadius: 0.6
  legend:
    position: "right"
    minWidth: 250
    itemWidth: null
    flipPage: true
    maxRow: 22
  label:
    type: inner
    content: "{percentage}"
    style:
      fontSize: 10
  statistic:
    title: false
    content:
      content: '总 ${totalHours.toFixed(1)} h'
  animation: false
\`\`\`
`);

insertPageBreak();

// === 图表 B：项目工时对比 (Column，前 40 名，竖排文字) ===
dv.header(3, "B. 项目工时对比 (Column)");
// ⚡️ 只取前 40 名：渲染 100+ 个竖排柱状图是卡顿的元凶
let topProjects = projectData.slice(0, 40);
// 把 "项目名称" 变成竖排 "项\n目\n名\n称"
let columnYamlData = topProjects.map(p => {
    let vertName = p.project.split("").join("\n");
    let safeName = vertName.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    return `  - project: "${safeName}"\n    hours: ${p.hours}`;
}).join("\n");
dv.el("div", `
\`\`\`chartsview
type: Column
data:
${columnYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: 720
  autoFit: false
  isStack: false
  xField: project
  yField: hours
  seriesField: project
  legend: false
  label:
    position: top
    offsetY: 8
    style:
      fontSize: 12
      fill: '#666'
      opacity: 0.9
      fontWeight: 'bold'
  xAxis:
    label:
      autoRotate: true
      rotate: 0
      autoHide: false
      style:
        fontSize: 11
        fontWeight: 'bold'
        lineHeight: 14
        textAlign: 'center'
  yAxis:
    title:
      text: '小时数 (h)'
  columnWidthRatio: 0.7
  animation: false
\`\`\`
`);

insertPageBreak();

// === 图表 C：项目工时排行 (Bar，分页) ===
dv.header(3, "C. 项目工时排行 (Bar)");
const pageSize = 22;  // 每页 20-25 个最适合 A4/A3 横向
const totalPages = Math.ceil(projectData.length / pageSize);

for (let i = 0; i < totalPages; i++) {
    let pageData = projectData.slice(i * pageSize, (i + 1) * pageSize);
    // 注意：这里必须用 pageData（分页切片），用 projectData 会让每页都渲染全量
    let barYamlData = pageData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");
    let pageHeight = Math.max(300, pageData.length * 40);

    let titleStr = i === 0 ? "" : `**C. 排行榜 (续 - Part ${i + 1})**`;
    if (titleStr) dv.paragraph(titleStr);

    dv.el("div", `
\`\`\`chartsview
type: Bar
data:
${barYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: ${pageHeight}
  autoFit: false
  yField: project
  xField: hours
  seriesField: project
  barWidthRatio: 0.6
  maxBarWidth: 40
  label:
    position: right
    offset: 10
    style:
      fontSize: 13
      fill: "#666"
  xAxis:
    title:
      text: "小时数 (h)"
    position: "top"
  yAxis:
    label:
      autoEllipsis: false
      style:
        fontSize: 12
        fontWeight: 'bold'
  legend: false
  animation: false
\`\`\`
`, { attr: { style: "width: 1000px; margin: 0 auto;" } });

    if (i < totalPages - 1) insertPageBreak();
}

insertPageBreak();

// === 底部：详细数据汇总表 ===
dv.header(3, "D. 数据汇总表 (Data Table)");
dv.paragraph(`**年度总计 (Year Total)：${totalMinutes} 分钟 (约 ${totalHours.toFixed(1)} 小时)**`);
dv.table(
    ["项目名称", "分钟 (min)", "小时 (h)", "占比"],
    projectData.map(p => [
        p.project,
        p.minutes,
        p.hours,
        totalMinutes > 0 ? (p.minutes / totalMinutes * 100).toFixed(1) + "%" : "0.0%"
    ])
);

// 被跳过的数据让用户看见（CONS-3）
lib.renderWarnings(dv, warnings);
```

---

## 📝 Yearly Summary (年度总结)

#### **Major Milestones (重大里程碑):**
- 
#### **Reflections (反思):**
- 
#### **Goals for Next Year (<% year + 1 %> 年目标):**
- 

---

## 🔗 Related Links (相关链接)
- [[Project_Obsidian-Nexus]]
