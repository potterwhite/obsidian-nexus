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
/**
 * =================================================================================
 * PART 1: DIARY REFLECTIONS (High Performance Batch Rendering)
 * =================================================================================
 */
const moment = window.moment;
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";
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

// 1. Calculate Time Window
const weekStart = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).startOf('week');
const weekEnd = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).endOf('week');

// 2. Status Container (Render once)
const container = dv.el("div", `*⏳ Scanning daily notes for Week ${inputWeek}...*`);

// 3. Data Buffers (Memory only, no DOM ops yet)
let allContentForAI = "";
let displayMarkdown = ""; 
let reflectionCount = 0;

const journalPages = dv.pages('#journal/daily');

// --- Main Loop ---
for (let page of journalPages) {
    // A. Date Filter
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
    if (!date.isValid() || date.isBefore(weekStart) || date.isAfter(weekEnd)) continue;

    // B. Cache Check (Fast)
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) continue;
    const fileCache = app.metadataCache.getFileCache(file);
    let hasTargetHeader = false;
    if (fileCache && fileCache.headings) {
        hasTargetHeader = fileCache.headings.some(h => h.heading.includes(targetSection));
    }
    if (!hasTargetHeader) continue;

    // C. Read & Extract
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

    // D. Append to Memory Buffer (Crucial Optimization)
    if (rawText.length > 0) {
        reflectionCount++;
        // Accumulate for display
        displayMarkdown += `> [!QUOTE]+ ${page.file.link}\n> ${rawText.replace(/\n/g, "\n> ")}\n\n`;
        // Accumulate for AI
        allContentForAI += `\n\n--- Date: ${date.format("YYYY-MM-DD")} ---\n${rawText}`;
    }
}

// --- 4. Render Phase (Executes ONCE) ---

container.innerText = reflectionCount > 0 
    ? `✅ Scan complete. Found ${reflectionCount} days.` 
    : "✅ Scan complete. No reflections found.";

if (reflectionCount === 0) {
    dv.paragraph("> *No reflections found for this week.*");
} else {
    // Single DOM update
    dv.paragraph(`**📅 Extracted Reflections:**`);
    dv.paragraph(displayMarkdown);

    // AI Button
    const btn = dv.el("button", "📋 Copy Prompt + Diaries", { cls: "ai-copy-btn" });
    Object.assign(btn.style, {
        marginTop: "15px", padding: "10px 20px", cursor: "pointer",
        backgroundColor: "var(--interactive-accent)", color: "var(--text-on-accent)",
        border: "none", borderRadius: "5px"
    });

    btn.onclick = () => {
        const finalPayload = prompt_text + "\n\n" + allContentForAI;
        navigator.clipboard.writeText(finalPayload).then(() => {
            btn.innerText = "✅ Copied!";
            setTimeout(() => { btn.innerText = "📋 Copy Prompt + Diaries"; }, 2000);
        });
    };
}
```

## ⏱️ 每周任务时间统计

```dataviewjs
/**
 * =================================================================================
 * WEEKLY TASK ANALYTICS (Optimized Batch Rendering)
 * =================================================================================
 */
const moment = window.moment;

// --- Config ---
const SEPARATE_PROJECT_LIST = ["Project_Families", "FamilyPersonalCare", "Project_Healthy", "Project_Kids", "Project_家庭各类设备"];
const inputYear = "<% year %>";
const inputWeek = "<% weekNum %>";

// --- Data Prep ---
// Calculate Time Window (Sunday Start)
const weekStart = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).startOf('week');
const weekEnd = moment(inputYear, "YYYY").locale('en').week(Number(inputWeek)).endOf('week');

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
const dailyPages = dv.pages('#journal/daily');

for (let daily of dailyPages) {
    // Quick skip
    if (!daily.file.tasks || daily.file.tasks.length === 0) continue;

    const dateStr = daily.date || daily.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"]);

    if (!date.isValid() || date.isBefore(weekStart) || date.isAfter(weekEnd)) continue;

    for (let t of daily.file.tasks) {
        if (!t.task_uuid || !t.start || !t.end) continue;

        // Try-Catch block for safety
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
                dateStr: date.format("YYYY-MM-DD"),
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
            console.warn("Skipping malformed task:", t.text);
        }
    }
}

// Sort
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

// --- Renderer Function (Updated) ---
function renderDashboard(sectionTitle, taskList, icon) {
    dv.header(2, `${icon} ${sectionTitle}`);
    
    if (taskList.length === 0) {
        dv.paragraph(`*No tasks found for ${sectionTitle} this week.*`);
        dv.el("hr", "");
        return;
    }

    // 1. Build Table Rows (Memory)
    let tableRows = taskList.map(s => {
        let cleanProj = getCleanProjectName(s.projectName);
        let projectLink = s.projectFile ? `[[${s.projectFile}|${cleanProj}]]` : cleanProj;
        let taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;
        let dateClickable = `[[${s.linkPath}${s.anchor}|${s.dateStr}]]`;
        let timeClickable = `[[${s.linkPath}${s.anchor}|${s.start}-${s.end}]]`;
        let displayText = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;
        return [dateClickable, timeClickable, projectLink, taskLink, displayText, s.duration + " min"];
    });

    // 2. Render Table (Single Paint)
    dv.header(4, `📅 Time Logs (${taskList.length} records)`);
    dv.table(["Date", "Time", "Project", "Task", "Desc", "Duration"], tableRows);

    // 3. Stats Calculation
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

    // 4. Charts (Render only if data exists)
    if (statsRows.length > 0) {
        let chartData = statsRows.map(p => ({
            project: p.name,
            hours: Number((p.total / 60).toFixed(1))
        }));

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
