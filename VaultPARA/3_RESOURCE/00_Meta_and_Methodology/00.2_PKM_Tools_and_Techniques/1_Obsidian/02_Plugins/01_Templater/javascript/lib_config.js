// ==========================================================================
// lib_config.js — 全库所有"魔法字符串"与可调约定的唯一存放处
// Single source of truth for every magic string / convention used by the
// Templater templates and Dataview reports of this vault.
//
// 用法 (Usage)：
//   Templater 模板内:  const cfg = tp.user.lib_config();
//   dataviewjs 块内:   const cfg = eval(await dv.io.load("<本文件的 vault 路径>"));
//
// ⚠️ 想修改任何约定（日记标签、区块标题关键词、演示项目名、库文件路径……），
//    只需要改这一个文件。Edit this file ONLY to change a convention.
//
// ⚠️ 本文件同时被 Templater 和 dataviewjs 加载：
//    - Templater 走 module.exports（文件必须在 Templater 的 Script files folder 里）
//    - dataviewjs 走 eval()，取最后一个表达式的值
//    因此请勿在顶层使用 return 语句。
// ==========================================================================

const __nexusConfig = {

  // ---- 日记定位 (how daily notes are found) ----
  DAILY_TAG: "journal/daily",

  // ---- 区块标题关键词 (section heading keywords) ----
  // 数组内任意一个命中即算匹配（子串匹配；中英双语是为了兼容历史笔记，
  // 旧笔记标题是中文，新模板标题是英文，两种都能被统计到）。
  // Any entry matches (substring match). Bilingual on purpose: legacy notes
  // use Chinese headings while new templates use English ones.
  SECTION_KEYS: {
    timeBlocks:   ["时间块记录", "Time Blocks"],
    reflections:  ["想法与反思", "Ideas & Reflections"],
    tomorrowPlan: ["明日计划", "Tomorrow's Plan"],
  },

  // ---- 重点项目清单 (projects that get their own group in W/M reports) ----
  // ⚠️ 演示用占位名，请替换成你自己的项目文件名（部分匹配、不区分大小写）。
  // Demo placeholders — replace with your own project file names
  // (case-insensitive substring match against the task's `project` field).
  SEPARATE_PROJECTS: ["Project_Demo", "Project_Sample"],

  // ---- dataview 共享库的 vault 路径 (path of the dataview shared library) ----
  DV_LIB_PATH: "3_RESOURCE/00_Meta_and_Methodology/00.2_PKM_Tools_and_Techniques/1_Obsidian/02_Plugins/01_Templater/dv-lib/dv_review_lib.js",

  // ---- 周起始 (week convention) ----
  // "en" = 周日起始 (Sunday start)。本项目作者明确选择保持周日起始。
  // "en" = Sunday start (deliberate choice by the author, see KNOWN_ISSUES WEEK-1).
  WEEK_LOCALE: "en",

  // ---- uuid 生成（带用户可见报错，见 KNOWN_ISSUES CONS-3）----
  // Generates a uuid via the uuid.js user script. If the script folder is
  // misconfigured the user gets a visible Notice instead of a silent failure.
  safeUuid(tp) {
    if (tp.user && tp.user.uuid) return tp.user.uuid();
    new Notice(
      "❌ uuid.js 未加载：请检查 Templater 设置中的「Script files folder」是否指向 javascript/ 目录，然后重启 Obsidian\n" +
      "(uuid.js user script not loaded — check Templater's script folder setting and restart)",
      10000
    );
    return "MISSING-UUID-CHECK-TEMPLATER-SETTINGS";
  },
};

// Templater user script 出口（tp.user.lib_config() 调用的就是它）
// Export for Templater; ignored when the file is eval()'d by dataviewjs.
if (typeof module !== "undefined" && module.exports) {
  module.exports = () => __nexusConfig;
}

// dataviewjs 出口：eval() 取最后一个表达式的值
// Export for dataviewjs: eval() returns the value of the last expression.
__nexusConfig;
