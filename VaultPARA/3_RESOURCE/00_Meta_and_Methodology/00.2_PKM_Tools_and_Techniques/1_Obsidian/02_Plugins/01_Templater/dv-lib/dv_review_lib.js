// ==========================================================================
// dv_review_lib.js — 周/月/年报复盘共享库（由笔记内的 dataviewjs 块加载）
// Shared library for the Weekly / Monthly / Yearly review reports.
//
// 加载方式 (how dataviewjs blocks load it):
//   const cfg = eval(await dv.io.load("<vault path>/javascript/lib_config.js"));
//   const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
//   await lib.renderReflectionSection(dv, app, cfg, "2026-01-04", "2026-01-10");
//
// ⚠️ 本文件不是 Templater user script，没有 module.exports；
//    文件最后一个表达式的值就是对外 API（见文件末尾）。
// ⚠️ 本文件被 eval() 加载，请勿在顶层使用 await / return。
// ==========================================================================

const moment = window.moment;

// --------------------------------------------------------------------------
// 跨午夜策略 (cross-midnight policy)
// 23:00→01:00 这类跨午夜时间块，end < start 会算出负时长：
//   "skip"   = 丢弃该条并给出可见警告（当前默认，与历史多数报表一致）
//   "add24h" = 按 +24 小时折算
// KNOWN_ISSUES BUG-4 尚未批复；若批复统一 +24h，只需把下一行改成 "add24h"。
// --------------------------------------------------------------------------
const CROSS_MIDNIGHT_POLICY = "skip";

// --------------------------------------------------------------------------
// AI 分析 prompt（周/月报"一键复制"按钮拼接在日记原文之前）。
// KNOWN_ISSUES PRIV-3 待批复：批复后替换为中文中性版本，只改这一处。
// --------------------------------------------------------------------------
const AI_REFLECTION_PROMPT = `# Role
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

[Paste your diary text here]`;

// ==========================================================================
// 1. 基础工具 (helpers)
// ==========================================================================

function padTime(t) {
    return String(t).padStart(5, "0");
}

// 计算"HH:mm → HH:mm"的分钟数；跨午夜按 CROSS_MIDNIGHT_POLICY 处理。
// Returns null when the duration must be discarded (policy "skip").
function minutesBetween(start, end) {
    const s = new Date("1970-01-01T" + padTime(start));
    const e = new Date("1970-01-01T" + padTime(end));
    let d = Math.round((e - s) / 60000);
    if (d <= 0) {
        if (CROSS_MIDNIGHT_POLICY === "add24h") return d + 24 * 60;
        return null;
    }
    return d;
}

// 解析日记日期：兼容 frontmatter date ("MMMM D, YYYY") 与 ISO 文件名
function parseNoteDate(str) {
    return moment(String(str), ["YYYY-MM-DD", "MMMM D, YYYY", "YYYY/M/D"], true);
}

// 标题命中判断：子串匹配，数组内任一关键词命中即可（中英兼容）
function sectionMatches(subpath, keys) {
    if (!subpath) return false;
    return keys.some(k => subpath.includes(k));
}

// "[[path/to/Project_X|别名]]" → "Project_X"
function getCleanProjectName(rawName) {
    if (!rawName) return "Unknown Project";
    const str = String(rawName);
    const clean = str.replace(/^\[\[|\]\]$/g, "").split("|")[0];
    return clean.split("/").pop().trim();
}

// 全库只扫一次，建立 task_uuid → page 的映射，之后 O(1) 查询。
// Builds the uuid → page index ONCE per report run (fixes the old
// per-time-block full-vault rescan, see KNOWN_ISSUES PERF-1).
function buildUuidPageMap(dv) {
    const map = {};
    for (const p of dv.pages()) {
        if (p && p.task_uuid) map[String(p.task_uuid)] = p;
    }
    return map;
}

