<%*


// 1. 询问开始时间（默认当前时间，直接回车就用现在）
const defaultStart = tp.date.now("HH:mm");
const startTime = await tp.system.prompt(
    "开始时间（Start time）",
    defaultStart,
    false,
    "格式 HH:mm，直接回车使用当前时间 " + defaultStart
);

// 2. 询问结束时间（可以留空，稍后手动填）
const endTime = await tp.system.prompt(
    "结束时间（End time）",
    "",
    false,
    "格式 HH:mm，如果还没结束可以留空"
) || "";  // 如果用户直接回车，就为空字符串

// 3. 任务描述（本次具体做了什么）
const taskText = await tp.system.prompt("本次任务的具体描述（Task description）");

// 选择已有的任务文件
const allFiles = app.vault.getMarkdownFiles();
const selectedFile = await tp.system.suggester(
    (f) => f.basename,                  // 显示文件名
    allFiles,
    false,
    "请选择要关联的任务文件（支持搜索）"
);

if (!selectedFile) {
    new Notice("未选择任务文件，取消插入");
    return;
}

// 读取选中任务文件的 task_uuid
const taskFileMeta = app.metadataCache.getFileCache(selectedFile);
const task_uuid = taskFileMeta?.frontmatter?.task_uuid;

if (!task_uuid) {
    new Notice("选中的任务文件没有 task_uuid，已取消");
    return;
}

// 生成显示用的干净名字（把下划线换成空格，避免斜体）
const cleanDisplayName = selectedFile.basename.replace(/_/g, " ");
// 用别名链接：[[真实文件名|显示名字]]
const taskLink = `[[${selectedFile.basename}|${cleanDisplayName}]]`;

// 实时预览：选完任务后让你看一眼最终效果
let preview = `- [ ] ${taskText} (start:: ${startTime})`;
if (endTime && endTime.trim() !== "") {
    preview += ` (end:: ${endTime})`;
} else {
    preview += ` (end:: )`;
}
preview += ` (task_uuid:: ${task_uuid}) (task_name:: ${taskLink})`;

new Notice("即将插入：\n\n" + preview + "\n\n（8秒后自动消失）", 8000);

let timeBlock = `- [ ] ${taskText} (start:: ${startTime})`;
if (endTime && endTime.trim() !== "") {
    timeBlock += ` (end:: ${endTime})`;
} else {
    timeBlock += ` (end:: )`;
}
timeBlock += ` (task_uuid:: ${task_uuid}) (task_name:: ${taskLink})`;
tR += timeBlock;

%>