---
report_uuid: <%* tR += tp.user.lib_config().safeUuid(tp) %>
type: year-summary
<%*
const moment = window.moment;

// ==========================================================
// 1. 输入年份 (预填充当前年份)
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
// 2. 计算年度起止（对象构造，避免 2 月 29 日溢出）
// ==========================================================
const yearStart = moment({ year: year, month: 0, day: 1 }).startOf("year");
const yearEnd = moment({ year: year, month: 0, day: 1 }).endOf("year");

const suggestedFileName = `${year}-Year-Review`;

tR += `title: ${year} Year Review\n`;
tR += `year: ${year}\n`;
tR += `created: ${moment().format("YYYY-MM-DD")}\n`;
tR += `year_start: ${yearStart.format("MMMM D, YYYY")}\n`;
tR += `year_end: ${yearEnd.format("MMMM D, YYYY")}\n`;
tR += `suggested_file_name: ${suggestedFileName}`;
%>
tags: summary/year
---
<%*
// 统一自动改名（CONS-4）；失败时给用户可见提示而不是中断模板
try {
    await tp.file.rename(suggestedFileName);
} catch (e) {
    new Notice(`⚠️ 自动重命名失败（可能同名文件已存在）: ${suggestedFileName}`, 8000);
}
_%>

# 🗓️ <% year %> Year Review

- **Start (开始)**: <% yearStart.format("MMMM D, YYYY") %>
- **End (结束)**: <% yearEnd.format("MMMM D, YYYY") %>

---

## 📦 Monthly Rollup (月报汇总)

> [!note] 层级汇总（CONS-2 批复）
> 本区自动收集本年所有月报（type: month-summary）的正文内容——包括每篇月报里落盘的
> AI Summary 与手写总结，但不含 dataview 自动统计代码块。
> 一键复制 = AI prompt + 全部月报正文 + 本年压缩时间汇总。
> （年报不再直接扫描 365 天的日记原文——那个量太大，且周报/月报已经逐级提炼过。）

```dataviewjs
// 加载共享配置与共享库（路径集中在 lib_config.js，改位置只改一处）
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
await lib.renderRollupSection(dv, app, cfg, {
    sourceType: "month-summary",
    sourceLabel: "月报 (Monthly Reviews)",
    winStartStr: "<% yearStart.format("YYYY-MM-DD") %>",
    winEndStr: "<% yearEnd.format("YYYY-MM-DD") %>",
});
```

## ⏱️ Yearly Task Time Statistics (年度任务时间统计)

