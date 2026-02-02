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
// 📝 PART 1: 想法与反思提取 (Metadata 预检查优化版)
// ==========================================================
const moment = window.moment;
const inputYear = "<% year %>";
const inputMonth = Number("<% monthNum %>") - 1;
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

const MonthStart = moment(inputYear, "YYYY").locale('en').month(inputMonth).startOf('month');
const MonthEnd = moment(inputYear, "YYYY").locale('en').month(inputMonth).endOf('month');

// 🟢 1. 创建一个容器用于显示状态，稍后我们可以修改它
const container = dv.el("div", `*⏳ 正在智能扫描 ${inputYear} 年 ${inputMonth} 月的日记...*`);

const journalPages = dv.pages('#journal/daily');
let reflectionResults = [];

// ⏱️ 性能优化核心：遍历处理
for (let page of journalPages) {
    // 1. 日期快速过滤
    const dateStr = page.date || page.file.name;
    const date = moment(dateStr, ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
    if (!date.isValid() || date.isBefore(MonthStart) || date.isAfter(MonthEnd)) continue;

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
    dv.paragraph("> *No reflections found for this month.*");
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

// [NEW] Calculate total duration sum for percentage math
let totalDuration = projectRows.reduce((sum, row) => sum + row[1], 0);

// [MODIFIED] Format rows and add percentage calculation
let formattedProjectRows = projectRows.map(row => {
    let total = row[1];
    let h = Math.floor(total / 60);
    let m = total % 60;

    // Format time display
    let timeString = (h > 0)
        ? `${total} min (${h}hour ${m}min)`
        : `${total} min`;

    // [NEW] Calculate Percentage (format as string with %)
    let percent = totalDuration > 0 ? (total / totalDuration * 100).toFixed(1) + "%" : "0.0%";

    // Return: [Project Name, Time String, Percentage String]
    return [row[0], timeString, percent];
});

dv.header(3, "Project Total Time");
if (formattedProjectRows.length > 0) {
    dv.table(["Project", "Total Time", "Percent"], formattedProjectRows);
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

### 核心进度 (Main progress):
-
### 问题与反思 (Issues & reflections):
-
### 下周计划 (Next week's plan):
-

---

## 🔗 Related Links
- [[Project_Obsidian-Nexus]]
- [[Related Task 1]]
- [[Related Task 2]]
