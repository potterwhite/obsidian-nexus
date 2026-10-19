<%*
// ==========================================================
// update-task-time
// 统计当前任务文件在所有日记「⏳ 时间块记录」区块中的总耗时，
// 并写回当前文件的 frontmatter (total_minutes)。
//
// Totals every time block linked to the current task across all
// daily notes, then writes the sum back into the frontmatter.
// ==========================================================

// ---------- 配置 (Config) ----------
// 约定集中在 lib_config.js（STRUCT-1）；未加载时给出可见报错（CONS-3）
if (!tp.user.lib_config) {
  new Notice("❌ lib_config.js 未加载：请检查 Templater「Script files folder」设置并重启 Obsidian", 10000);
  return;
}
const cfg = tp.user.lib_config();
const DAILY_TAG = cfg.DAILY_TAG;                 // 日记标签（子标签也算，如 journal/daily/2025）
const TIME_BLOCK_KEYS = cfg.SECTION_KEYS.timeBlocks;  // 只统计「时间块」标题下的记录

// ---------- 1. 读取当前任务文件的 task_uuid ----------
const taskPage = app.workspace.getActiveFile();
if (!taskPage) {
  new Notice("❌ 没有打开的文件 (No active file)");
  return;
}
const taskUuid = app.metadataCache.getFileCache(taskPage)?.frontmatter?.task_uuid;
if (!taskUuid) {
  new Notice("❌ 当前文件 frontmatter 里没有 task_uuid (task_uuid not found)");
  return;
}

// ---------- 2. 通过标签定位日记（与统计报表同一套规则） ----------
// Daily notes are located by tag (same rule as the review reports),
// not by file path.
function isDailyNote(file) {
  const tags = app.metadataCache.getFileCache(file)?.frontmatter?.tags;
  if (!tags) return false;
  const list = Array.isArray(tags) ? tags : [tags];
  return list.some(t => {
    const clean = String(t).replace(/^#/, "");
    return clean === DAILY_TAG || clean.startsWith(DAILY_TAG + "/");
  });
}
const dailyPages = app.vault.getMarkdownFiles().filter(isDailyNote);

// ---------- 3. 扫描时间块 ----------
let totalMinutes = 0;
let matchedBlocks = 0;
let skippedNegative = 0;   // 跨午夜产生负时长的块，暂时跳过（见 KNOWN_ISSUES BUG-4）

for (const file of dailyPages) {
  const lines = (await app.vault.read(file)).split('\n');
  let inTimeBlockSection = false;

  for (const line of lines) {
    // 跟踪当前所在的标题区块（中英关键词任一命中即可）
    const headingMatch = line.match(/^#+\s+(.*)$/);
    if (headingMatch) {
      inTimeBlockSection = TIME_BLOCK_KEYS.some(k => headingMatch[1].includes(k));
      continue;
    }
    if (!inTimeBlockSection) continue;
    if (!line.startsWith('- [') || !line.includes('task_uuid::')) continue;

    const uuidMatch = line.match(/task_uuid::\s*([\w-]+)/);
    const startMatch = line.match(/start::\s*(\d{1,2}:\d{2})/);
    const endMatch = line.match(/end::\s*(\d{1,2}:\d{2})/);
    if (!uuidMatch || !startMatch || !endMatch) continue;
    if (uuidMatch[1] !== taskUuid) continue;

    const start = new Date(`1970-01-01T${startMatch[1].padStart(5, '0')}`);
    const end = new Date(`1970-01-01T${endMatch[1].padStart(5, '0')}`);
    const duration = Math.round((end - start) / (1000 * 60));
    if (duration <= 0) { skippedNegative++; continue; }

    totalMinutes += duration;
    matchedBlocks++;
  }
}

// ---------- 4. 写回 frontmatter（Obsidian 原生 API，无需 metaedit 插件） ----------
await app.fileManager.processFrontMatter(taskPage, (fm) => {
  fm["total_minutes"] = totalMinutes;
});

let msg = `✅ 已写入总耗时 ${totalMinutes} 分钟（${matchedBlocks} 个时间块）→ ${taskPage.basename}`;
if (skippedNegative > 0) msg += `\n⚠️ ${skippedNegative} 个跨午夜时间块被跳过（策略待定）`;
new Notice(msg, 8000);
%>
