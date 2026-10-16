---
report_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
type: week-summary
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
// 2. 动态计算该年份的最大周数 (周日起始 / Sunday start)
// 周起始约定集中在 lib_config.js 的 WEEK_LOCALE（作者明确选择周日起始）
// ==========================================================
const weekLocale = tp.user.lib_config().WEEK_LOCALE;
const maxWeeks = moment(String(year), "YYYY").locale(weekLocale).weeksInYear();

// ==========================================================
// 3. 输入周号 (预填充计算好的周号)
// ==========================================================
let inputWeek;
while (true) {
    let defaultWeek = moment().locale(weekLocale).week();
    if (defaultWeek > maxWeeks) defaultWeek = 1;  // 跨年边界保护

    inputWeek = await tp.system.prompt(`请输入周号 (直接回车默认: ${defaultWeek}, 范围: 1-${maxWeeks}):`, defaultWeek);
    if (inputWeek === null || inputWeek === "") inputWeek = defaultWeek;

    const weekNumVal = parseInt(inputWeek, 10);
    if (!isNaN(weekNumVal) && weekNumVal >= 1 && weekNumVal <= maxWeeks) break;
    await tp.system.prompt(`周号无效，请输入 1 到 ${maxWeeks} 之间的数字。`);
}
const weekNum = parseInt(inputWeek, 10);

// ==========================================================
// 4. 计算周起止
// ==========================================================
const weekStart = moment(String(year), "YYYY").locale(weekLocale).week(weekNum).startOf('week');
const weekEnd = moment(String(year), "YYYY").locale(weekLocale).week(weekNum).endOf('week');

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
<%*
// 统一自动改名（CONS-4）；失败时给用户可见提示而不是中断模板
try {
    await tp.file.rename(suggestedFileName);
} catch (e) {
    new Notice(`⚠️ 自动重命名失败（可能同名文件已存在）: ${suggestedFileName}`, 8000);
}
_%>

# 🗓️ <% year %> Week <% weekNum %> Review

- **Start (开始)**: <% weekStart.format("YYYY-MM-DD") %> (Sunday 周日)
- **End (结束)**: <% weekEnd.format("YYYY-MM-DD") %> (Saturday 周六)
- **Week (周数)**: <% weekNum %>

---

## 💡 Ideas & Reflections (想法与反思)

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
await lib.renderReflectionSection(dv, app, cfg, "<% weekStart.format("YYYY-MM-DD") %>", "<% weekEnd.format("YYYY-MM-DD") %>");
```

## ⏱️ Task Time Statistics (任务时间统计)

```dataviewjs
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
lib.renderTimeStatistics(dv, app, cfg, "<% weekStart.format("YYYY-MM-DD") %>", "<% weekEnd.format("YYYY-MM-DD") %>");
```

---

## 📝 Weekly Summary (本周总结)

### Main Progress (核心进度):
- 

### Issues & Reflections (问题与反思):
- 

### Next Week's Plan (下周计划):
- 

---

## 🔗 Related Links (相关链接)
- [[Project_Obsidian-Nexus]]