```dataviewjs
// 年度专属布局（月度趋势 + 项目排行 + 分页大图），数据收集复用共享库
const cfg = eval(await dv.io.load("3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/javascript/lib_config.js"));
const lib = eval(await dv.io.load(cfg.DV_LIB_PATH));
const moment = window.moment;

const { slots, warnings } = lib.collectTimeSlots(dv, cfg, "<% yearStart.format("YYYY-MM-DD") %>", "<% yearEnd.format("YYYY-MM-DD") %>");

// 有错不出结果（BUG-4 强化）：红色硬错误块逐条列出问题记录，修复后自动恢复
if (warnings.length > 0) {
    lib.renderErrorBlock(dv, warnings);
} else {

// -----------------------------------------------------------
// 辅助函数：插入强制分页符 (Page Break Helper)
// -----------------------------------------------------------
function insertPageBreak() {
    dv.el("div", "", { attr: { style: "page-break-after: always; height: 0; overflow: hidden;" } });
}

// -----------------------------------------------------------
// 1. 按月聚合 & 项目汇总
// -----------------------------------------------------------
let projectTotals = {};
let monthlyStats = {};
for (let i = 0; i < 12; i++) monthlyStats[i] = { total: 0, projects: {} };

for (let s of slots) {
    const cleanName = lib.getCleanProjectName(s.projectName);
    const projectKey = s.projectFile ? `[[${s.projectFile}|${cleanName}]]` : cleanName;

    if (!projectTotals[projectKey]) projectTotals[projectKey] = 0;
    projectTotals[projectKey] += s.duration;

    const monthIndex = s.dateObj.month(); // 0-11
    monthlyStats[monthIndex].total += s.duration;
    if (!monthlyStats[monthIndex].projects[projectKey]) monthlyStats[monthIndex].projects[projectKey] = 0;
    monthlyStats[monthIndex].projects[projectKey] += s.duration;
}

// -----------------------------------------------------------
// 2. 表格：月度趋势 (Monthly Breakdown)
// -----------------------------------------------------------
let monthlyRows = [];
const monthNames = moment.months();

for (let i = 0; i < 12; i++) {
    let mData = monthlyStats[i];
    let totalMin = mData.total;
    let hours = Math.floor(totalMin / 60);
    let mins = totalMin % 60;
    let timeStr = totalMin > 0 ? `${hours}h ${mins}m` : "-";

    let topProjectName = "-";
    if (totalMin > 0) {
        let sorted = Object.entries(mData.projects).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            let [pName, pTime] = sorted[0];
            let cleanName = pName.includes("|") ? pName.split("|")[1].replace("]]", "") : pName.replace(/\[\[|\]\]/g, "");
            topProjectName = `${cleanName} (${(pTime / 60).toFixed(1)}h)`;
        }
    }
    monthlyRows.push([monthNames[i], timeStr, topProjectName]);
}

dv.header(3, `📅 Monthly Breakdown (月度趋势, <% year %>)`);
dv.table(["Month", "Total Time", "Main Focus"], monthlyRows);

// -----------------------------------------------------------
// 3. 表格：项目总排行 (Project Rankings)
// -----------------------------------------------------------
let sortedProjects = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);
dv.header(3, "🏆 Project Total Time (项目年度排行)");
dv.table(["Project", "Time", "Minutes"], sortedProjects.map(([project, total]) => [
    project, `${Math.floor(total / 60)}h ${total % 60}m`, total
]));

// -----------------------------------------------------------
// 4. 图表数据准备
// -----------------------------------------------------------
let totalMinutes = slots.reduce((sum, s) => sum + s.duration, 0);
let totalHours = totalMinutes / 60;

let projectData = [];
for (let [projectLink, totalMin] of Object.entries(projectTotals)) {
    let fullName = projectLink.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
    let projectName = fullName.split("/").pop().replace(/\.md$/i, "").trim() || "Unknown Project";
    projectData.push({
        project: projectName,
        hours: Math.round(totalMin / 6) / 10,
        minutes: totalMin
    });
}
projectData.sort((a, b) => b.hours - a.hours);

// === 图表 A：工作权重分布 (Pie) ===
dv.header(3, "A. 工作权重分布 (Pie)");
let pieYamlData = projectData.map(p => `  - type: "${p.project.replace(/"/g, '\\"')}"\n    value: ${p.hours}`).join("\n");
dv.el("div", `
\`\`\`chartsview
type: Pie
data:
${pieYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: 500
  autoFit: false
  angleField: value
  colorField: type
  innerRadius: 0.6
  legend:
    position: "right"
    minWidth: 250
    itemWidth: null
    flipPage: true
    maxRow: 22
  label:
    type: inner
    content: "{percentage}"
    style:
      fontSize: 10
  statistic:
    title: false
    content:
      content: '总 ${totalHours.toFixed(1)} h'
  animation: false
\`\`\`
`);

insertPageBreak();

