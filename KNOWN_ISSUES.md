# Known Issues — Templater 模板问题清单

本文档是 2026-10 对 `VaultPARA` 内 Templater 模板做的一次系统性代码审查的结果，记录所有已确认的问题及其处理状态。

> **文档使用约定**
> 1. 每条问题末尾有「处置」栏，由维护者填写处理决定。
> 2. 已批复并完成的条目移入 **附录 A**；**正文只剩下待裁决的 4 条**，每条带 💬 调查回复。
> 3. 修复工作全部在 repo 侧进行，完成后整体同步回 vault 验证。
>
> 严重度定义：
> - 🔴 **P0 脱敏**：repo 已公开在 GitHub，涉及作者隐私的内容正在暴露，优先级最高。
> - 🟠 **P1 Bug**：会算错数据、卡死或静默失效的缺陷。
> - 🟡 **P2 一致性/性能**：结果不错，但行为不统一或大数据量下变慢。
> - 🔵 **P3 结构决策**：重复代码与维护性问题，只需确定方向，无需逐条细审。

---

## 📌 待裁决（4 条，每条附 💬 回复）

### PRIV-3：AI prompt 含个人处境定制的统计维度 ｜ 状态：⬜
- **位置**：`dv-lib/dv_review_lib.js:30-71`（`AI_REFLECTION_PROMPT`，重构后全库只有这一处）
- **维护者批注**：我都没理解，哪里泄密了。这里都描述得挺安全的，不是吗？哪里提到离职？怎么就是我自己想离职呢？
- 💬 **回复**（逐行指给你看，就在当前英文 prompt 里）：
  - `dv_review_lib.js:51`：`3. **🚀 Container 3: Career Strategy & Entrepreneurship**` —— 第三个容器就叫「职业策略与创业」。
  - `dv_review_lib.js:54`：`- Decisions regarding career path (staying vs. leaving).` —— 「职业去留（留任 vs 离职）的抉择」。
  - `dv_review_lib.js:63`：`- "Times mentioned wanting to leave/resign: [Count]"` —— **leave/resign 直译就是「离职」**：这行的意思是「提到想辞职/离职的次数：X 次」。
  - **为什么这算泄密**：一个通用的日记分析模板，不会把「我提到想辞职的次数」当成标准统计维度。它出现在这里，说明写这段 prompt 的人当时正在数自己提离职的念头——容器③整节（创业点子、市场分析、职业去留）同理。代码里没有写「我想离职」这句话，但这套统计框架本身就是为那个处境定制的，公开后等于作者自述职业状态。这跟 PRIV-1 的真实项目名是同一类问题，只是更隐蔽。
  - **拟替换的中文中性版**（批复"换"后只改这一处，W/M/Y 同时生效）：

```text
# 角色
你是一名客观的档案整理员。你的任务是把非结构化的个人日记整理成结构化的事实分类。
不要提供建议、安慰或心理解读，只提取实际发生的事情或明确记录的想法。

# 规则
1. 保持客观：不总结"情绪"，只记录事实与想法。
2. 尽量量化：统计反复出现的主题次数（如"提到运动：X 次"）。
3. 输出语言：中文。

# 输出结构（分类容器）
1. 📦 生活与家庭：具体事件、财务决定、家庭互动（只记事实）。
2. 🛠️ 工作与技术：完成的具体任务、学到的知识点、用过的工具。
3. 🚀 计划与目标：记录过的计划、目标调整、重要决定。
4. 🧠 方法与心得：学习方法、工作流程方面的反思。
5. 📊 频次统计：反复出现的主题计数列表，例如：
   - "提到运动/锻炼：[次数]"
   - "提到阅读：[次数]"
   - "完成的具体任务数：[次数]"
   - "提到想尝试的新事物：[次数]"

# 行动
请根据以上要求分析下面的日记原文：
```

- **处置**：☐ 换中文中性版　☐ 保持英文只删敏感维度　☐ 其他：

