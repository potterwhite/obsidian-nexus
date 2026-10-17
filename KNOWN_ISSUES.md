# Known Issues — Templater 模板问题清单

本文档是 2026-10 对 `VaultPARA` 内 Templater 模板做的一次系统性代码审查的结果，记录所有已确认的问题及其处理状态。

> **文档使用约定**
> 1. 每条问题末尾有「处置」栏，由维护者填写处理决定。
> 2. 已批复并完成的条目移入 **附录 A**；**目前无待裁决条目**（2026-10-17 全部裁决并执行完毕）。
> 3. 修复工作全部在 repo 侧进行，完成后整体同步回 vault 验证。
>
> 严重度定义：
> - 🔴 **P0 脱敏**：repo 已公开在 GitHub，涉及作者隐私的内容正在暴露，优先级最高。
> - 🟠 **P1 Bug**：会算错数据、卡死或静默失效的缺陷。
> - 🟡 **P2 一致性/性能**：结果不错，但行为不统一或大数据量下变慢。
> - 🔵 **P3 结构决策**：重复代码与维护性问题，只需确定方向，无需逐条细审。

---

## 📌 待裁决

> ✅ 2026-10-17：全部条目已裁决并执行完毕，处理记录见附录 A。
> 本批次归档：PRIV-3（AI prompt 中性化）、PRIV-4（git 历史重写）、BUG-4（跨午夜强制方案 A）、BUG-6（占位符修正）。

---

## 📦 附录 A：已修复 / 已决定（归档）

> 以下条目已处理完毕，存档备查。每条注明改动位置；维护者此前的疑问也已在此作答。

### 🔴 P0

- **PRIV-1 ✅** Monthly 内嵌的 6 个真实项目名已移除；独立项目清单集中到 `javascript/lib_config.js:39`（`SEPARATE_PROJECTS`，演示占位名 + 注释），W/M/Y 共用。
- **PRIV-2 ✅** `TechnicalConclusion-Template.md:7` 改为 `owner: Your Name`。
- **PRIV-3 ✅** 维护者批复：「对 AI 来说哪种语言更精准就用哪种，不是中文就附一份中文版」。已执行：`AI_REFLECTION_PROMPT` 换为**英文为主 + 完整中文版**的双语中性版（`dv_review_lib.js:31-89`），三处个人处境定制全部移除——容器③「Career Strategy & Entrepreneurship」改为「Plans & Goals」、删掉「staying vs. leaving」、「leave/resign 计数」改为运动/阅读等中性维度。W/M/Y 复制按钮共用此常量，一处生效。
- **PRIV-4 ✅（已执行 git 历史重写）** 按维护者批复的 tarball 方案执行，全过程：
  1. **备份**：`obsidian-nexus-backup-2026-10-17.tar.gz`（工作树，7.7MB）+ `obsidian-nexus-backup-2026-10-17.git`（`git clone --mirror` 全历史镜像），均在 `~/Development/documents/` 下；
  2. **替换清单**：7 条——6 个真实项目名 → `Project_Demo1..6`，`owner: <真实名字>` → `owner: Your Name`（含全角/半角空格变体；真实串不写入本文档，避免重新进入历史）；
  3. **执行**：`git filter-repo --replace-text + --replace-message`，33 个 commit 全部重写；tag 名（v0.1.0–v0.8.0）、分支名、commit 顺序与内容全部保留，仅 hash 变更；
  4. **验证**：全历史二次扫描（含中文区间扫描）零残留；
  5. **推送**：临时开启 main 的 force push → 强推全部分支与 tag → 已恢复分支保护（`allow_force_pushes: false`）；release-please 不受影响（tag 名 + manifest 0.8.0 + conventional 前缀均在）。
  - ⚠️ **剩余手工事项（只能维护者本人做）**：① 按 [GitHub 官方文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) 联系 GitHub Support 清除缓存视图与 PR 残留引用；② 其他机器上的旧 clone 删除后重新克隆；③ 验证一切正常后删除 tarball 与镜像备份。
- **PRIV-5 ✅** 采纳"给演示候选"建议并进一步脱敏：`SEPARATE_PROJECTS` 换成纯演示名 `["Project_Demo", "Project_Sample"]`（`lib_config.js:39`），注释写明"替换成自己的项目文件名，部分匹配、不区分大小写"。留空会让「重点项目单独一组」功能静默消失，所以保留候选。

