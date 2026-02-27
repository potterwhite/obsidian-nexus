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

## 💡 Ideas & Reflections Look Back
```dataviewjs
// ==========================================================
// 📝 PART 1: 想法与反思提取 (Metadata 预检查优化版)
// ==========================================================
const moment = window.moment;
// 🟢 请确保这里的年份和 Part 2 一致，或者手动写死 "2025"
const inputYear = "<% year %>"; 
const targetSection = "想法与反思"; // 你的标题关键词，不需要写 #

const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

// 🟢 1. 创建一个容器用于显示状态，稍后我们可以修改它
const container = dv.el("div", `*⏳ 正在智能扫描 ${inputYear} 年的日记...*`);

const journalPages = dv.pages('#journal/daily');
let reflectionResults = [];

// ⏱️ 性能优化核心：遍历处理
for (let page of journalPages) {
    // 1. 日期快速过滤
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
    if (!date.isValid() || date.isBefore(yearStart) || date.isAfter(yearEnd)) continue;

    // 2. 🚀【核心优化】先查缓存，不读文件！
    // 获取 Obsidian 对该文件的元数据缓存
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) continue;
    
    const fileCache = app.metadataCache.getFileCache(file);
    // 如果缓存里没有 headers 属性，或者 headers 里找不到包含关键词的标题，直接跳过
    // 这样就避免了 90% 不必要的硬盘读取
    let hasTargetHeader = false;
    if (fileCache && fileCache.headings) {
        hasTargetHeader = fileCache.headings.some(h => h.heading.includes(targetSection));
    }

    if (!hasTargetHeader) continue;

    // 3. 只有确认有标题了，才进行昂贵的读取操作
    const content = await app.vault.read(file);
    const lines = content.split('\n');
    let isCapturing = false;
    let capturedText = [];
    
    // 提取内容逻辑
    for (let line of lines) {
        // 兼容带 Emoji 或不带的情况
        if (line.trim().includes(targetSection) && line.trim().startsWith("#")) {
            isCapturing = true;
            continue;
        }
        if (isCapturing && line.trim().startsWith("## ")) break;
        if (isCapturing) capturedText.push(line);
    }
    
    const rawText = capturedText.join('\n');
    // 再次过滤空内容
    if (/[a-zA-Z0-9\u4e00-\u9fa5]/.test(rawText)) {
        reflectionResults.push({
            link: page.file.link,
            dateObj: date,
            text: rawText.trim()
        });
    }
}

// 4. 扫描完成后，清空状态文字，或者替换为统计信息
// container.innerText = ""; // 直接清空，不占用空间
// 如果你想显示总结，可以用: 
container.innerText = `✅ 扫描完成，共 ${reflectionResults.length} 条`;

if (reflectionResults.length === 0) {
    dv.paragraph("> *No reflections found for this year.*");
} else {
    reflectionResults.sort((a, b) => a.dateObj - b.dateObj);
    dv.paragraph(`**📅 共提取到 ${reflectionResults.length} 天的记录**`);
    for (let item of reflectionResults) {
        dv.paragraph(`> [!QUOTE]+ ${item.link}\n> ` + item.text.replace(/\n/g, "\n> "));
    }
}
```

## ⏱️ Yearly Task Time Statistics

