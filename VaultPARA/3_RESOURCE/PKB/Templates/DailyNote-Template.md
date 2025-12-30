---
tags: journal/daily/<% tp.date.now("YYYY") %>
date: <% tp.date.now("MMMM D, YYYY") %>
day_of_week: <% tp.date.now("dddd") %>
project: "[[Area-Journal]]"
year: <% tp.date.now("YYYY") %>
---

# Daily_Log - <% tp.file.title %> (<% tp.date.now("dddd") %>)

## ✅ 今日目标 (Today's Goals)

```dataviewjs
// ----------------------------
// 自动获取“昨天”的日期
// 逻辑：基于文件名解析日期，如果文件名无法解析，则默认用“今天-1天”
// ----------------------------
const moment = window.moment;
let currentMoment;

// 尝试从文件名解析日期 (支持 "December 29, 2025" 或 "YYYY-MM-DD")
// 如果你的文件名是 "December 29, 2025"
if (moment(dv.current().file.name, "MMMM D, YYYY", true).isValid()) {
    currentMoment = moment(dv.current().file.name, "MMMM D, YYYY");
}
// 如果你的文件名是 "2025-12-29"
else if (moment(dv.current().file.name, "YYYY-MM-DD", true).isValid()) {
    currentMoment = moment(dv.current().file.name, "YYYY-MM-DD");
}
// 如果都解析不了，默认认为是“今天”
else {
    currentMoment = moment();
}

// 推算昨天
const yesterdayMoment = currentMoment.clone().subtract(1, 'days');

// 尝试寻找昨天的文件（兼容两种常见的命名格式）
// 优先找和你当前文件名格式一致的“昨天”
let yesterdayFile = dv.page(yesterdayMoment.format("MMMM D, YYYY")) || dv.page(yesterdayMoment.format("YYYY-MM-DD"));

if (yesterdayFile) {
    // 读取文件内容寻找“明日计划”
    const content = await app.vault.read(app.vault.getAbstractFileByPath(yesterdayFile.file.path));
    const lines = content.split('\n');
    let inTomorrow = false;
    let tasks = [];

    // 正则匹配：支持中文 "明日计划" 或 "Tomorrow's Plan"
    for (let line of lines) {
        if (/^##\s*➡️?\s*(明日计划|Tomorrow's Plan)/i.test(line)) {
            inTomorrow = true;
        } else if (/^## /.test(line) && inTomorrow) {
            break; // 遇到下一个标题，停止读取
        } else if (inTomorrow && /^\s*-\s*\[.\]/.test(line)) {
            tasks.push(line);
        }
    }

    if (tasks.length > 0) {
        dv.header(4, "📋 来自昨天的计划：");
        dv.paragraph(tasks.join('\n'));
    } else {
        dv.paragraph("✅ 昨天没有遗留的明日计划。");
    }
} else {
    dv.paragraph(`ℹ️ 未找到昨天的日记: ${yesterdayMoment.format("YYYY-MM-DD")} (可能昨天未创建或文件名格式不同)`);
}
```

---

## ⏳ 时间块记录 (Time Blocks)

**请使用 Templater 插入模板 TimeBlock-Insert-Templater.md**

- [ ] Task description (start:: ) (end:: ) (task_uuid:: [[Task-UUID-Name]]) (task_name:: [[Task-Name]])

---

## 📈 今日时间分析 (Time Analysis)

```dataviewjs
// 1. 获取当前文件的所有带时间的任务
const tasks = dv.current().file.tasks.where(t => t.start && t.end);

let totalMinutes = 0;

function padTime(t) {
  let [h, m] = t.split(":");
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

// 2. 准备表格数据
let rows = tasks.map(t => {
    let startStr = padTime(t.start);
    let endStr = padTime(t.end);

    // 使用固定的日期字符串来计算时间差，避免跨日问题干扰
    let baseDate = "2000-01-01T";
    let startTime = new Date(baseDate + startStr);
    let endTime = new Date(baseDate + endStr);

    // 计算分钟数
    let duration = Math.round((endTime - startTime) / (1000 * 60));

    // 防止负数（比如跨午夜或填错），简单处理为绝对值或忽略
    if (duration < 0) duration += 24 * 60;

    totalMinutes += duration;

    // 解析项目名称
    let projectLink = t.project ? t.project : "-";

    return [
        t.text,
        startStr,
        endStr,
        duration + " min",
        t.category || "-",
        projectLink
    ];
});

// 3. 输出表格
dv.table(["任务", "开始", "结束", "时长", "分类", "项目"], rows);

// 4. 输出总计
if (totalMinutes > 0) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let timeString = "";
  if (hours > 0) timeString += `${hours} 小时 `;
  if (minutes > 0) timeString += `${minutes} 分钟`;

  dv.paragraph(`**⏱️ 总耗时：${timeString}** (共 ${totalMinutes} 分钟)`);
} else {
    dv.paragraph("今天还没有记录时间块。");
}
```

---

## 💡 想法与反思 (Ideas & Reflections)

---

## ➡️ 明日计划 (Tomorrow's Plan)

- [ ]