// === 图表 B：项目工时对比 (Column，前 40 名，竖排文字) ===
dv.header(3, "B. 项目工时对比 (Column)");
// ⚡️ 只取前 40 名：渲染 100+ 个竖排柱状图是卡顿的元凶
let topProjects = projectData.slice(0, 40);
// 把 "项目名称" 变成竖排 "项\n目\n名\n称"
let columnYamlData = topProjects.map(p => {
    let vertName = p.project.split("").join("\n");
    let safeName = vertName.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    return `  - project: "${safeName}"\n    hours: ${p.hours}`;
}).join("\n");
dv.el("div", `
\`\`\`chartsview
type: Column
data:
${columnYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: 720
  autoFit: false
  isStack: false
  xField: project
  yField: hours
  seriesField: project
  legend: false
  label:
    position: top
    offsetY: 8
    style:
      fontSize: 12
      fill: '#666'
      opacity: 0.9
      fontWeight: 'bold'
  xAxis:
    label:
      autoRotate: true
      rotate: 0
      autoHide: false
      style:
        fontSize: 11
        fontWeight: 'bold'
        lineHeight: 14
        textAlign: 'center'
  yAxis:
    title:
      text: '小时数 (h)'
  columnWidthRatio: 0.7
  animation: false
\`\`\`
`);

insertPageBreak();

// === 图表 C：项目工时排行 (Bar，分页) ===
dv.header(3, "C. 项目工时排行 (Bar)");
const pageSize = 22;  // 每页 20-25 个最适合 A4/A3 横向
const totalPages = Math.ceil(projectData.length / pageSize);

for (let i = 0; i < totalPages; i++) {
    let pageData = projectData.slice(i * pageSize, (i + 1) * pageSize);
    // 注意：这里必须用 pageData（分页切片），用 projectData 会让每页都渲染全量
    let barYamlData = pageData.map(p => `  - project: "${p.project.replace(/"/g, '\\"')}"\n    hours: ${p.hours}`).join("\n");
    let pageHeight = Math.max(300, pageData.length * 40);

    let titleStr = i === 0 ? "" : `**C. 排行榜 (续 - Part ${i + 1})**`;
    if (titleStr) dv.paragraph(titleStr);

    dv.el("div", `
\`\`\`chartsview
type: Bar
data:
${barYamlData}
options:
  renderer: 'svg'
  width: 1000
  height: ${pageHeight}
  autoFit: false
  yField: project
  xField: hours
  seriesField: project
  barWidthRatio: 0.6
  maxBarWidth: 40
  label:
    position: right
    offset: 10
    style:
      fontSize: 13
      fill: "#666"
  xAxis:
    title:
      text: "小时数 (h)"
    position: "top"
  yAxis:
    label:
      autoEllipsis: false
      style:
        fontSize: 12
        fontWeight: 'bold'
  legend: false
  animation: false
\`\`\`
`, { attr: { style: "width: 1000px; margin: 0 auto;" } });

    if (i < totalPages - 1) insertPageBreak();
}

insertPageBreak();

