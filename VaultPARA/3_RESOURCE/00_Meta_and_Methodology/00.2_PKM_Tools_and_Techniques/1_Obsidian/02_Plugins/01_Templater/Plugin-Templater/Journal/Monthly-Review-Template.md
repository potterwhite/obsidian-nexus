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

## 💡 Ideas & Reflections Look Back
```dataviewjs
// ==========================================================
// 📝 PART 1: 想法与反思提取 (高性能优化版)
// ==========================================================
const moment = window.moment;
const inputYear = "<% year %>";
// 月份修正：Templater输入通常是1-12，moment需要0-11，或者直接用YYYY-MM格式
const inputMonthStr = "<% monthNum %>";

const targetSection = "想法与反思";
const prompt_text = `# Role
You are an objective data analyst and archivist. Your task is to process unstructured personal diary entries and organize them into structured, factual categories. Think of yourself as a "casing" (肠衣) that shapes discrete, loose information into defined "containers."

# Constraints & Rules
1. **No Subjectivity:** Do not offer advice, emotional comfort, or psychological interpretation. Do not summarize the "vibe." Only extract what actually happened or what was explicitly thought.
2. **Quantitative Focus:** Where possible, count the frequency of specific thoughts, actions, or desires (e.g., "Mentioned leaving: X times").
3. **Language:** The final output must be in **Chinese**.

# Output Structure (The Containers)
Please categorize the content into the following logical containers (or others if relevant):

1. **📦 Container 1: Life & Family Logistics**
   - Concrete events (e.g., "Sent tea," "Ate noodles").
   - Financial decisions.
   - Family interactions (facts only).

2. **🛠️ Container 2: Work & Technical Output**
   - Specific tasks completed (e.g., "Submitted PR," "Converted model").
   - Technical knowledge points learned or reinforced.
   - Tools used.

3. **🚀 Container 3: Career Strategy & Entrepreneurship**
   - Strategic thoughts recorded.
   - Business ideas or market analysis mentioned.
   - Decisions regarding career path (staying vs. leaving).

4. **🧠 Container 4: Mental Models & Methodology**
   - Reflections on learning methods.
   - Productivity workflows.

5. **📊 Data Summary (Statistics)**
   - Provide a bulleted list of counts for recurring themes.
   - Examples:
     - "Times mentioned wanting to leave/resign: [Count]"
     - "Times mentioned entrepreneurship/startup ideas: [Count]"
     - "Specific technical tasks completed: [Count]"
     - "Money-saving actions: [Count]"

# Action
Now, please analyze the provided text below based on these instructions:

[Paste your diary text here]`

// 1. 计算时间窗口
const MonthStart = moment(`${inputYear}-${inputMonthStr}`, "YYYY-M").startOf('month');
const MonthEnd = moment(`${inputYear}-${inputMonthStr}`, "YYYY-M").endOf('month');

// 2. 显示加载状态 (只渲染一次)
const container = dv.el("div", `*⏳ 正在扫描 ${inputYear}年${inputMonthStr}月 的日记... (请稍候)*`);

// 3. 准备数据容器
let allContentForAI = "";
let displayMarkdown = ""; // 用于屏幕显示的 Markdown 累加器
let reflectionCount = 0;

const journalPages = dv.pages('#journal/daily');

// --- 核心循环 ---
// 并行优化：虽然JS是单线程，但我们可以减少 await 的阻塞感，
// 不过为了稳定性，这里保持顺序读取，但移除了循环内的渲染。
for (let page of journalPages) {
    // A. 日期过滤
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
    if (!date.isValid() || date.isBefore(MonthStart) || date.isAfter(MonthEnd)) continue;

    // B. 缓存预检查 (极快)
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) continue;
    const fileCache = app.metadataCache.getFileCache(file);
    let hasTargetHeader = false;
    if (fileCache && fileCache.headings) {
        hasTargetHeader = fileCache.headings.some(h => h.heading.includes(targetSection));
    }
    if (!hasTargetHeader) continue;

    // C. 读取文件 (耗时操作)
    const content = await app.vault.read(file);
    const lines = content.split('\n');
    let isCapturing = false;
    let capturedText = [];

    for (let line of lines) {
        if (line.trim().includes(targetSection) && line.trim().startsWith("#")) {
            isCapturing = true;
            continue;
        }
        if (isCapturing && line.trim().startsWith("## ")) break;
        if (isCapturing) capturedText.push(line);
    }

    const rawText = capturedText.join('\n').trim();

    // D. 存入内存，而不是直接渲染
    if (rawText.length > 0) {
        reflectionCount++;
        // 拼接显示内容
        displayMarkdown += `> [!QUOTE]+ ${page.file.link}\n> ${rawText.replace(/\n/g, "\n> ")}\n\n`;
        // 拼接AI内容
        allContentForAI += `\n\n--- Date: ${date.format("YYYY-MM-DD")} ---\n${rawText}`;
    }
}

// --- 4. 渲染阶段 (只执行一次 DOM 操作) ---

// 更新状态文字
container.innerText = reflectionCount > 0
    ? `✅ 扫描完成，共提取 ${reflectionCount} 天记录`
    : "✅ 扫描完成，本月无相关记录";

if (reflectionCount === 0) {
    dv.paragraph("> *No reflections found for this month.*");
} else {
    // 一次性渲染所有引用块！解决 Reflow 问题
    dv.paragraph(`**📅 提取结果列表：**`);
    dv.paragraph(displayMarkdown);

    // 生成按钮
    const btn = dv.el("button", "📋 一键复制 Prompt + 所有日记", { cls: "ai-copy-btn" });
    Object.assign(btn.style, {
        marginTop: "15px", padding: "10px 20px", cursor: "pointer",
        backgroundColor: "var(--interactive-accent)", color: "var(--text-on-accent)",
        border: "none", borderRadius: "5px"
    });

    btn.onclick = () => {
        const finalPayload = prompt_text + "\n\n" + allContentForAI;
        navigator.clipboard.writeText(finalPayload).then(() => {
            btn.innerText = "✅ 已复制！";
            setTimeout(() => { btn.innerText = "📋 一键复制 Prompt + 所有日记"; }, 2000);
        });
    };
}

```


