<%*
// 1. 询问年份
let inputYear = await tp.system.prompt("请输入统计年份", tp.date.now("YYYY"));
// 2. 询问姓名 (默认给个占位符，你可以改成你自己的名字作为默认)
let authorName = await tp.system.prompt("请输入汇报人姓名", "Author");

// 3. 生成建议文件名 (年份-姓名-标题)
const suggestedName = `${inputYear}-年度工作时间统计表-${authorName}`;
_%>
---
report_uuid: <%* tR += tp.user.uuid ? tp.user.uuid() : "no-uuid" %>
type: year-stats-manual
year: <% inputYear %>
author: <% authorName %>
created: <% tp.date.now("YYYY-MM-DD") %>
tags: summary/stats
suggested_name: <% suggestedName %>
---


# <% inputYear %>年度工作时间统计表


**汇报人：<% authorName %>**  |  **生成日期：<% tp.date.now("YYYY-MM-DD") %>**


## 1. 数据录入 (Data Entry)
> [!tip] 录入说明
> 请在下方代码块的 `manualData` 区域录入数据。
> *   **name**: 项目名称 (中文)。
> *   **minutes**: 投入的分钟数 (例如 90 代表 1.5小时)。
> *   无需计算小时，脚本会自动转换。
> *   修改后点击任意空白处，图表会自动刷新。

```dataviewjs
// =================================================================
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 数据录入区域 (请修改这里) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// =================================================================

// 格式：{ name: "项目名", minutes: 分钟数 },
const manualData = [
    { name: "公司主要业务系统研发",    minutes: 19230 }, 
    { name: "跨部门沟通与协调",        minutes: 9000  },
    { name: "团队技术培训与文档",      minutes: 4800  },
    { name: "年度合规性审查",          minutes: 2730  },
    { name: "行政事务与其它",          minutes: 1800  },
];
// =================================================================
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 数据录入结束 (下方代码无需修改) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// =================================================================

// 1. 数据转换逻辑 (分钟 -> 小时)
// 映射为图表需要的数据结构
let projectData = manualData.map(p => ({
    project: p.name,
    minutes: p.minutes,
    hours: Number((p.minutes / 60).toFixed(1)) // 保留1位小数
}));

// 按时长从高到低排序
projectData.sort((a, b) => b.minutes - a.minutes);

// 计算总时长
let totalMinutes = projectData.reduce((sum, p) => sum + p.minutes, 0);
let totalHours = totalMinutes / 60;

// =================================================================
// 2. 图表渲染区域 (复用原有逻辑，未修改任何样式)
// =================================================================

// === 图表 A：工作权重分布 (Pie) ===
dv.header(3, "A. 工作权重分布 (Pie)");

let pieYamlData = projectData.map(p => {
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
      content: '总 ${totalHours.toFixed(1)} h'
\`\`\`
`);

// === 图表 B：项目工时对比 (Column) ===
dv.header(3, "B. 项目工时对比 (Column)");

let columnYamlData = projectData.map(p => {
    let safeName = p.project.replace(/"/g, '\\"');
    return `  - project: "${safeName}"\n    hours: ${p.hours}`;
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
      rotate: 45
      autoHide: false
      style:
        fontSize: 11
  yAxis:
    title:
      text: '小时数 (h)'
  columnWidthRatio: 0.6
  maxColumnWidth: 60
  animation: true
\`\`\`
`);

// === 图表 C：项目工时排行 (Bar) ===
dv.header(3, "C. 项目工时排行 (Bar)");

let barYamlData = projectData.map(p => {
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
      text: "小时数 (h)"
  yAxis:
    label:
      style:
        fontSize: 12
  legend:
    position: "top-right"
  animation: true
\`\`\`
`);

// === 底部：详细数据汇总表 ===
dv.header(3, "D. 数据汇总表 (Data Table)");
dv.paragraph(`**年度总计：${totalMinutes} 分钟 (约 ${totalHours.toFixed(1)} 小时)**`);

dv.table(
    ["项目名称", "分钟 (min)", "小时 (h)", "占比"],
    projectData.map(p => [
        p.project,
        p.minutes, 
        p.hours, 
        (p.minutes / totalMinutes * 100).toFixed(1) + "%"
    ])
);
```

---

## 2. 备注与说明
- **数据来源：** 基于项目日志统计。
- **统计区间：** <% inputYear %> 全年。
