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


## 💡 Ideas & Reflections Look Back
```dataviewjs
// ==========================================================
// 📝 PART 1: 想法与反思提取 (Metadata 预检查优化版)
// ==========================================================
const moment = window.moment;
// 🟢 请确保这里的年份和 Part 2 一致，或者手动写死 "2025"
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";

const targetSection = "想法与反思"; // 你的标题关键词，不需要写 #

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
let allContentForAI = "";

const weekStart = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).startOf('week');
const weekEnd = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).endOf('week');

// 🟢 1. 创建一个容器用于显示状态，稍后我们可以修改它
const container = dv.el("div", `*⏳ 正在智能扫描 ${inputYear} 年第 ${inputWeek} 周的日记...*`);

const journalPages = dv.pages('#journal/daily');
let reflectionResults = [];

// ⏱️ 性能优化核心：遍历处理
for (let page of journalPages) {
    // 1. 日期快速过滤
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
    if (!date.isValid() || date.isBefore(weekStart) || date.isAfter(weekEnd)) continue;

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
		// 【新增 2】将每一天的日记拼接到总变量中，加上日期方便区分
	    allContentForAI += `\n\n--- Date: ${item.dateObj.format("YYYY-MM-DD")} ---\n${item.text}`;
    }
}


// ... 上面是循环结束 ...

// 【新增 3】创建一键复制按钮
if (reflectionResults.length > 0) {
    const btn = dv.el("button", "📋 一键复制 Prompt + 所有日记", { cls: "ai-copy-btn" });

    // 给按钮加上点击样式（可选，为了好看一点）
    btn.style.marginTop = "15px";
    btn.style.padding = "10px 20px";
    btn.style.cursor = "pointer";
    btn.style.backgroundColor = "var(--interactive-accent)";
    btn.style.color = "var(--text-on-accent)";
    btn.style.border = "none";
    btn.style.borderRadius = "5px";

    btn.onclick = () => {
        // 1. 拼接最终的 Payload：Prompt在前，日记内容在后
        const finalPayload = prompt_text + "\n\n" + allContentForAI;

        // 2. 写入剪贴板
        navigator.clipboard.writeText(finalPayload).then(() => {
            // 3. 复制成功的反馈
            btn.innerText = "✅ 已复制！快去发给 AI 吧";
            // 2秒后恢复原状
            setTimeout(() => { btn.innerText = "📋 一键复制 Prompt + 所有日记"; }, 2000);
        });
    };
}
```

## ⏱️ 每周任务时间统计

