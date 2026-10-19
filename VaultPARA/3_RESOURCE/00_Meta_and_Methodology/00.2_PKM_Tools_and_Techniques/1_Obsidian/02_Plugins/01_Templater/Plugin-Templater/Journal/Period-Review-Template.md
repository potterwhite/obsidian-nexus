---
report_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
type: period-summary
<%*
const moment = window.moment;
const cfg = tp.user.lib_config();

// ==========================================================
// 通用区间报告（v1：公历模式；农历年留待后续迭代）
// 两层交互：先选模式，再问该模式的具体参数（均带默认值）。
// 统计窗口 = 精确日期；汇总区 = 边界月/周报整篇纳入（有提醒）。
// ==========================================================

// ---------- 小工具：带校验的输入 ----------
async function askYear(def) {
    while (true) {
        let y = await tp.system.prompt(`请输入年份 (直接回车默认 ${def}):`, String(def));
        if (y === null || y === "") y = String(def);
        if (/^\d{4}$/.test(y)) return parseInt(y, 10);
        await tp.system.prompt("年份无效，请输入4位数字。");
    }
}
async function askDate(msg, def) {
    while (true) {
        let d = await tp.system.prompt(msg, def);
        if (d === null || d === "") d = def;
        if (moment(d, "YYYY-MM-DD", true).isValid()) return moment(d, "YYYY-MM-DD");
        await tp.system.prompt("日期无效，请使用 YYYY-MM-DD 格式。");
    }
}

// ---------- 第一层：选模式 ----------
const MODE_LABELS = {
    month:   "月份 (Month)",
    quarter: "季度 (Quarter)",
    half:    "半年度 (Half-Year)",
    year:    "公历年度 (Gregorian Year)",
    custom:  "自定义区间 (Custom Range)",
};
const mode = await tp.system.suggester(
    Object.values(MODE_LABELS), Object.keys(MODE_LABELS), false,
    "选择报告类型 (Esc 取消)");
if (!mode) { new Notice("已取消生成区间报告", 5000); return; }

// ---------- 第二层：按模式问参数，算出精确日期窗口 ----------
let winStart, winEnd, label, fileName;

if (mode === "month") {
    let ym;
    while (true) {
        ym = await tp.system.prompt("请输入年月 (YYYY-MM，回车默认当前月):", moment().format("YYYY-MM"));
        if (ym === null || ym === "") ym = moment().format("YYYY-MM");
        if (moment(ym + "-01", "YYYY-MM-DD", true).isValid()) break;
        await tp.system.prompt("格式无效，请输入 YYYY-MM（例如 2026-10）。");
    }
    winStart = moment(ym + "-01", "YYYY-MM-DD").startOf("month");
    winEnd = winStart.clone().endOf("month");
    label = ym;
    fileName = `${winStart.format("YYYY")}-M${winStart.format("M")}-month-Review`;

} else if (mode === "quarter") {
    const y = await askYear(moment().year());
    const qNow = Math.floor(moment().month() / 3) + 1;
    const qValues = [qNow, ...[1, 2, 3, 4].filter(q => q !== qNow)];
    const qRanges = { 1: "1-3月", 2: "4-6月", 3: "7-9月", 4: "10-12月" };
    const q = await tp.system.suggester(
        qValues.map(v => `Q${v} (${qRanges[v]})`), qValues, false, `选择季度 (${y} 年)`);
    if (!q) { new Notice("已取消生成区间报告", 5000); return; }
    winStart = moment({ year: y, month: (q - 1) * 3, day: 1 });
    winEnd = winStart.clone().add(2, "months").endOf("month");
    label = `${y} Q${q}`;
    fileName = `${y}-Q${q}-Review`;

} else if (mode === "half") {
    const y = await askYear(moment().year());
    const hNow = moment().month() < 6 ? 1 : 2;
    const hValues = [hNow, hNow === 1 ? 2 : 1];
    const h = await tp.system.suggester(
        hValues.map(v => v === 1 ? "上半年 H1 (1-6月)" : "下半年 H2 (7-12月)"),
        hValues, false, `选择半年度 (${y} 年)`);
    if (!h) { new Notice("已取消生成区间报告", 5000); return; }
    winStart = moment({ year: y, month: h === 1 ? 0 : 6, day: 1 });
    winEnd = winStart.clone().add(5, "months").endOf("month");
    label = `${y} H${h}`;
    fileName = `${y}-H${h}-Review`;

} else if (mode === "year") {
    const y = await askYear(moment().year());
    winStart = moment({ year: y, month: 0, day: 1 }).startOf("year");
    winEnd = moment({ year: y, month: 0, day: 1 }).endOf("year");
    label = `${y}`;
    fileName = `${y}-Year-Review`;

} else {  // custom
    winStart = await askDate("开始日期 (YYYY-MM-DD，回车默认 30 天前):", moment().subtract(30, "days").format("YYYY-MM-DD"));
    winEnd = await askDate("结束日期 (YYYY-MM-DD，回车默认今天):", moment().format("YYYY-MM-DD"));
    if (winEnd.isBefore(winStart)) {
        const t = winStart; winStart = winEnd; winEnd = t;
        new Notice("起止日期已自动对调", 5000);
    }
    label = `${winStart.format("YYYY-MM-DD")} ~ ${winEnd.format("YYYY-MM-DD")}`;
    fileName = `${winStart.format("YYYY-MM-DD")}_to_${winEnd.format("YYYY-MM-DD")}-Review`;
}