## ⏱️ Monthly Task Time Statistics

```dataviewjs
/**
 * =================================================================================
 * MONTHLY TASK ANALYTICS (Optimized Batch Rendering)
 * =================================================================================
 */
const moment = window.moment;

// --- Config ---
const SEPARATE_PROJECT_LIST = ["Project_Families", "FamilyPersonalCare", "Project_Healthy", "Project_Kids", "Project_家庭各类设备", "Project_AI_Marketing_Personal"];
const inputYear = "<% year %>";
const inputMonthStr = "<% monthNum %>";

// --- Data Prep ---
const periodStart = moment(`${inputYear}-${inputMonthStr}`, "YYYY-M").startOf('month');
const periodEnd = moment(`${inputYear}-${inputMonthStr}`, "YYYY-M").endOf('month');

// Helpers
function getCleanProjectName(rawName) {
    if (!rawName) return "Unknown Project";
    let str = String(rawName);
    let clean = str.replace(/^\[\[|\]\]$/g, "").split("|")[0];
    return clean.split("/").pop().trim();
}

function isSeparatedProject(rawProjectName) {
    if (SEPARATE_PROJECT_LIST.length === 0) return false;
    const cleanName = getCleanProjectName(rawProjectName).toLowerCase();
    return SEPARATE_PROJECT_LIST.some(k => cleanName.includes(k.toLowerCase()));
}

// --- Batch Data Collection ---
let allSlots = [];
// 预先获取所有日记，避免在循环中重复查询
const dailyPages = dv.pages('#journal/daily');

for (let daily of dailyPages) {
    // 快速跳过无任务文件
    if (!daily.file.tasks || daily.file.tasks.length === 0) continue;

    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    // 这里的 isValid 检查很重要，防止无效日期导致后续计算错误
    if (!date.isValid() || date.isBefore(periodStart) || date.isAfter(periodEnd)) continue;

    for (let t of daily.file.tasks) {
        if (!t.task_uuid || !t.start || !t.end) continue;

        // 放在 try-catch 块中防止个别坏数据卡死整个脚本
        try {
            let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
            let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
            let duration = Math.round((end - start) / (1000 * 60));
            if (duration <= 0) continue;

            let taskPage = dv.pages().where(p => p.task_uuid === t.task_uuid).first();
            let taskName = taskPage?.task_name || taskPage?.file?.name || t.text;
            let taskFile = taskPage?.file?.name;

            let projectName = taskPage?.project
                ? (Array.isArray(taskPage.project) ? taskPage.project[0] : taskPage.project)
                : "Unknown Project";
            let projectFile = null;
            if (typeof projectName === "string" && projectName.startsWith("[[")) {
                projectFile = projectName.replace(/^\[\[|\]\]$/g, "");
            }

            let linkPath = daily.file.path;
            let anchor = (t.header && t.header.subpath) ? "#" + t.header.subpath : "";

            allSlots.push({
                dateStr: date.format("YYYY-MM-DD"), // 用于排序
                start: t.start,
                end: t.end,
                duration: duration,
                taskName: taskName,
                taskFile: taskFile,
                projectName: projectName,
                projectFile: projectFile,
                linkPath: linkPath,
                anchor: anchor,
                text: t.text
            });
        } catch (e) {
            console.warn("Skipping malformed task:", t.text, e);
        }
    }
}

// 排序 (CPU操作，很快)
allSlots.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.start.localeCompare(b.start));

// --- Grouping ---
let mainGroupSlots = [];
let separatedGroupSlots = [];

if (SEPARATE_PROJECT_LIST.length > 0) {
    for (let slot of allSlots) {
        if (isSeparatedProject(slot.projectName)) separatedGroupSlots.push(slot);
        else mainGroupSlots.push(slot);
    }
} else {
    mainGroupSlots = allSlots;
}

// --- Renderer Function (Updated for Performance) ---
function renderDashboard(sectionTitle, taskList, icon) {
    dv.header(2, `${icon} ${sectionTitle}`);

    if (taskList.length === 0) {
        dv.paragraph(`*No tasks found for ${sectionTitle} this month.*`);
        dv.el("hr", "");
        return;
    }

    // 1. 生成表格数据 (纯内存操作)
    let tableRows = taskList.map(s => {
        let cleanProj = getCleanProjectName(s.projectName);
        let projectLink = s.projectFile ? `[[${s.projectFile}|${cleanProj}]]` : cleanProj;
        let taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;
        // 使用 HTML 链接而非 Dataview 链接有时能提高渲染性能，但这里保持原样
        let dateClickable = `[[${s.linkPath}${s.anchor}|${s.dateStr}]]`;
        let timeClickable = `[[${s.linkPath}${s.anchor}|${s.start}-${s.end}]]`;
        let displayText = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;
        return [dateClickable, timeClickable, projectLink, taskLink, displayText, s.duration + " min"];
    });

    // 2. 渲染表格 (一次重绘)
    dv.header(4, `📅 Time Logs (${taskList.length} records)`);
    dv.table(["Date", "Time", "Project", "Task", "Desc", "Duration"], tableRows);

    // 3. 统计计算
    let groupTotalDuration = taskList.reduce((sum, s) => sum + s.duration, 0);
    let projectTotals = {};
    for (let s of taskList) {
        let cleanName = getCleanProjectName(s.projectName);
        projectTotals[cleanName] = (projectTotals[cleanName] || 0) + s.duration;
    }

    let statsRows = Object.entries(projectTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    let statsTableRows = statsRows.map(row => {
        let h = Math.floor(row.total / 60);
        let m = row.total % 60;
        let percent = groupTotalDuration > 0 ? (row.total / groupTotalDuration * 100).toFixed(1) + "%" : "0.0%";
        return [row.name, `${row.total} min (${h}h ${m}m)`, percent];
    });

    dv.header(4, "📊 Project Statistics");
    dv.table(["Project", "Total Duration", "Percentage"], statsTableRows);

    let totalH = Math.floor(groupTotalDuration / 60);
    let totalM = groupTotalDuration % 60;
    dv.paragraph(`**${sectionTitle} Total:** ${groupTotalDuration} min (${totalH}h ${totalM}m)`);

    // 4. 图表渲染 (防御性检查)
    // 只有当有数据时才渲染图表，防止ChartsView报错
    if (statsRows.length > 0) {
        let chartData = statsRows.map(p => ({
            project: p.name,
            hours: Number((p.total / 60).toFixed(1))
        }));

        // 构造 YAML 字符串
        // Pie
        let pieYaml = chartData.map(p => `  - type: "${p.project.replace(/"/g, '\\"')}"\n    value: ${p.hours}`).join("\n");
        dv.el("div", `\`\`\`chartsview
type: Pie
data:
${pieYaml}
options:
  angleField: value
  colorField: type
  innerRadius: 0.6
  label: { type: inner, content: "{percentage}" }
  statistic: { title: false, content: { content: '${sectionTitle}', style: { fontSize: 16 } } }
\`\`\``);

        // Column
        let colYaml = chartData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");
        dv.el("div", `\`\`\`chartsview
type: Column
data:
${colYaml}
options:
  xField: project
  yField: hours
  seriesField: project
  label: { position: top, style: { fill: '#FFFFFF' } }
  xAxis: { label: { autoRotate: true, rotate: 45, autoHide: false } }
  columnWidthRatio: 0.6
  maxColumnWidth: 60
\`\`\``);

        // Bar
        dv.el("div", `\`\`\`chartsview
type: Bar
data:
${colYaml}
options:
  yField: project
  xField: hours
  seriesField: project
  barWidthRatio: 0.8
  maxBarWidth: 40
  label: { position: right, offset: 10, style: { fill: "#FFFFFF" } }
  legend: { position: "top-right" }
\`\`\``);
    }

    dv.el("hr", "");
}

// --- Execution ---
if (SEPARATE_PROJECT_LIST.length > 0) {
    renderDashboard("Focused / Personal Projects", separatedGroupSlots, "🛡️");
    renderDashboard("Main / Work Projects", mainGroupSlots, "💼");
} else {
    renderDashboard("Monthly Overview (All Projects)", mainGroupSlots, "🚀");
}
```

---

## 📝 Monthly Summary

### 核心进度 (Main progress):
- 

### 问题与反思 (Issues & reflections):
- 

### 下个月的计划 (Next Month's plan):
- 

---

## 🔗 Related Links
- [[Project_Obsidian-Nexus]]
- [[Related Task 1]]
- [[Related Task 2]]