// ==========================================================================
// 2. 时间块收集 (time block collection)
//    返回 { slots, warnings }；warnings 会渲染成可见的警告块（CONS-3）。
// ==========================================================================
function collectTimeSlots(dv, cfg, winStartStr, winEndStr) {
    const winStart = moment(winStartStr, "YYYY-MM-DD");
    const winEnd = moment(winEndStr, "YYYY-MM-DD");
    const uuidMap = buildUuidPageMap(dv);
    const slots = [];
    const warnings = [];

    for (const daily of dv.pages("#" + cfg.DAILY_TAG)) {
        if (!daily.file.tasks || daily.file.tasks.length === 0) continue;
        const date = parseNoteDate(daily.date || daily.file.name);
        if (!date.isValid() || date.isBefore(winStart) || date.isAfter(winEnd)) continue;

        for (const t of daily.file.tasks) {
            if (!t.task_uuid || !t.start || !t.end) continue;
            // 只统计「时间块」区块内的任务（标题关键词见 lib_config.js）
            if (!sectionMatches(t.section?.subpath || "", cfg.SECTION_KEYS.timeBlocks)) continue;
            // task_uuid 必须是裸文本；写成 [[链接]] 会被 dataview 解析成对象（BUG-6）
            if (typeof t.task_uuid !== "string") {
                warnings.push(`[[${daily.file.name}]]：发现链接格式 ([[...]]) 的 task_uuid，无法匹配统计，请改为裸文本`);
                continue;
            }
            try {
                const duration = minutesBetween(t.start, t.end);
                if (duration === null) {
                    warnings.push(`[[${daily.file.name}]]：「${String(t.text).slice(0, 30)}」时长为负（可能跨午夜），已跳过`);
                    continue;
                }
                const taskPage = uuidMap[t.task_uuid];
                const projectRaw = taskPage?.project
                    ? (Array.isArray(taskPage.project) ? taskPage.project[0] : taskPage.project)
                    : "Unknown Project";
                let projectFile = null;
                if (typeof projectRaw === "string" && projectRaw.startsWith("[[")) {
                    projectFile = projectRaw.replace(/^\[\[|\]\]$/g, "");
                }
                slots.push({
                    dateStr: date.format("YYYY-MM-DD"),
                    dateObj: date,
                    start: t.start,
                    end: t.end,
                    duration: duration,
                    taskUuid: t.task_uuid,
                    taskName: taskPage?.task_name || taskPage?.file?.name || t.text,
                    taskFile: taskPage?.file?.name || null,
                    projectName: projectRaw,
                    projectFile: projectFile,
                    linkPath: daily.file.path,
                    anchor: (t.header && t.header.subpath) ? "#" + t.header.subpath : "",
                    text: t.text,
                });
            } catch (e) {
                warnings.push(`[[${daily.file.name}]]：解析失败「${String(t.text).slice(0, 30)}」`);
            }
        }
    }

    slots.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.start.localeCompare(b.start));
    return { slots, warnings };
}

// ==========================================================================
// 3. 「想法与反思」提取 (reflection extraction)
//    metadata 标题预检 + Promise.all 并发读取（PERF-2）。
// ==========================================================================
async function extractReflections(dv, app, cfg, winStartStr, winEndStr) {
    const winStart = moment(winStartStr, "YYYY-MM-DD");
    const winEnd = moment(winEndStr, "YYYY-MM-DD");

    // A. 日期过滤 + metadata 标题预检（不读文件，极快）
    const candidates = [];
    for (const page of dv.pages("#" + cfg.DAILY_TAG)) {
        const date = parseNoteDate(page.date || page.file.name);
        if (!date.isValid() || date.isBefore(winStart) || date.isAfter(winEnd)) continue;
        const file = app.vault.getAbstractFileByPath(page.file.path);
        if (!file) continue;
        const cache = app.metadataCache.getFileCache(file);
        const hasHeading = cache?.headings?.some(h =>
            cfg.SECTION_KEYS.reflections.some(k => h.heading.includes(k)));
        if (hasHeading) candidates.push({ file, date, link: page.file.link });
    }

    // B. 并发读取命中的文件
    const items = await Promise.all(candidates.map(async ({ file, date, link }) => {
        const lines = (await app.vault.read(file)).split("\n");
        let capturing = false;
        const captured = [];
        for (const line of lines) {
            const trimmed = line.trim();
            const isHeading = /^#+\s/.test(trimmed);
            if (!capturing) {
                if (isHeading && cfg.SECTION_KEYS.reflections.some(k => trimmed.includes(k))) {
                    capturing = true;
                }
                continue;
            }
            // 遇到下一个任意级别标题即停止
            // （旧版只认 "## "，遇到同级 "# " 标题不停止，会把后面的
            //   明日计划/临时记录也吞进反思里 —— 本次一并修复）
            if (isHeading) break;
            captured.push(line);
        }
        return { link, date, text: captured.join("\n").trim() };
    }));

    return items
        .filter(it => /[a-zA-Z0-9\u4e00-\u9fa5]/.test(it.text))
        .sort((a, b) => a.date - b.date);
}