### 🟠 P1

- **BUG-1 ✅** `年度时间统计表-Template.md` Bar 分页循环改用 `pageData.map(...)`，分页恢复生效。
- **BUG-2 ✅** Monthly 月份输入加 null/空串兜底（`Monthly-Review-Template.md:27-28`），Esc 取消回退当前月份，与年份输入对齐，不再死循环。
- **BUG-3 ✅** Monthly 月起止改用 `moment({year, month, day:1})` 对象构造（`Monthly-Review-Template.md:38-39`），31 号生成短月份月报不再溢出。
- **BUG-4 ✅（批复方案 A，强制执行）** 维护者批复：「必须跨越多天的时候就每一天都去写……走 A，但尽可能有强制性的报错和警告」。已执行：
  - 策略保持 `CROSS_MIDNIGHT_POLICY = "skip"`（`dv_review_lib.js:24`），注释写明批复理由（一次跨多天会少一天日记，分不清漏写还是写对）；
  - 周/月/年报：跳过警告改为**带修复指引**（`dv_review_lib.js:170`：「请拆成两条：当天 23:00-24:00 和次日 00:00-06:00」），且跨午夜跳过会**单独弹一条 12 秒 🌙 Notice**（`renderWarnings`），与普通跳过区分；
  - DailyNote「今日时间分析」原来静默 `+24h` 折算（与方案 A 矛盾），已改为**跳过 + Notice + 报表内 [!warning] 折叠块**（`DailyNote-Template.md` 时间分析块），三处口径统一。
- **BUG-5 ✅** `update-task-time.md` 重写：改用 `#journal/daily` 标签定位日记（不再靠路径含 "Daily"）、只统计「时间块记录」标题下的任务、负时长计数并提示，与统计报表同一套规则。
- **BUG-6 ✅** 维护者批复「修占位符」。已执行：`DailyNote-Template.md:130` 占位示例的 `task_uuid` 改为裸文本（去掉 `[[]]`），并加 HTML 注释「uuid 必须裸文本，task_name 才用链接」。此前疑问已答：维护者从没踩中是因为一直用 Alt+I 插入器（生成格式正确）；陷阱只在手写照抄示例时。兜底警告（链接格式 uuid 弹警告）此前已在共享库就位。
- **BUG-7 ✅（并入 BUG-5 一并修复）** 维护者问：用你的方法能不能没有插件就报错让 user 知道？——**能**。已改用 Obsidian 原生 `app.fileManager.processFrontMatter()` 写回 frontmatter，metaedit 依赖彻底移除；所有失败路径（没打开文件、没有 task_uuid 等）都弹 `Notice` 提示，不再只写 console。
- **BUG-8 ✅（本次新发现）** 旧反思提取只在遇到 `"## "` 时停止，遇到 `"# "` 一级标题不停——会把后面的「明日计划」「临时记录」全吞进反思。共享库里已改为**遇到任意级别标题即停止**（`dv_review_lib.js:226`）。

### 🟡 P2

- **CONS-1 ✅** 批量渲染（内存拼接、一次渲染）在共享库 `renderReflectionSection` 统一实现，W/M/Y 共用，不再有漏同步问题。
- **CONS-2 ✅** 层级汇总 + 今日碎片已实现，最终设计如下（含维护者三个追问的答复）：
  - **a. Yearly 补 AI 复制按钮**：已补。年报新增「📦 Monthly Rollup (月报汇总)」区，自动收集本年 12 篇月报正文（剥掉 dataview 代码块），一键复制 = prompt + 全部月报正文 + 本年压缩时间汇总。**年报不再直接扫 365 天日记原文**——那个量太大（正是维护者担心的爆炸），且周报/月报已逐级提炼。
  - **b. 周报复制含每日明细**：周报「一键复制」内容 = prompt + 本周每天反思原文 + **逐条时间明细**（每天几点到几点、哪个项目哪个任务、多久）。月报复制 = prompt + 本月全部周报正文（含各周报落盘的 AI Summary 和手写总结）+ **压缩时间汇总**（按日/按项目总计）。维护者问"月报复制 30 天每一条会不会太多"——**会，所以月报只给聚合数字，逐条明细留在周报层**。季报/半年报/年报直接聚合月报即可，链路已通。
  - **落盘约定**：周/月/年报都新增「🤖 AI Summary (AI 总结落盘区)」小节——拿到外部 AI 的总结后粘贴回去，上一级报告自动收集。dataview 自动统计块一个没删。
  - **② Daily 今日碎片**：DailyNote 新增「📎 Today's Fragments (今日碎片)」区，自动列出"链接到今天的笔记"+"今天创建的笔记"（`renderTodayFragments`，Steph Ango 式日记=链接枢纽）。
  - **维护者问：那个 CEO 不做时间块统计吗？**——对，Steph Ango 的 vault 完全不做时间统计：他的体系是日记/知识管理，复盘是主题式的（年度 40 问），没有任何时间块概念。时间块统计是本库自加的体系，两者不冲突：用他的碎片捕捉 + 链接枢纽，用你的时间块 + 层级汇总。
