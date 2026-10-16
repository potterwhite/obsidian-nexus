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
// 2. 输入月份
// ⚠️ KNOWN_ISSUES BUG-2 待批复：此处按 Esc 取消输入会死循环，
//    批复后将与年份输入对齐（null/空串回退默认值）。
// ==========================================================
let inputMonth;
while (true) {
    inputMonth = await tp.system.prompt("请输入月份 (Enter month number 1-12):", moment().month() + 1);
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

## 💡 Ideas & Reflections (想法与反思)

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
await lib.renderReflectionSection(dv, app, cfg, "<% monthStart.format("YYYY-MM-DD") %>", "<% monthEnd.format("YYYY-MM-DD") %>");
```

## ⏱️ Task Time Statistics (任务时间统计)

```dataviewjs
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
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

## 🔗 Related Links (相关链接)
- [[Project_Obsidian-Nexus]]