// ==========================================================================
// 4. 渲染 (rendering)
// ==========================================================================

// 被跳过的数据必须让用户看见（CONS-3）：Notice 提醒 + 报表内可折叠警告块
function renderWarnings(dv, warnings) {
    if (!warnings || warnings.length === 0) return;
    new Notice(`⚠️ 统计时有 ${warnings.length} 条数据被跳过，请查看报表内的警告块`, 8000);
    dv.paragraph(
        `> [!warning]- ⚠️ ${warnings.length} 条数据被跳过（点击展开 / click to expand）\n` +
        warnings.map(w => `> - ${w}`).join("\n")
    );
}

// 「想法与反思」完整区块：扫描状态 → 批量渲染 → AI 复制按钮
// copyExtrasText（可选）：追加到剪贴板内容末尾的文本（如本周时间明细），
// 只影响复制内容，不影响页面显示。
async function renderReflectionSection(dv, app, cfg, winStartStr, winEndStr, copyExtrasText) {
    const container = dv.el("div", `*⏳ 正在扫描日记... (Scanning daily notes...)*`);
    const items = await extractReflections(dv, app, cfg, winStartStr, winEndStr);

    container.innerText = items.length > 0
        ? `✅ 扫描完成，共提取 ${items.length} 天记录 (Scan complete: ${items.length} day(s))`
        : `✅ 扫描完成，本周期无记录 (Scan complete: nothing found)`;

    if (items.length === 0) return;

    // 内存中一次性拼接，单次渲染（避免逐条渲染导致的界面抖动）
    let displayMarkdown = "";
    let allContentForAI = "";
    for (const it of items) {
        displayMarkdown += `> [!QUOTE]+ ${it.link}\n> ${it.text.replace(/\n/g, "\n> ")}\n\n`;
        allContentForAI += `\n\n--- Date: ${it.date.format("YYYY-MM-DD")} ---\n${it.text}`;
    }
    dv.paragraph(`**📅 Extracted Reflections (提取结果):**`);
    dv.paragraph(displayMarkdown);

    // 一键复制 AI prompt + 全部日记原文
    const btn = dv.el("button", "📋 Copy Prompt + Diaries (一键复制)", { cls: "ai-copy-btn" });
    Object.assign(btn.style, {
        marginTop: "15px", padding: "10px 20px", cursor: "pointer",
        backgroundColor: "var(--interactive-accent)", color: "var(--text-on-accent)",
        border: "none", borderRadius: "5px"
    });
    btn.onclick = () => {
        const extras = copyExtrasText ? "\n\n" + copyExtrasText : "";
        navigator.clipboard.writeText(AI_REFLECTION_PROMPT + "\n\n" + allContentForAI + extras).then(() => {
            btn.innerText = "✅ Copied! (已复制)";
            setTimeout(() => { btn.innerText = "📋 Copy Prompt + Diaries (一键复制)"; }, 2000);
        });
    };
}

// 时间统计完整区块：收集 → 分组 → 仪表盘 → 警告
function renderTimeStatistics(dv, app, cfg, winStartStr, winEndStr) {
    const { slots, warnings } = collectTimeSlots(dv, cfg, winStartStr, winEndStr);
    const separated = cfg.SEPARATE_PROJECTS || [];
    const isSeparated = (slot) => {
        const clean = getCleanProjectName(slot.projectName).toLowerCase();
        return separated.some(k => clean.includes(String(k).toLowerCase()));
    };

    if (separated.length > 0) {
        renderDashboard(dv, "Focused / Personal Projects (重点项目)", slots.filter(isSeparated), "🛡️");
        renderDashboard(dv, "Main / Work Projects (其他项目)", slots.filter(s => !isSeparated(s)), "💼");
    } else {
        renderDashboard(dv, "Overview — All Projects (全部项目)", slots, "🚀");
    }
    renderWarnings(dv, warnings);
}