- **CONS-3 ✅** 维护者问：报错只在 console，能不能一切都让 user 知道？——**能，已做到三层可见**：① `safeUuid()` 在 uuid.js 未加载时弹 10 秒 `Notice`（`lib_config.js:52-60`）；② 所有模板在 `lib_config` 未加载时弹 Notice 并中止；③ 任何被跳过的数据（跨午夜、链接格式 uuid、解析失败）都弹 Notice + 报表内出现 `[!warning]` 折叠块逐条列明（`dv_review_lib.js:242-249`）。
- **CONS-4 ✅** 已统一为「全部自动 rename + try/catch」：Daily/Weekly/Monthly/Yearly 都自动改名，重名失败时弹 Notice 提示而不是中断模板。
- **I18N-1 ✅** 面向开源统一为英文标题在前、中文括号在后（如 `# ⏳ Time Blocks (时间块记录)`）；旧中文标题仍能被统计识别（`SECTION_KEYS` 中英双关键词，`lib_config.js:29-33`）。
- **WEEK-1 ✅ 决定不改**：保持周日起始。`WEEK_LOCALE: "en"` 集中在 `lib_config.js:47`，想改成周一起始的使用者改这一处即可。
- **PERF-1 ✅** 维护者说没懂——大白话：旧代码处理**每一条**时间块时，都把**全库所有笔记**翻一遍找它对应的任务页；100 条时间块就翻 100 遍全库，日记越多越慢（这叫 O(n²)）。现在共享库在报表开始时只翻**一遍**全库，建一本"uuid → 任务页"的字典（`buildUuidPageMap`，`dv_review_lib.js:116-122`），之后每条时间块直接查字典，瞬间命中。
- **PERF-2 ✅** 维护者要文件行号——旧代码在 Weekly/Monthly/Yearly 各自的反思提取循环里，`await app.vault.read(file)` 一个接一个串行读文件（读第 2 篇要等第 1 篇读完）。现在：先用 Obsidian 的标题缓存**不读文件**筛出真正含「想法与反思」的日记，再 `Promise.all` 并发读取（`dv_review_lib.js:192-235`，并发点在 210 行）。
- **CONFIG-1 ✅（本次新发现）** `.obsidian` 四个配置文件指向两轮旧目录结构，开源用户开箱即坏。已修正并与实际 vault 对齐：`templater-obsidian/data.json`（templates_folder / user_scripts_folder / 快捷键清单）、`hotkeys.json`（Alt+D/W/M/Y/P/T/C/I/U + 侧边栏 Mod+Q/E）、`daily-notes.json`（`2_AREA/01-Area-Journal/2026/Daily`）、`templates.json`。vault 侧含公司相关模板的快捷键条目**未写入 repo**（属脱敏）。⚠️ 提醒：新增的用户脚本 `lib_config.js` 首次部署到 vault 后需**重启 Obsidian** 才会被 Templater 加载。

### 🔵 P3

- **STRUCT-1 ✅** 已建共享库：`javascript/lib_config.js`（全部约定：标签、标题关键词、项目清单、库路径、周起始、safeUuid）+ `dv-lib/dv_review_lib.js`（全部 dataviewjs 逻辑：收集/提取/渲染）。Weekly/Monthly/Yearly 各自瘦身到"加载库 + 传日期区间"几行。
- **STRUCT-2 ✅** 维护者问：什么叫 STRUCT-1，是占位符#1 吗？——不是占位符。**STRUCT 是 Structure（结构）的缩写，是这份清单的编号前缀**：PRIV=隐私、BUG=缺陷、CONS=一致性、PERF=性能、I18N=中英文、WEEK=周约定、STRUCT=代码结构，后面的数字只是流水号。本条内容（硬编码约定散落各处）已随 STRUCT-1 收进 `lib_config.js`，一处可改。
- **STRUCT-3 ✅** `What-is_总结模板.md` 已删除，其"说明文档"内容以 HTML 注释形式并入 `TechnicalConclusion-Template.md` 文件头，全库仅此一份。

