<%*
const moment = window.moment;

// ==========================================================
// 1. 输入日期 (预填充当前日期)
// ==========================================================
let inputDate;
// 设置默认值为 "今天"，格式为 YYYY-MM-DD
const defaultDate = moment().format("YYYY-MM-DD");

while (true) {
    // 弹出输入框
    inputDate = await tp.system.prompt("请输入日期 (格式 YYYY-MM-DD，直接回车默认今天):", defaultDate);

    // 如果用户取消或直接回车，使用默认值
    if (inputDate === null || inputDate === "") {
        inputDate = defaultDate;
    }

    // 验证格式是否正确 (必须是有效的 YYYY-MM-DD)
    if (moment(inputDate, "YYYY-MM-DD", true).isValid()) break;

    // 如果无效，提示错误并重新循环
    await tp.system.prompt("日期无效，请使用 YYYY-MM-DD 格式 (例如 2025-01-12)。");
}

// ==========================================================
// 2. 生成日期对象与格式化变量
// ==========================================================
// 将输入的字符串转为 moment 对象，方便后续提取年、月、日、星期
const targetDate = moment(inputDate, "YYYY-MM-DD");

const year = targetDate.format("YYYY");           // 例如: 2025
const fullDate = targetDate.format("MMMM D, YYYY"); // 例如: January 12, 2025
const dayOfWeek = targetDate.format("dddd");      // 例如: Monday
const dateISO = targetDate.format("YYYY-MM-DD");  // 例如: 2025-01-12

// 建议文件名 (如果你希望自动重命名文件，可以使用这个变量)
const suggestedFileName = fullDate;

// ==========================================================
// 3. 动态输出 Frontmatter
// ==========================================================
tR += "---\n";
tR += `tags: journal/daily/${year}\n`;  // 动态根据输入日期的年份生成标签
tR += `date: ${fullDate}\n`;            // 写入标准格式日期
tR += `day_of_week: ${dayOfWeek}\n`;    // 写入星期几
tR += `project:\n  - "[[Area-Journal]]"\n`;
tR += `year: ${year}\n`;
tR += "---\n";

// 可选：自动重命名当前文件为 "January 12, 2025" 这种格式
// 如果不需要自动重命名，可以删除下面这一行
await tp.file.rename(fullDate);
%>
# Daily_Log - <% fullDate %> (<% dayOfWeek %>)


## 🛐 今日灵修 (Daily Devotion)


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

    // 👇👇👇 把这里原本的一行代码，换成上面那一长段 👇👇👇
    // 解析任务名称 (修复下划线导致的 em> 乱码问题)
    let taskNameStr = "-";
    if (t.task_name) {
        if (t.task_name.path) {
            let path = t.task_name.path;
            let displayName = path.split("/").pop().replace(/\.md$/, "");
            let safeDisplayName = displayName.replace(/_/g, "_\u200b");
            taskNameStr = `[[${path}|${safeDisplayName}]]`;
        } else {
            taskNameStr = String(t.task_name).replace(/_/g, "_\u200b");
        }
    }
    // 👆👆👆 替换结束 👆👆👆

    return [
        t.text.replace(/\(.*?::.*?\)/g, "").trim(),
        startStr,
        endStr,
        duration + " min",
        taskNameStr
    ];
});

// 3. 输出表格
dv.table(["任务", "开始", "结束", "时长", "任务名称"], rows);

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