```dataviewjs
/**
 * =================================================================================
 * WEEKLY TASK ANALYTICS ENGINE (Abstracted Version)
 * =================================================================================
 * This script separates tasks into logical groups (e.g., Work vs. Life) based on a
 * configuration list, then renders independent statistics and charts for each group.
 */

const moment = window.moment;

// ==========================================================
// 1. CONFIGURATION (配置区域)
// ==========================================================

// 🟢 [USER CONFIG] Define keywords or filenames for projects you want to separate.
// If this list is empty [], all projects will be shown in one main dashboard.
// Example: ["project_family", "Health", "Reading"]
// 这里的关键词支持模糊匹配 (只要项目名包含该词即可)
const SEPARATE_PROJECT_LIST = ["project_family", "project_life"];

// Templater inputs (injected from your FrontMatter)
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";

// ==========================================================
// 2. DATA COLLECTION ENGINE (数据采集引擎)
// ==========================================================

// Calculate Time Window (Sunday Start)
const weekStart = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).startOf('week');
const weekEnd = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).endOf('week');

// Helper: Normalize project names from "[[File|Name]]" or "File" to just "File"
// 辅助函数：清洗项目名称
function getCleanProjectName(rawName) {
    if (!rawName) return "Unknown Project";
    let str = String(rawName);
    // Remove [[ ]] and optional alias |...
    let clean = str.replace(/^\[\[|\]\]$/g, "").split("|")[0];
    // Get the last part of the path (filename only)
    return clean.split("/").pop().trim();
}

// Helper: Check if a project matches the separation list
// 辅助函数：判断项目是否属于“分离组”
function isSeparatedProject(rawProjectName) {
    if (SEPARATE_PROJECT_LIST.length === 0) return false;
    const cleanName = getCleanProjectName(rawProjectName).toLowerCase();
    return SEPARATE_PROJECT_LIST.some(keyword =>
        cleanName.includes(keyword.toLowerCase())
    );
}

let allSlots = [];

// Iterate through Daily Notes
// 遍历日记文件，抓取任务
for (let daily of dv.pages('#journal/daily')) {
    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    if (!date.isValid() || date.isBefore(weekStart) || date.isAfter(weekEnd)) continue;
    if (!daily.file.tasks) continue;

    for (let t of daily.file.tasks) {
        // Basic validation
        if (!t.task_uuid || !t.start || !t.end) continue;

        let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
        let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
        let duration = Math.round((end - start) / (1000 * 60));

        if (duration <= 0) continue;

        // Extract Metadata
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

        // Build clickable link
        let linkPath = daily.file.path;
        let anchor = (t.header && t.header.subpath) ? "#" + t.header.subpath : "";

        // Push to raw data array
        allSlots.push({
            dateObj: date, // Keep object for sorting
            dateStr: date.format("YYYY-MM-DD"),
            start: t.start,
            end: t.end,
            duration: duration,
            taskName: taskName,
            taskFile: taskFile,
            projectName: projectName, // Raw name (e.g. [[Project A]])
            projectFile: projectFile,
            linkPath: linkPath,
            anchor: anchor,
            text: t.text
        });
    }
}

// Sort: Date -> Start Time
allSlots.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.start.localeCompare(b.start));


// ==========================================================
// 3. SEPARATION LOGIC (分流逻辑)
// ==========================================================

let mainGroupSlots = [];      // For "Work" or "General"
let separatedGroupSlots = []; // For "Family" or "Special Interest"

if (SEPARATE_PROJECT_LIST.length > 0) {
    allSlots.forEach(slot => {
        if (isSeparatedProject(slot.projectName)) {
            separatedGroupSlots.push(slot);
        } else {
            mainGroupSlots.push(slot);
        }
    });
} else {
    // If list is empty, everything goes to main
    mainGroupSlots = allSlots;
}

// ==========================================================
// 4. RENDERING ENGINE (渲染引擎 - 核心抽象层)
// ==========================================================

/**
 * Renders a complete dashboard (Table + Stats + Charts) for a given list of tasks.
 * @param {string} sectionTitle - The title to display (e.g. "Work Overview")
 * @param {Array} taskList - The array of task objects
 * @param {string} icon - Optional emoji icon
 */
function renderDashboard(sectionTitle, taskList, icon) {
    // A. Header
    dv.header(2, `${icon} ${sectionTitle}`);

    if (taskList.length === 0) {
        dv.paragraph(`*No tasks found for ${sectionTitle} this week.*`);
        dv.el("hr", ""); // Divider
        return;
    }

    // B. Detailed Task Table
    // 构建时间块明细表
    let tableRows = taskList.map(s => {
        let projectLink = s.projectFile ? `[[${s.projectFile}|${getCleanProjectName(s.projectName)}]]` : s.projectName;
        let taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;
        let dateClickable = `[[${s.linkPath}${s.anchor}|${s.dateStr}]]`;
        let timeClickable = `[[${s.linkPath}${s.anchor}|${s.start}-${s.end}]]`;
        let displayText = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;

        return [
            dateClickable,
            timeClickable,
            projectLink,
            taskLink,
            displayText,
            s.duration + " min"
        ];
    });

    dv.header(4, `📅 Time Logs (${taskList.length} records)`);
    dv.table(["Date", "Time", "Project", "Task", "Desc", "Duration"], tableRows);

    // C. Statistics Calculation
    // 计算统计数据 (Totals & Percentages)

    let groupTotalDuration = taskList.reduce((sum, s) => sum + s.duration, 0);
    let projectTotals = {};

    taskList.forEach(s => {
        // Use clean name for aggregation key
        let cleanName = getCleanProjectName(s.projectName);
        if (!projectTotals[cleanName]) projectTotals[cleanName] = 0;
        projectTotals[cleanName] += s.duration;
    });

    // Convert to sorted array
    let statsRows = Object.entries(projectTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    // Prepare Table Rows with Percentages
    let statsTableRows = statsRows.map(row => {
        let h = Math.floor(row.total / 60);
        let m = row.total % 60;
        let timeString = h > 0 ? `${row.total} min (${h}h ${m}m)` : `${row.total} min`;
        let percent = groupTotalDuration > 0 ? (row.total / groupTotalDuration * 100).toFixed(1) + "%" : "0.0%";
        return [row.name, timeString, percent];
    });

    dv.header(4, "📊 Project Statistics");
    dv.table(["Project", "Total Duration", "Percentage"], statsTableRows);

    // Print Total Sum for this group
    let totalH = Math.floor(groupTotalDuration / 60);
    let totalM = groupTotalDuration % 60;
    dv.paragraph(`**${sectionTitle} Total:** ${groupTotalDuration} min (${totalH}h ${totalM}m)`);

    // D. Charts Generation (ChartsView)
    // 图表生成：饼图、柱状图、条形图

    // Prepare data for charts (Hours)
    let chartData = statsRows.map(p => ({
        project: p.name,
        hours: Number((p.total / 60).toFixed(1))
    }));

    // 1. Pie Chart
    let pieYamlData = chartData.map(p => {
        let safeName = p.project.replace(/"/g, '\\"');
        return `  - type: "${safeName}"\n    value: ${p.hours}`;
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
      content: '${sectionTitle}'
      style:
        fontSize: 16
\`\`\`
`);

    // 2. Column Chart (Time usage)
    let colYamlData = chartData.map(p => {
        let safeName = p.project.replace(/"/g, '\\"');
        return `  - project: "${safeName}"\n    hours: ${p.hours}`;
    }).join("\n");

    dv.el("div", `
\`\`\`chartsview
type: Column
data:
${colYamlData}
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
  xAxis:
    label:
      autoRotate: true
      rotate: 45
      autoHide: false
  yAxis:
    title:
      text: 'Hours'
  columnWidthRatio: 0.6
  maxColumnWidth: 60
  animation: true
\`\`\`
`);

    // 3. Bar Chart (Horizontal)
    // 水平条形图
    let barYamlData = chartData.map(p => {
        let safeName = p.project.replace(/"/g, '\\"');
        return `  - project: "${safeName}"\n    hours: ${p.hours}`;
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

    // Add a divider at the end of the section
    dv.el("hr", "");
}


// ==========================================================
// 5. EXECUTION (执行渲染)
// ==========================================================

// Case 1: If there are separated projects, render them first (highlighted)
// 如果有分离的项目（如家庭），先渲染它们
if (SEPARATE_PROJECT_LIST.length > 0) {
    // 渲染特定关注组
    // You can change the title "Focused / Personal" to whatever you like
    renderDashboard("Focused / Personal Projects", separatedGroupSlots, "🛡️");

    // 渲染剩余工作组
    renderDashboard("Main / Work Projects", mainGroupSlots, "💼");
}
// Case 2: Standard behavior (One big list)
// 默认行为：全部渲染在一起
else {
    renderDashboard("Weekly Overview (All Projects)", mainGroupSlots, "🚀");
}
```

---

## 📝 本周总结 (Weekly Summary)

### 核心进度 (Main progress):
-
### 问题与反思 (Issues & reflections):
-
### 下周计划 (Next week's plan):
-

---

## 🔗 相关链接
- [[Project_Obsidian-Nexus]]
