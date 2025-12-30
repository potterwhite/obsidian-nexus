---
report_uuid: <%* tR += tp.user.uuid() %>
type: week-summary
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

// ==========================================================
// 2. 动态计算该年份的最大周数 (西方标准)
// ==========================================================
// 2025年只有52周，2026年有53周，此处自动判断，防止输入错误
const maxWeeks = moment(String(year), "YYYY").locale('en').weeksInYear();

// ==========================================================
// 3. 输入周号 (优化版：预填充计算好的周号)
// ==========================================================
let inputWeek;
while (true) {
    // 强制使用 'en' (周日开始) 模式来获取建议周号
    let defaultWeek = moment().locale('en').week();

    // 边界保护：如果算出来的周号超过了该年最大周（例如跨年时刻），重置为1
    if (defaultWeek > maxWeeks) defaultWeek = 1;

    inputWeek = await tp.system.prompt(`请输入周号 (直接回车默认: ${defaultWeek}, 范围: 1-${maxWeeks}):`, defaultWeek);

    // 同样处理空值，防止误触
    if (inputWeek === null || inputWeek === "") {
        inputWeek = defaultWeek;
    }

    const weekNumVal = parseInt(inputWeek, 10);
    if (!isNaN(weekNumVal) && weekNumVal >= 1 && weekNumVal <= maxWeeks) {
        break;
    }
    await tp.system.prompt(`周号无效，请输入 1 到 ${maxWeeks} 之间的数字。`);
}
const weekNum = parseInt(inputWeek, 10);

// ==========================================================
// 4. 计算周起止 (Western/Sunday Start)
// ==========================================================
const weekStart = moment(String(year), "YYYY").locale('en').week(weekNum).startOf('week');
const weekEnd = moment(String(year), "YYYY").locale('en').week(weekNum).endOf('week');

const suggestedFileName = `${year}-W${weekNum}-Review`;

tR += `title: ${suggestedFileName}\n`;
tR += `week: ${weekNum}\n`;
tR += `year: ${year}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `week_start: ${weekStart.format("MMMM D, YYYY")}\n`;
tR += `week_end: ${weekEnd.format("MMMM D, YYYY")}\n`;
tR += `suggested_file_name: ${suggestedFileName}`;
%>
tags: summary/week
---

## 🗓️ 本周信息 (This Week)
- 开始: <% weekStart.format("YYYY-MM-DD") %> (周日)
- 结束: <% weekEnd.format("YYYY-MM-DD") %> (周六)
- 周数: <% weekNum %>

---

## ⏱️ 每周任务时间统计

```dataviewjs
const moment = window.moment;

// 获取 Frontmatter 数据
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";

// 【时间计算】强制对齐 Western 标准 (Sunday Start)
// 确保 Dataview 的计算窗口与 Templater 生成的完全一致
const weekStart = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).startOf('week');
const weekEnd = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).endOf('week');

let slots = [];

// 查找日记 (递归查找 journal/daily 及其子文件夹)
for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    // 过滤：精确匹配本周日期
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

        // 【关键修复】构建安全跳转链接
        // 1. 使用 daily.file.path 获取绝对路径，防止 undefined
        let linkPath = daily.file.path;
        let anchor = "";

        // 2. 只有当 subpath 存在时，才添加 "#" 前缀
        // 这样构建出的链接是 [[路径#标题]]，Obsidian 会识别为内部跳转而非新建文件
        if (t.header && t.header.subpath) {
            anchor = "#" + t.header.subpath;
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
            linkPath: linkPath,
            anchor: anchor,
            text: t.text
        });
    }
}

// 排序：先按日期，再按开始时间
slots.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

// 1. 输出详细时间块表格
let rows = [];
for (let s of slots) {
    let projectLink = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    let taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;

    // 构建可点击链接 [[Path#Anchor|Display]]
    let dateClickable = `[[${s.linkPath}${s.anchor}|${s.date}]]`;
    let timeClickable = `[[${s.linkPath}${s.anchor}|${s.start}-${s.end}]]`;

	let displayText = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;
    rows.push([
        dateClickable,
        timeClickable,
        projectLink,
        taskLink,
        displayText,
        s.duration + " 分钟"
    ]);
}

dv.header(3, `📅 每周时间块明细 (Week ${inputWeek})`);
if (rows.length > 0) {
    dv.table(["日期", "时间", "项目", "任务", "描述", "时长"], rows);
} else {
    dv.paragraph("本周没有找到时间记录。");
}

// 2. 统计 Project 总耗时
let projectTotals = {};
for (let s of slots) {
    let projectKey = s.projectFile ? `[[${s.projectFile}|${s.projectName.replace(/^\[\[|\]\]$/g, "")}]]` : s.projectName;
    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;
}

let projectRows = [];
for (let [project, total] of Object.entries(projectTotals)) {
    projectRows.push([project, total]);
}

projectRows.sort((a, b) => b[1] - a[1]);
let formattedProjectRows = projectRows.map(row => [row[0], row[1] + " 分钟"]);

dv.header(3, "📊 项目总耗时");
if (formattedProjectRows.length > 0) {
    dv.table(["项目", "总时长"], formattedProjectRows);
} else {
    dv.paragraph("没有找到项目数据。");
}

// 3. 底部总计
let weekTotal = slots.reduce((sum, s) => sum + s.duration, 0);
let hours = Math.floor(weekTotal / 60);
let minutes = weekTotal % 60;
dv.paragraph(`**本周总耗时:** ${weekTotal} 分钟 (${hours}小时 ${minutes}分钟)`);
```

---

## 📝 本周总结 (Weekly Summary)

- 核心进度 (Main progress):
    -
- 问题与反思 (Issues & reflections):
    -
- 下周计划 (Next week's plan):
    -

---

## 🔗 相关链接
- [[Project_Obsidian建立Journal系统]]
