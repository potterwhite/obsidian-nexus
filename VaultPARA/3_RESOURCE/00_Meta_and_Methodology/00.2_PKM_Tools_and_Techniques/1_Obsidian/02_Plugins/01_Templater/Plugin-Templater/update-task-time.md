<%*
const { update } = app.plugins.plugins["metaedit"].api;
const taskPage = app.workspace.getActiveFile();
const taskPagePath = taskPage.path;
const taskMeta = app.metadataCache.getFileCache(taskPage);
const taskUuid = taskMeta?.frontmatter?.task_uuid;

if (!taskUuid) {
  new Notice("❌ task_uuid not found in current file frontmatter.");
  return;
}

let totalMinutes = 0;
const dailyPages = app.vault.getMarkdownFiles().filter(f => f.path.includes("Daily"));

for (const file of dailyPages) {
  const lines = (await app.vault.read(file)).split('\n');
  for (const line of lines) {
    if (!line.startsWith('- [') || !line.includes('task_uuid::')) continue;

    const uuidMatch = line.match(/task_uuid::\s*([\w-]+)/);
    const startMatch = line.match(/start::\s*(\d{1,2}:\d{2})/);
    const endMatch = line.match(/end::\s*(\d{1,2}:\d{2})/);

    if (!uuidMatch || !startMatch || !endMatch) continue;
    if (uuidMatch[1] !== taskUuid) continue;

    const start = new Date(`1970-01-01T${startMatch[1].padStart(5, '0')}`);
    const end = new Date(`1970-01-01T${endMatch[1].padStart(5, '0')}`);
    const duration = Math.round((end - start) / (1000 * 60));
    totalMinutes += duration;
  }
}

await update(taskPagePath, "total_minutes", totalMinutes);
new Notice(`✅ 已写入总耗时 ${totalMinutes} 分钟 到 ${taskPagePath}`);
%>