---

## 📚 附录 B：Obsidian 使用技巧调研（CONS-2 委托）

> 来源标注：✅ = 已抓取原文核实；🔗 = 推荐延伸阅读（本轮未抓取，链接已确认存在）。

### 来自 Steph Ango（Obsidian CEO，[stephango.com](https://stephango.com)）

主来源：✅ [How I use Obsidian](https://stephango.com/vault)、✅ [File over app](https://stephango.com/file-over-app)；🔗 [Evergreen notes](https://stephango.com/evergreen-notes)、🔗 [40 questions to ask yourself every year](https://stephango.com/40-questions)、🔗 [How I do my to-dos](https://stephango.com/todos)。

1. **日记只当链接目标，不当写作面**。全天用 unique note 快捷键建 `YYYY-MM-DD HHmm` 前缀的碎片笔记，碎片链接回日记；日记自动汇集（已落到本库 DailyNote 的「今日碎片」区）。
2. **分形复盘（fractal review）**：碎片 → 每几天汇编一次 → 月度回顾 → 年度回顾，"a fractal web of my life that I can zoom in and out of"。已落到本库的「总结落盘 + 层级汇总」设计。
3. **链接优先于文件夹**。"Avoid folders for organization"、"I do not use nested sub-folders"；导航靠 quick switcher、反链、局部图谱，不靠文件树。
4. **未解析链接是资产**。"Breadcrumbs for future connections between things"——链接到还不存在的笔记是有意的，提醒未来去建。
5. **模板 + 属性驱动**："Almost every note I create starts from a template"；属性名短、跨类别可复用（如通用 `genre`）、默认用 list 类型、模板可组合（Person + Author 可叠加）。
6. **命名约定**：日期永远 `YYYY-MM-DD`；categories 和 tags 永远复数；同一风格贯穿到底——"Having a consistent style collapses hundreds of future decisions into one"。
7. **维护靠随机漫步**：随机笔记快捷键 + 浅层局部图谱，定期补链、修格式；他明确拒绝用 LLM 自动化这一步——"Don't delegate understanding"。
8. **每周一张 todo 清单**（"Keep a single to-do list per week"），🔗 细节在 /todos。
9. **7 分制评分**（4 分以下嫌粗、10 分嫌细）。
10. **年度 40 问**：年度复盘用固定的 40 个问题模板，🔗 [/40-questions](https://stephango.com/40-questions)——可直接作为本库 Yearly 模板「年度自问」小节的素材。
11. **File over app**：持久资料应是"你能控制的文件、容易读取的格式"——这也是本 repo 用纯 Markdown + 纯文本约定（标签、裸文本 uuid）的底层理由。

### 对本 repo（obsidian-nexus 重构计划）的映射建议

| 技巧 | 落到本 repo 的动作 | 状态 |
|---|---|---|
| 日记=链接枢纽 + 今日碎片自动列表 | DailyNote「今日碎片」dataviewjs 块 | ✅ 已做 |
| 分形复盘 | 总结落盘小节 + 周→月→年逐级聚合复制 | ✅ 已做 |
| 年度 40 问 | Yearly 模板加自问小节（中英对照） | 待批复 |
| 约定集中、风格统一 | 全部魔法字符串收进 `lib_config.js` | ✅ 已做 |
| 未解析链接当面包屑 | 无需改代码，写入使用文档即可 | 待文档化 |
| 属性名短、默认 list | Task/Project 模板 frontmatter 已符合（`project` 即 list） | ✅ 已符合 |

---

## 备注

- `Area-Journal`、`Project_Obsidian-Nexus` 为 demo vault 自引用内容，不算泄密，默认保留。
- DailyNote 的「🛐 Daily Devotion」板块不涉泄密，但属个人定制内容，如需做成可选可另行提出。
- `javascript/uuid.js` 用 `Math.random()` 生成 uuid，对笔记 ID 场景足够，无需处理。
- 部署提醒：`lib_config.js` 是 Templater 用户脚本，同步到 vault 后必须重启 Obsidian 才生效。