// === 底部：详细数据汇总表 ===
dv.header(3, "D. 数据汇总表 (Data Table)");
dv.paragraph(`**年度总计 (Year Total)：${totalMinutes} 分钟 (约 ${totalHours.toFixed(1)} 小时)**`);
dv.table(
    ["项目名称", "分钟 (min)", "小时 (h)", "占比"],
    projectData.map(p => [
        p.project,
        p.minutes,
        p.hours,
        totalMinutes > 0 ? (p.minutes / totalMinutes * 100).toFixed(1) + "%" : "0.0%"
    ])
);

}  // end else（数据无误才渲染上面的统计）
```

---

## 📝 Yearly Summary (年度总结)

#### **Major Milestones (重大里程碑):**
- 
#### **Reflections (反思):**
- 
#### **Goals for Next Year (<% year + 1 %> 年目标):**
- 

---

## 🤖 AI Summary (AI 总结落盘区)

> [!tip] 用法
> 点击上方「📋 一键复制」，粘贴给外部 AI；把 AI 返回的年度总结粘贴在下方。



---

## ❓ Annual 40 Questions (年度 40 问)

> [!tip] 用法（Steph Ango 的年度仪式，https://stephango.com/40-questions）
> 每年回答同一套 40 个问题，约花一周慢慢答完，不必一次写完；可增删题目。
> 跨年对比答案最能看出长期变化。直接在每题后面作答即可。

> [!question]- 点击展开 40 问（中英对照，在 `>-` 行下方作答）
> 1. What did you do this year that you'd never done before? —— 今年你做了什么以前从未做过的事？
> 2. Did you keep your new year's resolutions? —— 你守住新年许下的决心了吗？
> 3. Did anyone close to you give birth? —— 你身边有人生孩子了吗？
> 4. Did anyone close to you die? —— 你身边有人离世了吗？
> 5. What cities/states/countries did you visit? —— 今年去过哪些城市/省份/国家？
> 6. What would you like to have next year that you lacked this year? —— 明年你想拥有什么今年缺失的东西？
> 7. What date(s) from this year will remain etched upon your memory, and why? —— 今年的哪个/哪些日子会刻在你记忆里？为什么？
> 8. What was your biggest achievement of the year? —— 今年最大的成就是什么？
> 9. What was your biggest failure? —— 今年最大的失败是什么？
> 10. What other hardships did you face? —— 还经历了哪些困难？
> 11. Did you suffer illness or injury? —— 生过病或受过伤吗？
> 12. What was the best thing you bought? —— 买过的最值的东西是什么？
> 13. Whose behavior merited celebration? —— 谁的行为值得称赞？
> 14. Whose behavior made you appalled? —— 谁的行为让你震惊/不齿？
> 15. Where did most of your money go? —— 钱大多花到哪去了？
> 16. What did you get really, really, really excited about? —— 什么事让你特别特别特别兴奋？
> 17. What song will always remind you of this year? —— 哪首歌会让你永远想起这一年？
> 18. Compared to this time last year, are you: happier or sadder? Richer or poorer? Healthier or unhealthier? —— 和去年同期比：更快乐还是更难过？更富还是更穷？更健康还是更差？
> 19. What do you wish you'd done more of? —— 你希望自己多做了什么？
> 20. What do you wish you'd done less of? —— 你希望自己少做了什么？
> 21. How are you spending the holidays? —— 假期是怎么过的？
> 22. Did you fall in love this year? —— 今年坠入爱河了吗？
> 23. Do you hate anyone now that you didn't hate this time last year? —— 现在有谁是去年同期不恨、现在恨的？
> 24. What was your favorite show? —— 最喜欢的剧集/节目是什么？
> 25. What was the best book you read? —— 读过的最好的书是哪本？
> 26. What was your greatest musical discovery of the year? —— 今年最大的音乐发现是什么？
> 27. What was your favorite film? —— 最喜欢的电影是什么？
> 28. What was your favorite meal? —— 最爱的一餐是什么？
> 29. What did you want and get? —— 想要什么、并且得到了？
> 30. What did you want and not get? —— 想要什么、但没得到？
> 31. What did you do on your birthday? —— 生日那天做了什么？
> 32. What one thing would have made your year immeasurably more satisfying? —— 哪一件事若发生了，会让这一年满意得多？
> 33. How would you describe your personal fashion this year? —— 怎么形容你今年的穿衣风格？
> 34. What kept you sane? —— 是什么让你保持理智/没垮掉？
> 35. Which celebrity/public figure did you admire the most? —— 最钦佩的名人/公众人物是谁？
> 36. What political issue stirred you the most? —— 哪个公共议题最触动你？
> 37. Who did you miss? —— 你想念谁？
> 38. Who was the best new person you met? —— 今年新认识的人里最棒的是谁？
> 39. What valuable life lesson did you learn this year? —— 今年学到的人生教训是什么？
> 40. What is a quote that sums up your year? —— 用哪句话可以总结这一年？

### ✍️ My Answers (我的作答)

1. 
2. 
3. 
（题目在上方折叠块里，在此逐条作答；答不完的留到明年对比）

---

## 🔗 Related Links (相关链接)
- [[Project_Obsidian-Nexus]]
