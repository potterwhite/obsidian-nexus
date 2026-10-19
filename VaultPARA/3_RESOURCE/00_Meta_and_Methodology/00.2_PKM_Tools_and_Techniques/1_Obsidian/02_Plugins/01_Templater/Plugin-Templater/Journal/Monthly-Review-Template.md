---
report_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
type: month-summary
<%*
const moment = window.moment;

// ==========================================================
// 1. 输入年份 (预填充当前年份，直接回车即可)
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
// 2. 输入月份（Esc 取消或空输入回退当前月份，与年份输入对齐 —— BUG-2 已修复）
// ==========================================================
let inputMonth;
while (true) {
    inputMonth = await tp.system.prompt("请输入月份 (直接回车默认当前月份, Enter month number 1-12):", moment().month() + 1);
    if (inputMonth === null || inputMonth === "") inputMonth = String(moment().month() + 1);
    if (/^(?:[1-9]|1[0-2])$/.test(inputMonth)) break;
    await tp.system.suggester(["OK"], "月份无效，请输入 1-12 (Invalid month, enter 1-12).");
}
const monthNum = parseInt(inputMonth, 10);

// ==========================================================
// 3. 计算月起止
// 用对象构造日期：直接指定年/月，避免在 31 号设置短月份时日期溢出。
// Build from parts to avoid day-overflow (BUG-3 已修复).
// ==========================================================
const monthStart = moment({ year: year, month: monthNum - 1, day: 1 }).startOf("month");
const monthEnd = moment({ year: year, month: monthNum - 1, day: 1 }).endOf("month");

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
<%*
// 统一自动改名（CONS-4）；失败时给用户可见提示而不是中断模板
try {
    await tp.file.rename(suggestedFileName);
} catch (e) {
    new Notice(`⚠️ 自动重命名失败（可能同名文件已存在）: ${suggestedFileName}`, 8000);
}
_%>

# 🗓️ <% year %> Month <% monthNum %> Review

- **Start (开始)**: <% monthStart.format("MMMM D, YYYY") %>
- **End (结束)**: <% monthEnd.format("MMMM D, YYYY") %>
- **Month (月份)**: <% monthNum %>

---

## 📦 Weekly Rollup (周报汇总)

> [!note] 层级汇总（CONS-2 批复）
> 本区自动收集本月所有周报（type: week-summary）的正文内容——包括每篇周报里落盘的
> AI Summary 与手写总结，但不含 dataview 自动统计代码块。
> 一键复制 = AI prompt + 全部周报正文 + 本月压缩时间汇总（按日/按项目总计，
> 不重复 30 天的每一条时间块——那太多了）。每天的原始反思在各周报里查看。

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
await lib.renderRollupSection(dv, app, cfg, {
    sourceType: "week-summary",
    sourceLabel: "周报 (Weekly Reviews)",
    winStartStr: "<% monthStart.format("YYYY-MM-DD") %>",
    winEndStr: "<% monthEnd.format("YYYY-MM-DD") %>",
});
```

## ⏱️ Task Time Statistics (任务时间统计)

```dataviewjs
const lib = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js"));
// cfg = lib_config 基础约定 + lib_config_local 私人覆盖（文件缺失则静默跳过）
const cfg = await lib.loadCfg(dv);
lib.renderTimeStatistics(dv, app, cfg, "<% monthStart.format("YYYY-MM-DD") %>", "<% monthEnd.format("YYYY-MM-DD") %>");
```

---

## 📝 Monthly Summary (本月总结)

### Main Progress (核心进度):
- 

### Issues & Reflections (问题与反思):
- 

### Next Month's Plan (下月计划):
- 

---

## 🤖 AI Summary (AI 总结落盘区)

> [!tip] 用法
> 点击上方「📋 一键复制」，粘贴给外部 AI；把 AI 返回的月度总结粘贴在下方。
> 年报会自动收集本区内容做年度汇总。



---

## 🔗 Related Links (相关链接)
- [[Project_Obsidian-Nexus]]