// 单组仪表盘：明细表 + 项目汇总 + 三张图表
function renderDashboard(dv, sectionTitle, slots, icon) {
    dv.header(2, `${icon} ${sectionTitle}`);

    if (slots.length === 0) {
        dv.paragraph(`*No time blocks found for this group (本组无时间块记录).*`);
        dv.el("hr", "");
        return;
    }

    // 1. 明细表（纯内存拼接，一次渲染）
    const rows = slots.map(s => {
        const cleanProj = getCleanProjectName(s.projectName);
        const projectLink = s.projectFile ? `[[${s.projectFile}|${cleanProj}]]` : cleanProj;
        const taskLink = s.taskFile ? `[[${s.taskFile}|${s.taskName}]]` : s.taskName;
        const dateLink = `[[${s.linkPath}${s.anchor}|${s.dateStr}]]`;
        const timeLink = `[[${s.linkPath}${s.anchor}|${s.start}-${s.end}]]`;
        const desc = s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text;
        return [dateLink, timeLink, projectLink, taskLink, desc, s.duration + " min"];
    });
    dv.header(4, `📅 Time Logs (${slots.length} records)`);
    dv.table(["Date", "Time", "Project", "Task", "Desc", "Duration"], rows);

    // 2. 项目汇总
    const groupTotal = slots.reduce((sum, s) => sum + s.duration, 0);
    const projectTotals = {};
    for (const s of slots) {
        const name = getCleanProjectName(s.projectName);
        projectTotals[name] = (projectTotals[name] || 0) + s.duration;
    }
    const statsRows = Object.entries(projectTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    dv.header(4, "📊 Project Statistics (项目统计)");
    dv.table(["Project", "Total Duration", "Percentage"], statsRows.map(r => {
        const h = Math.floor(r.total / 60), m = r.total % 60;
        const pct = groupTotal > 0 ? (r.total / groupTotal * 100).toFixed(1) + "%" : "0.0%";
        return [r.name, `${r.total} min (${h}h ${m}m)`, pct];
    }));
    dv.paragraph(`**${sectionTitle} — Total:** ${groupTotal} min (${Math.floor(groupTotal / 60)}h ${groupTotal % 60}m)`);

    // 3. 图表（依赖 Charts View 插件；未安装时代码块原样显示，不影响其他内容）
    if (statsRows.length > 0) {
        const chartData = statsRows.map(p => ({
            project: p.name,
            hours: Number((p.total / 60).toFixed(1))
        }));
        const pieYaml = chartData.map(p => `  - type: "${p.project.replace(/"/g, '\\"')}"\n    value: ${p.hours}`).join("\n");
        const colYaml = chartData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");

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

// Task-Template 用：统计"本任务"在所有日记中的耗时
function renderTaskTimeTable(dv, cfg) {
    const taskUuid = dv.current().task_uuid;
    if (!taskUuid) {
        dv.paragraph("⚠️ 本文件 frontmatter 缺少 task_uuid (missing task_uuid in frontmatter)");
        return;
    }
    const { slots, warnings } = collectTimeSlots(dv, cfg, "1970-01-01", "2999-12-31");
    const mine = slots.filter(s => s.taskUuid === taskUuid);

    dv.table(
        ["日记 (Daily)", "开始 (Start)", "结束 (End)", "时长 (Duration)"],
        mine.map(s => [`[[${s.linkPath}${s.anchor}|${s.dateStr}]]`, s.start, s.end, s.duration + " min"])
    );
    const total = mine.reduce((sum, s) => sum + s.duration, 0);
    dv.paragraph(`**总耗时 (Total): ${total} 分钟** (${Math.floor(total / 60)}h ${total % 60}m)`);
    renderWarnings(dv, warnings);
}

// Project-Template 用：统计本项目 checklist 里所有任务链接的耗时
function renderProjectTimeTable(dv, cfg) {
    // 本文件所有 checklist 里的 [[任务链接]]
    const taskLinks = dv.current().file.tasks
        .map(t => t.text.match(/\[\[([^\]]+)\]\]/))
        .filter(m => m)
        .map(m => m[1]);

    const uuidToInfo = {};
    for (const link of taskLinks) {
        const page = dv.page(link);
        if (page?.task_uuid) {
            uuidToInfo[String(page.task_uuid)] = { link, name: page.task_name || page.file.name };
        }
    }

    const { slots, warnings } = collectTimeSlots(dv, cfg, "1970-01-01", "2999-12-31");
    const totals = {};
    for (const s of slots) {
        if (uuidToInfo[s.taskUuid]) totals[s.taskUuid] = (totals[s.taskUuid] || 0) + s.duration;
    }

    let projectTotal = 0;
    const rows = Object.entries(uuidToInfo).map(([uuid, info]) => {
        const total = totals[uuid] || 0;
        projectTotal += total;
        return [`[[${info.link}|${info.name}]]`, total + " min"];
    });
    dv.table(["任务 (Task)", "总耗时 (Total)"], rows);
    dv.paragraph(`**项目总耗时 (Project Total): ${projectTotal} 分钟** (${Math.floor(projectTotal / 60)}h ${projectTotal % 60}m)`);
    renderWarnings(dv, warnings);
}

// ==========================================================================
// 5. 层级汇总（CONS-2：周报复制含每日明细，月报聚合周报，年报聚合月报）
// ==========================================================================

// 剥掉笔记里"给机器看"的部分，留下"给 AI 读"的内容：
// 去 frontmatter、去所有围栏代码块（dataviewjs/chartsview 等）、压缩空行。
function stripForCopy(raw) {
    let text = String(raw);
    text = text.replace(/^---\n[\s\S]*?\n---\n?/, "");       // frontmatter
    text = text.replace(/```[\s\S]*?```/g, "");              // fenced code blocks
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
}

// 压缩版时间汇总（月报/年报复制用）：只给按日/按项目总计，不重复每条时间块。
// 回答"月报复制 30 天每一条会不会太多"——会，所以这里只给聚合数字。
function summarizeSlotsText(slots) {
    if (!slots || slots.length === 0) return "## 时间统计 (Time Summary)\n本周期无时间块记录。";
    const fmt = m => `${Math.floor(m / 60)}h ${m % 60}m`;
    const byDay = {}, byProject = {};
    let total = 0;
    for (const s of slots) {
        byDay[s.dateStr] = (byDay[s.dateStr] || 0) + s.duration;
        const name = getCleanProjectName(s.projectName);
        byProject[name] = (byProject[name] || 0) + s.duration;
        total += s.duration;
    }
    let out = `## 时间统计 (Time Summary)\n总计: ${total} min (${fmt(total)})\n\n### 按日 (Per day)\n`;
    for (const d of Object.keys(byDay).sort()) out += `- ${d}: ${byDay[d]} min (${fmt(byDay[d])})\n`;
    out += `\n### 按项目 (Per project)\n`;
    for (const [p, m] of Object.entries(byProject).sort((a, b) => b[1] - a[1])) {
        out += `- ${p}: ${m} min (${fmt(m)}, ${(m / total * 100).toFixed(1)}%)\n`;
    }
    return out;
}

// 明细版时间清单（周报复制用）：逐天列出每一条时间块。
function detailSlotsText(slots) {
    if (!slots || slots.length === 0) return "## 时间明细 (Time Details)\n本周期无时间块记录。";
    let out = "## 时间明细 (Time Details)\n";
    let curDay = null;
    for (const s of slots) {
        if (s.dateStr !== curDay) { curDay = s.dateStr; out += `\n### ${curDay}\n`; }
        const proj = getCleanProjectName(s.projectName);
        const desc = String(s.text).replace(/\(.*?::.*?\)/g, "").trim();
        out += `- ${s.start}-${s.end} [${proj}] ${s.taskName}：${desc} (${s.duration} min)\n`;
    }
    return out + "\n" + summarizeSlotsText(slots);
}

// 汇总区块（月报聚合周报 / 年报聚合月报）：
// 找到窗口内 type 匹配的下一级报告，剥壳后展示 + 一键复制（附压缩时间汇总）。
async function renderRollupSection(dv, app, cfg, opts) {
    const { sourceType, sourceLabel, winStartStr, winEndStr } = opts;
    const winStart = moment(winStartStr, "YYYY-MM-DD");
    const winEnd = moment(winEndStr, "YYYY-MM-DD");

    // 用 frontmatter 的代表日期把下一级报告过滤到本窗口
    const notes = [];
    for (const p of dv.pages()) {
        if (String(p.type) !== sourceType) continue;
        const d = parseNoteDate(p.week_start ?? p.month_start ?? p.year_start ?? p.created ?? p.file.name);
        if (!d.isValid() || d.isBefore(winStart) || d.isAfter(winEnd)) continue;
        notes.push(p);
    }
    notes.sort((a, b) => a.file.name.localeCompare(b.file.name));

    if (notes.length === 0) {
        dv.paragraph(`⚠️ 本周期没有找到${sourceLabel}（frontmatter type: ${sourceType}）。请先生成下一级报告；若其中有 AI Summary 落盘内容，这里会自动汇总。`);
        return;
    }

    const stripped = await Promise.all(notes.map(async p => {
        const file = app.vault.getAbstractFileByPath(p.file.path);
        const raw = file ? await app.vault.read(file) : "";
        return { name: p.file.name, link: p.file.link, text: stripForCopy(raw) };
    }));

    let md = "";
    for (const n of stripped) {
        md += `> [!quote]- ${n.link}\n> ${n.text.replace(/\n/g, "\n> ")}\n\n`;
    }
    dv.paragraph(md);

    const { slots } = collectTimeSlots(dv, cfg, winStartStr, winEndStr);
    const timeSummary = summarizeSlotsText(slots);

    const label = `📋 Copy ${sourceLabel} + Time Summary (一键复制)`;
    const btn = dv.el("button", label, { cls: "ai-copy-btn" });
    Object.assign(btn.style, {
        marginTop: "15px", padding: "10px 20px", cursor: "pointer",
        backgroundColor: "var(--interactive-accent)", color: "var(--text-on-accent)",
        border: "none", borderRadius: "5px"
    });
    btn.onclick = () => {
        const body = stripped.map(n => `\n\n===== ${n.name} =====\n${n.text}`).join("");
        navigator.clipboard.writeText(AI_REFLECTION_PROMPT + "\n\n" + body + "\n\n" + timeSummary).then(() => {
            btn.innerText = "✅ Copied! (已复制)";
            setTimeout(() => { btn.innerText = label; }, 2000);
        });
    };
}

// 日记「今日碎片」区块（CONS-2 ②，Steph Ango 式日记=链接枢纽）：
// 列出所有链接到本日记的笔记 + 今天创建的笔记。
function renderTodayFragments(dv) {
    const me = dv.current().file;
    const today = parseNoteDate(dv.current().date ?? me.name);

    const linked = dv.pages().where(p =>
        p.file.path !== me.path &&
        (p.file.outlinks || []).some(l => l.path === me.path));

    dv.header(4, "链接到今天的笔记 (Linked today)");
    if (linked.length > 0) dv.list(linked.file.link);
    else dv.paragraph("*暂无 (none yet)*");

    dv.header(4, "今天创建的笔记 (Created today)");
    if (today.isValid()) {
        const todayStr = today.format("YYYY-MM-DD");
        const created = dv.pages().where(p =>
            p.file.path !== me.path && p.file.cday &&
            p.file.cday.toFormat("yyyy-MM-dd") === todayStr);
        if (created.length > 0) dv.list(created.file.link);
        else dv.paragraph("*暂无 (none yet)*");
    } else {
        dv.paragraph("*无法从本笔记解析日期 (cannot parse date from this note)*");
    }
}

// ==========================================================================
// 对外 API (public API)
// eval() 返回最后一个表达式的值 —— 注意必须用括号包成对象表达式，
// 裸写 { ... } 会被解析成代码块而不是对象。
// ==========================================================================
({
    // 数据层
    collectTimeSlots,
    extractReflections,
    buildUuidPageMap,
    // 渲染层
    renderReflectionSection,
    renderTimeStatistics,
    renderTaskTimeTable,
    renderProjectTimeTable,
    renderWarnings,
    renderRollupSection,
    renderTodayFragments,
    // 复制内容拼装（CONS-2）
    stripForCopy,
    summarizeSlotsText,
    detailSlotsText,
    // 工具（年报等自定义布局复用）
    getCleanProjectName,
    minutesBetween,
    parseNoteDate,
    sectionMatches,
});