### PRIV-4：git 历史已含上述隐私，是否清理？｜ 状态：⬜
- **位置**：整个 git history
- **维护者批注**：(b) 重写历史。确认执行（只要我随时能回到任意一个已有的 commit，而且都正常，即便 hash 变了也没问题）。
- 💬 **回复**：
  - **你的前提条件可以满足，但有一个重要区别要说清**：重写后，**每一个旧 commit 都有一个内容完全对应的新 commit**（同样的文件状态、同样的顺序、同样的提交信息，只是 hash 变了），所以"回到任意一个历史点"这个能力完全保留——tag（v0.8.0 等）也都还在、指向对应的新 commit。**但旧的 hash 本身会失效**：重写后的仓库里不存在旧 hash，你不能再用旧 hash 直接 checkout。
  - **为了万无一失，执行前先做一次完整镜像备份**（`git clone --mirror` 到本地目录，含全部分支/tag/历史）。这样即使重写出错，或者你以后真想用旧 hash 看某个历史点，备份里都有。
  - **CI 安全性**：release-please 靠三样东西算版本——tag 名、`release-please-manifest.json`、conventional commit 前缀（fix:/feat:）。`git filter-repo` 重写时自动保留全部 tag 名和分支名（只是指向新 commit），manifest 内容不含隐私串所以原样保留，commit message 也会保留（用 `--replace-message` 单独清洗其中的隐私串）。所以 release-please 重写后照常从 v0.8.0 继续算，**不需要重新赋 tag，filter-repo 自动处理**。
  - **执行手册**（依据 GitHub 官方文档 [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)）：
    1. `git clone --mirror` 做本地镜像备份（上一条说的保险）；
    2. 扫全历史生成隐私串清单（git grep 所有历史版本），维护者确认后写入 `replacements.txt`（格式 `旧串==>新串`）；⚠️ `James` 这种常见词不能裸替换，要用完整行 `owner: Your Name==>owner: Your Name`；扫描时会一并确认历史里没有公司名；
    3. 合并或关闭所有打开的 PR（尤其是 release-please 自动开的 release PR）；
    4. 临时关闭 main 分支保护（允许 force push）；
    5. 全新 clone → `git filter-repo --replace-text replacements.txt --replace-message replacements.txt`；
    6. `git push --force --all && git push --force --tags`；
    7. 按官方文档联系 GitHub Support 清除缓存视图和 PR 残留引用（fork/他人 clone 无法清除，官方明示）；
    8. 重新打开分支保护。
  - **下一步**：先做 1、2（只读操作，不改任何东西），把替换清单交给你确认后才动 3-8。
- **处置**：☐ 先出替换清单给我看　☐ 其他：

### BUG-4：跨午夜时间块怎么处理？（含跨多天写法）｜ 状态：⬜
- **维护者批注**：这里其实我是想要 deep diving 的，因为我弄不清楚到底 obsidian 会怎么给我计算，所以我过往都是直接写 23:00~24:00，然后去第二天的日志里写 00:00~06:00，如果理想中，自然是可以 23:00~06:00，但这样其实也挺麻烦的，因为如果我是到第三天的 06:00 要怎么写？当然你提到这个我就想看看你有什么更好的方法可以解决呢？
- 💬 **回复（deep dive）**：
  - **"Obsidian 会怎么给我计算"——Obsidian 什么都不算**。dataview 只负责把 `(start:: 23:00) (end:: 06:00)` 这种字段原样读出来，所有时长计算都是这套模板自己的脚本做的。所以"怎么算"完全由我们定义——这正是各处不一致（BUG-4 本身）的由来。
  - **先直接回答"23:00 → 第三天 06:00 怎么写"**：
    - 你现在的拆分写法永远正确：D1 写 `23:00~24:00`、D2 写 `00:00~24:00`、D3 写 `00:00~06:00`。三段都在自己的日记里，任何统计都不会错。
    - **单行 HH:mm 无法表达跨多天**：`end` 字段没有日期信息，就算做 +24h 折算，`23:00→06:00` 也只能算出 7 小时（它不知道你指的是哪一天、还是第三天的 06:00）。这是字段格式的硬限制。
    - 想一行写完跨多天，唯一办法是让 end 带日期：`(end:: 2026-10-19 06:00)`。
  - **三个候选方案**：
    - **方案 A（保持你的拆分习惯，零改动）**：任何跨度都能写，每天的时间归属天然精确（D2 的 24 小时就记在 D2），周/月/年报永远对。代价：跨一次午夜写两行，一段完整的"通宵会话"变成两条记录。
    - **方案 B（+24h 单行，`23:00→06:00`）**：一行写完，省事。代价：① 全部时长记在**开始那天**——周六 23:00→周日 06:00 的 7 小时全算上一周，跨周/跨月边界时报表归属会偏；② **跨多天直接算错**（你的第三天场景会算成 7 小时而非 31 小时）；③ 第二天的日记「今日时间分析」里看不到这段。
    - **方案 C（end 可选带日期 + 统计时按天切分，推荐）**：平时写法不变；跨午夜想一行写完就写 `start:: 23:00, end:: 2026-10-19 06:00`（日期随便跨几天）。库在统计时自动把跨天块**按天切成段**——D1 计 60min、D2 计 1440min、D3 计 360min，每天归属精确，周/月/年报全对。对没写日期的普通跨午夜（`23:00→06:00`）再叠加 +24h 兜底（这时等价于方案 B 的便利，时长全记开始日）。**你的拆分习惯、+24h 单行、带日期单行，三种写法共存不冲突**。代价：实现复杂度最高（minutesBetween 升级 + 收集时切段）；带日期写法打字多一点（仅跨午夜时才需要）。
  - **推荐**：方案 C + +24h 兜底。它把你的"理想写法"（23:00~06:00 一行）和"第三天场景"（带日期一行）都覆盖了，同时不破坏你现有的拆分习惯。