// ---------- 汇总层级：窗口 ≥2 个月聚合月报，否则聚合周报 ----------
const useWeekly = winEnd.diff(winStart, "months", true) < 2;
const sourceType = useWeekly ? "week-summary" : "month-summary";
const sourceLabel = useWeekly ? "周报 (Weekly Reviews)" : "月报 (Monthly Reviews)";

// 汇总扫描窗口扩到整月/整周边界（时间统计仍用精确窗口）
const rollStart = useWeekly
    ? winStart.clone().locale(cfg.WEEK_LOCALE).startOf("week")
    : winStart.clone().startOf("month");
const rollEnd = useWeekly
    ? winEnd.clone().locale(cfg.WEEK_LOCALE).endOf("week")
    : winEnd.clone().endOf("month");

// 边界被扩大过才提醒（自定义区间常见；整月/季/半年/年模式不会触发）
const boundaryNote = (!rollStart.isSame(winStart, "day") || !rollEnd.isSame(winEnd, "day"))
    ? `> [!warning] 边界周期已整篇纳入\n`
      + `> 本窗口起止不在自然${useWeekly ? "周" : "月"}边界上：下方汇总区已把边界的${sourceLabel}**整篇**纳入（含窗口外的内容）；`
      + `时间统计仍按精确日期 ${winStart.format("YYYY-MM-DD")} ~ ${winEnd.format("YYYY-MM-DD")} 计算，不受影响。`
    : "";

// ---------- frontmatter ----------
tR += `period_mode: ${mode}\n`;
tR += `title: ${fileName}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `period_start: ${winStart.format("YYYY-MM-DD")}\n`;
tR += `period_end: ${winEnd.format("YYYY-MM-DD")}\n`;
tR += `suggested_file_name: ${fileName}`;
%>
tags: summary/period
---
<%*
// 统一自动改名（CONS-4）；失败时给用户可见提示而不是中断模板
try {
    await tp.file.rename(fileName);
} catch (e) {
    new Notice(`⚠️ 自动重命名失败（可能同名文件已存在）: ${fileName}`, 8000);
}
_%>

# 📅 <% label %> Period Review (区间报告)

- **Mode (模式)**: <% MODE_LABELS[mode] %>
- **Start (开始)**: <% winStart.format("YYYY-MM-DD (dddd)") %>
- **End (结束)**: <% winEnd.format("YYYY-MM-DD (dddd)") %>

<% boundaryNote %>

---

## 📦 <% useWeekly ? "Weekly Rollup (周报汇总)" : "Monthly Rollup (月报汇总)" %>

> [!note] 层级汇总
> 本区自动收集窗口内所有<% sourceLabel %>的正文内容——包括各篇落盘的
> AI Summary 与手写总结，但不含 dataview 自动统计代码块。
> 一键复制 = AI prompt + 全部正文 + 本窗口压缩时间汇总。

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
await lib.renderRollupSection(dv, app, cfg, {
    sourceType: "<% sourceType %>",
    sourceLabel: "<% sourceLabel %>",
    winStartStr: "<% rollStart.format("YYYY-MM-DD") %>",
    winEndStr: "<% rollEnd.format("YYYY-MM-DD") %>",
});
```

---

## ⏱️ Time Statistics (时间统计)

```dataviewjs
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
lib.renderTimeStatistics(dv, app, cfg, "<% winStart.format("YYYY-MM-DD") %>", "<% winEnd.format("YYYY-MM-DD") %>");
```

---

## 📝 Period Summary (本期总结)

### Main Progress (核心进展):
- 
### Issues & Reflections (问题与反思):
- 
### Next Period's Plan (下期计划):
- 

---

## 🤖 AI Summary (AI 总结落盘区)

> [!tip] 用法
> 点击上方「📋 一键复制」，粘贴给外部 AI；把 AI 返回的总结粘贴在下方。



---