```dataviewjs
const moment = window.moment;
const inputYear = "<% year %>";
const yearStart = moment().year(Number(inputYear)).startOf("year");
const yearEnd = moment().year(Number(inputYear)).endOf("year");

// -----------------------------------------------------------
// 辅助函数：插入强制分页符 (Page Break Helper)
// -----------------------------------------------------------
function insertPageBreak() {
    dv.el("div", "", { attr: { style: "page-break-after: always; height: 0; overflow: hidden;" } });
}

// -----------------------------------------------------------
// 2. 收集全年的打卡记录
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// === 2. 核心计算：按月聚合 & 项目汇总 ===
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// === 3. 输出表格：月度趋势 (Monthly Breakdown) ===
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// === 4. 输出表格：项目总排行 (Project Rankings) ===
// -----------------------------------------------------------
let projectRows = [];
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);

for (let [project, total] of sortedProjects) {
    let hours = Math.floor(total / 60);
    let mins = total % 60;
    projectRows.push([project, `${hours}h ${mins}m`, total]);
}

dv.header(3, "🏆 Project Total Time (Yearly)");
dv.table(["Project", "Time", "Minutes"], projectRows);


// -----------------------------------------------------------
// 5. 下方是图表数据准备逻辑
// -----------------------------------------------------------

// 总结统计 (这里实际计算的是年度总时长)
let totalMinutes = slots.reduce((sum, s) => sum + s.duration, 0);
let totalHours = totalMinutes / 60;

// === 准备图表数据：只取项目名最后一段 + 小时数 ===
let projectData = [];
// 这里你可以调整阈值，比如年度 0.01 (1%)
const threshold = totalMinutes * 0.01;

for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    // 提取干净的项目名：去掉 [[ ]] 和 | 显示文字，取路径最后一段
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let projectName = fullName.split("/").pop().replace(/\.md$/i, "").trim();
    if (projectName === "") projectName = "Unknown Project";

    let hours = Math.round(totalMin / 6) / 10; // 保留一位小数

    /*// 只保留占总时长 3% 以上的项目（小项目直接忽略，不显示“其他”）
    if (totalMin >= threshold) {
        projectData.push({ project: projectName, hours: hours });
    }*/
    projectData.push({ 
	    project: projectName, 
	    hours: hours,
	    minutes: totalMin
	});
}

// 从大到小排序
projectData.sort((a, b) => b.hours - a.hours);

// -----------------------------------------------------------
// 6. 图表渲染区域 (复用原有逻辑，未修改任何样式)
// -----------------------------------------------------------

// === 图表 A：工作权重分布 (Pie) ===
dv.header(3, "A. 工作权重分布 (Pie)");

let pieYamlData = projectData.map(p => {
    let safeName = p.project.replace(/"/g, '\\"');
    return `  - type: "${safeName}"\n    value: ${p.hours}`;
}).join("\n");

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


// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// (Page Break)
insertPageBreak();
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// === 图表 B：项目工时对比 (Column) ===
dv.header(3, "B. 项目工时对比 (Column)");

//let columnYamlData = projectData.map(p => {
//    let safeName = p.project.replace(/"/g, '\\"');
//    return `  - project: "${safeName}"\n    hours: ${p.hours}`;
//}).join("\n");

// ⚡️ 性能优化：只取前 40 名。渲染 100+ 个竖排柱状图是导致卡顿的元凶。
// 后面的小项目在 Column 图中反正也看不见（高度太低）。
let topProjects = projectData.slice(0, 40); 

// 【关键步骤 1】专门为柱状图制作“竖排文字”数据
// 把 "项目名称" 变成 "项\n目\n名\n称"
let verticalData = topProjects.map(p => {
    // 将字符串按字符切割，然后用换行符连接
    let vertName = p.project.split("").join("\n");
    return {
        project: vertName,
        hours: p.hours
    };
});

let columnYamlData = verticalData.map(p => {
    // 这里的 p.project 已经是竖排带换行符的了
    // 注意：YAML 中多行字符串处理比较麻烦，我们需要用 JSON.stringify 哪怕它看起来像 YAML
    // 并在替换双引号后，保留 \n
    let safeName = p.project.replace(/"/g, '\\"').replace(/\n/g, "\\n");
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

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// (Page Break)
insertPageBreak();
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// === 图表 C：项目工时排行 (Bar) ===
dv.header(3, "C. 项目工时排行 (Bar)");


// 1. 设定每页显示多少个 (20-25之间最适合A4/A3横向)
const pageSize = 22;
const totalPages = Math.ceil(projectData.length / pageSize);

// 2. 循环生成多个图表
for (let i = 0; i < totalPages; i++) {
    // 切片：获取当前页的数据 (例如 0~22, 22~44...)
    let start = i * pageSize;
    let end = start + pageSize;
    let pageData = projectData.slice(start, end);

    let barYamlData = pageData.map(p => {
        let safeName = p.project.replace(/"/g, '\\"');
        return `  - project: "${safeName}"\n    hours: ${p.hours}`;
    }).join("\n");

    // 计算当前图表高度 (项目少的时候自动变矮，最多也就是填满一页)
    let pageHeight = Math.max(300, pageData.length * 40);

    // 只有第一页显示大标题，后面显示 "Part X"
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

    // 如果不是最后一页，插入强制分页符
    if (i < totalPages - 1) {
        insertPageBreak();
    }
}

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// (Page Break)
insertPageBreak();
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// === 底部：详细数据汇总表 ===
dv.header(3, "D. 数据汇总表 (Data Table)");
dv.paragraph(`**年度总计：${totalMinutes} 分钟 (约 ${totalHours.toFixed(1)} 小时)**`);

dv.table(
    ["项目名称", "分钟 (min)", "小时 (h)", "占比"],
    projectData.map(p => [
        p.project,
        p.minutes,
        p.hours,
        (p.minutes / totalMinutes * 100).toFixed(1) + "%"
    ])
);
```

---

## 📝 Yearly Summary

#### **Major Milestones:**
- 
#### **Reflections:**
- 
#### **Goals for Next Year (<% year + 1 %>):**
- 

---

## 🔗 Related Links
- [[Project_Obsidian-Nexus]]