- **处置**：☐ 方案 A（保持现状不改代码）　☐ 方案 B（只统一 +24h）　☐ 方案 C（带日期 + 按天切分 + +24h 兜底，推荐）　☐ 其他：

### BUG-6：task_uuid 链接格式陷阱（统计静默归零）｜ 状态：⬜
- **维护者批注**：为什么我插入了这么多每天的时间块好像都没遇到什么问题呢？是否你言过其实了呢？你意思是说 [[Task-UUID-Name]] 应该写成 Task-UUID-Name 吗？还是什么？
- 💬 **回复**：
  - **你为什么从没遇到**：因为你一直用 Alt+I（`TimeBlock-Insert-Templater.md`）插入时间块，它生成的格式是对的——`task_uuid` 是裸文本（`TimeBlock-Insert-Templater.md:69`）。你的使用路径完全安全，所以从没爆发。
  - **陷阱到底在哪**：`DailyNote-Template.md:130` 有一行**占位示例**，教人手写时间块时长什么样：

```text
- [ ] Task description (start:: ) (end:: ) (task_uuid:: [[Task-UUID-Name]]) (task_name:: [[Task-Name]])
```

    注意它把 `task_uuid` 也写成了 `[[...]]` 的样子。**谁照着这个示例手写**，dataview 就会把 uuid 解析成链接对象，统计脚本里字符串比较永远 false → 所有报表静默空白、零报错。它伤不到用 Alt+I 的你，但会伤到开源使用者和将来某天手写的你——所以评级 P1 却从未爆发，不是言过其实，是地雷还没人踩。
  - **是的，你的理解完全正确**：`(task_uuid:: Task-UUID-Name)` 应该不带 `[[]]`；`task_name` 保持 `[[链接]]` 不动。要改的就这一个符号对。
  - **已做的兜底**：共享库遇到非字符串 uuid 会在报表里给出可见警告（`dv_review_lib.js:145-148`），即使踩中也不再静默。
  - **待批复的根治**：把 130 行占位示例的 `[[Task-UUID-Name]]` 改成裸文本，加一行注释说明"uuid 必须裸文本，task_name 才用链接"。一行改动，零行为变化。
- **处置**：☐ 修占位符　☐ 不改（反正我用 Alt+I）　☐ 其他：

---

## 📦 附录 A：已修复 / 已决定（归档）

> 以下条目已处理完毕，存档备查。每条注明改动位置；维护者此前的疑问也已在此作答。

### 🔴 P0

- **PRIV-1 ✅** Monthly 内嵌的 6 个真实项目名已移除；独立项目清单集中到 `javascript/lib_config.js:39`（`SEPARATE_PROJECTS`，演示占位名 + 注释），W/M/Y 共用。
- **PRIV-2 ✅** `TechnicalConclusion-Template.md:7` 改为 `owner: Your Name`。
- **PRIV-5 ✅** 采纳"给演示候选"建议并进一步脱敏：`SEPARATE_PROJECTS` 换成纯演示名 `["Project_Demo", "Project_Sample"]`（`lib_config.js:39`），注释写明"替换成自己的项目文件名，部分匹配、不区分大小写"。留空会让「重点项目单独一组」功能静默消失，所以保留候选。

### 🟠 P1

- **BUG-1 ✅** `年度时间统计表-Template.md` Bar 分页循环改用 `pageData.map(...)`，分页恢复生效。
- **BUG-2 ✅** Monthly 月份输入加 null/空串兜底（`Monthly-Review-Template.md:27-28`），Esc 取消回退当前月份，与年份输入对齐，不再死循环。
- **BUG-3 ✅** Monthly 月起止改用 `moment({year, month, day:1})` 对象构造（`Monthly-Review-Template.md:38-39`），31 号生成短月份月报不再溢出。
- **BUG-5 ✅** `update-task-time.md` 重写：改用 `#journal/daily` 标签定位日记（不再靠路径含 "Daily"）、只统计「时间块记录」标题下的任务、负时长计数并提示，与统计报表同一套规则。
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
