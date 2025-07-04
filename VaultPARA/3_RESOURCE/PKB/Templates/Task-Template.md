---
# 全局唯一ID，建议用uuid或项目名+简短描述
task_uuid: <%* tR += tp.user.uuid() %>
task_name: <% tp.file.title %>
project: [[Project_Markdown_FILE_NAME]]
created: <% tp.date.now("YYYY-MM-DD") %>
status: todo                          # todo, doing, done, cancelled
priority: medium                      # 可选: low, medium, high
tags: journal/task
# 可扩展更多属性，如 deadline, owner, etc.
---

# <% tp.file.title %>

## 任务描述
请填写任务目标、背景、预期成果等。

## 进展记录
- [ ] <% tp.date.now("YYYY-MM-DD") %> 在 [[<% tp.date.now("MMMM D, YYYY") %>]] 完成阶段性工作

## 相关链接
- [[wiki_url]]

## 统计进展情况
```dataviewjs
const taskId = dv.current().task_uuid;
let rows = [];

for (let page of dv.pages('#journal/daily')) {
    if (!page.file.tasks) continue;
    for (let t of page.file.tasks) {
        if (
            t.task_uuid === taskId &&
            t.start && t.end &&
            t.section && t.section.subpath &&  t.section.subpath.startsWith("⏳ 时间块记录")
        ) {
            let start = new Date("1970-01-01T" + t.start.padStart(5, '0'));
            let end = new Date("1970-01-01T" + t.end.padStart(5, '0'));
            let duration = Math.round((end - start) / (1000 * 60));
            rows.push([
                "[[" + page.file.name + "]]",
                t.date || "",
                t.start,
                t.end,
                duration + " 分钟"
            ]);
        }
    }
}

dv.table(["日记", "日期", "开始", "结束", "时长"], rows);

```