# Known Issues — Templater 模板问题清单

本文档是 2026-10 对 `VaultPARA` 内 Templater 模板做的一次系统性代码审查的结果，记录所有已确认的问题及其处理状态。

> **文档使用约定**
> 1. 每条问题末尾有「处置」栏，由维护者填写处理决定。
> 2. 「状态」列含义：⬜ 待处置 → 🔵 已定方案 → ✅ 已修复 → 🧪 已在 vault 中验证。
> 3. 修复工作全部在 repo 侧进行，完成后整体同步回 vault 验证。
>
> 严重度定义：
> - 🔴 **P0 脱敏**：repo 已公开在 GitHub，涉及作者隐私的内容正在暴露，优先级最高。
> - 🟠 **P1 Bug**：会算错数据、卡死或静默失效的缺陷。
> - 🟡 **P2 一致性/性能**：结果不错，但行为不统一或大数据量下变慢。
> - 🔵 **P3 结构决策**：重复代码与维护性问题，只需确定方向，无需逐条细审。

---

## 🔴 P0 脱敏（repo 已公开，正在暴露）

### PRIV-1：Monthly 模板含完整隐私项目清单 ｜ 状态：⬜
- **位置**：`VaultPARA/.../Journal/Monthly-Review-Template.md:222`
- **问题**：`SEPARATE_PROJECT_LIST` 含 6 个真实项目名（`Project_Demo2`、`Project_Demo1`、`Project_Demo4`、`Project_Demo3` 等）。Weekly 的 repo 版已改成 2 个占位名，Monthly 漏改了。
- **建议**：改为 2~3 个演示用占位名，与 Weekly 保持一致；并在注释里说明"应替换为使用者自己的项目名"。
- **处置**：照建议修

### PRIV-2：真名硬编码 ｜ 状态：⬜
- **位置**：`VaultPARA/.../Plugin-Templater/TechnicalConclusion-Template.md:7`
- **问题**：`owner: Your Name`。
- **建议**：改为 `owner: Your Name` 占位符。
- **处置**：照建议修

### PRIV-3：AI prompt 含个人处境定制的统计维度 ｜ 状态：⬜
- **位置**：`Weekly-Review-Template.md:130`、`Monthly-Review-Template.md:107`（及整段 prompt）
- **问题**：示例统计项是 "Times mentioned wanting to leave/resign"、Career Strategy 等，按作者个人处境定制；公开后相当于作者自述职业状态。
- **建议**：统计维度改成中性示例（如 "Times mentioned exercise / reading / side projects"）。
- **处置**：☐ 其他：能不能用中文，这里的prompt是什么意思来着？有什么作用

### PRIV-4：git 历史已含上述隐私，是否清理？｜ 状态：⬜
- **位置**：整个 git history
- **问题**：即使现在修复文件，`Project_Demo1` 等仍存在于已推送的历史提交中。
- **建议**：三选一。(a) 接受现状，只修当前版本（最省事，搜索引擎未必索引历史）；(b) 用 `git filter-repo` 重写历史并强推（彻底，但会改变所有 commit hash）；(c) 删库重建（最彻底，但丢失 star/release 记录）。
- **处置**：(b) 重写历史，但要记得tag也要重新赋予正确的，之前用ci方式，你看现在要怎么处理，别让我的ci把整个历史都毁掉。

### PRIV-5：repo 与 vault 已漂移，且 vault 侧隐私更多 ｜ 状态：⬜
- **位置**：`Weekly-Review-Template.md`（repo 2 个项目名 vs vault 6 个）
- **问题**：说明某次在 vault 侧直接改过模板，未回流 repo。两边谁是"真源"需要明确。
- **建议**：确立 repo 为唯一真源；修复完成后整体拷回 vault；vault 侧的私人项目清单以后通过本地未跟踪的覆盖方式维护（或接受 repo 里就是演示数据）。
- **处置**：你给我建议，如果一个project candidate都不给，会不会user不知道怎么添加。我也知道一些project是我私人的命名。

---

## 🟠 P1 Bug

### BUG-1：年度统计表分页图表渲染了全量数据 ｜ 状态：⬜
- **位置**：`Journal/年度时间统计表-Template.md:215`
- **问题**：循环里切片了 `pageData`，生成 YAML 时却用 `projectData.map(...)`，导致每页柱状图都渲染全部项目，分页完全失效。
- **建议**：改为 `pageData.map(...)`。
- **处置**：修

### BUG-2：Monthly 月份输入按 Esc 会死循环 ｜ 状态：⬜
- **位置**：`Journal/Monthly-Review-Template.md:30-33`
- **问题**：月份 prompt 没处理 `null`（用户取消），正则永远不匹配，无限弹窗。Weekly 的年/周输入都有 null 兜底，唯独这里没有。
- **建议**：与 Weekly 对齐——`null` 或空串时回退默认值（当前月份）。
- **处置**：在哪里，指给我看

### BUG-3：Monthly 在 31 号生成短月份月报会算错统计窗口 ｜ 状态：⬜
- **位置**：`Journal/Monthly-Review-Template.md:37-38`
- **问题**：`moment().year(year).month(monthNum-1)` 在 31 号设置 2 月会溢出到 3 月，`startOf("month")` 得到 3 月 1 号，整个月报统计错月份。
- **建议**：改用 `moment({year: year, month: monthNum-1})` 构造，或先 `.date(1)` 再设月份。
- **处置**：修

### BUG-4：跨午夜时间块在各报表中处理不一致 ｜ 状态：⬜
- **位置**：`DailyNote-Template.md:157`（负时长 +24h）vs Task/Project/Weekly/Monthly/Yearly（`duration <= 0` 直接跳过）
- **问题**：同一条 23:00→01:00 的时间块，日记里算 120 分钟，其他报表里静默丢弃，总数对不上。
- **建议**：统一为"+24h"策略（夜间工作是常态）；或统一丢弃但在文档里写明。推荐前者。
- **处置**：听不懂你在说什么。重新解释

### BUG-5：update-task-time 的日记定位方式与全局不一致 ｜ 状态：⬜
- **位置**：`Plugin-Templater/update-task-time.md:14`
- **问题**：(1) 用 `path.includes("Daily")` 找日记，其他模板全用 `#journal/daily` 标签——路径不含 "Daily" 的日记会漏，碰巧含 "Daily" 的笔记会误算；(2) 不检查 `⏳ 时间块记录` section，正文任何位置写 `task_uuid::` 都计入；(3) 无跨午夜处理。三者叠加 → 和 Task-Template 内嵌 dataviewjs 算出的总耗时对不上。
- **建议**：改用标签过滤 + section 检查，与 dataviewjs 版逻辑对齐；顺手统一跨午夜策略（见 BUG-4）。
- **处置**：修

### BUG-6：task_uuid 链接格式陷阱（统计静默归零）｜ 状态：⬜
- **位置**：`DailyNote-Template.md:126` 占位符 `(task_uuid:: [[Task-UUID-Name]])` vs `TimeBlock-Insert-Templater.md:69` 实际插入裸文本
- **问题**：使用者照抄占位符写成 `[[...]]` 链接格式时，dataview 解析出的是对象，`t.task_uuid === taskId` 永远 false——所有统计表空白且无任何报错。
- **建议**：两选一——(a) 占位符改为裸文本示例（推荐，一行改动）；(b) 所有统计脚本统一做"去链接壳"处理（健壮但改动面大）。
- **处置**：听不懂怎么改，请给我具体的代码位置，我去查看

### BUG-7：update-task-time 隐式依赖 metaedit 插件 ｜ 状态：⬜
- **位置**：`Plugin-Templater/update-task-time.md:2`
- **问题**：插件未安装时直接抛异常，使用者无感知。
- **建议**：改用 Obsidian 原生 `app.fileManager.processFrontMatter()`，去掉 metaedit 依赖（也少一个 README 安装前提）。
- **处置**：用你的方法能够没有插件就报错让user知道吗？

---

## 🟡 P2 一致性 / 性能

### CONS-1：Yearly 反思提取没有批量渲染优化 ｜ 状态：⬜
- **位置**：`Journal/Yearly-Review-Template.md:128-130`
- **问题**：Weekly/Monthly 已改为"内存累加、一次渲染"，Yearly 还在循环里逐条 `dv.paragraph`，日记多时明显卡顿——正是 W/M 里修掉的问题。
- **建议**：把 W/M 的批量渲染模式同步到 Yearly。
- **处置**：修

### CONS-2：Yearly 没有 AI 复制按钮 ｜ 状态：⬜
- **位置**：`Journal/Yearly-Review-Template.md` Part 1
- **问题**：Weekly/Monthly 都有"一键复制 Prompt+日记"按钮，Yearly 没有。是有意省略还是漏了待确认。
- **建议**：如无特殊原因，补齐，保持三报表能力一致。
- **处置**：我原本是想要month->week/ week->daily/ yearly->monthly这样的形式去获取，但是之前的ai认为这做不到，因为统计结果本身就是动态，所以无法做层层的汇总。而且如果每一天的ai复制，那就太可怕，一年会有365天的特殊思考，会非常巨大。所以目前我是每一周尽可能去清理还没有归入合适位置的临时记录，尽可能让daily里没有记录的内容，所有的记录都应该有去处，可以做一个wikilink回来到daily里，表明这是daily做的记录和思考。但你有更好的方案可以给我，我愿意调整。
其次，我要让daily可以自动去抓今日（跟daily同一天的所有日志），我是在obsidian的创始人的博客看见的，他推荐这个技巧，我觉得很好。
你去帮我搜一下全网有好的obsidian使用技巧，拿回来放进这个文档里，我开启重构obsidian-nexus的计划。

### CONS-3：uuid 用户脚本的防御性判空只有一处做了 ｜ 状态：⬜
- **位置**：`年度时间统计表-Template.md:11` 有 `tp.user.uuid ? ... : "no-uuid"`，其他模板（Task/Weekly/Monthly/Yearly）直接调用
- **问题**：uuid.js 未配置时，其他模板直接抛错，只有年度统计表优雅降级。
- **建议**：统一加判空，或在 README 写明 uuid.js 是硬依赖（推荐后者，少一个分支）。
- **处置**：用最强硬的方式，反正报错user也看不到，只能在console里看见，对吗？那就一切都让user知道，能做到吗？

### CONS-4：文件改名行为不统一 ｜ 状态：⬜
- **位置**：`DailyNote-Template.md:54`（自动 rename，重名时抛错中断）vs W/M/Y（只写 `suggested_file_name` frontmatter，不改名）
- **建议**：统一策略；至少给 DailyNote 的 rename 加 try/catch，重名时提示而不是中断。
- **处置**：能够统一改名肯定好，try/catch user能知道吗？如果能做统一自动rename最好。

### PERF-1：任务循环里全库扫描查页面（O(n²)）｜ 状态：⬜
- **位置**：`Weekly:286`、`Monthly:269`、`Yearly:171`、`Project-Template.md:64`
- **问题**：每个时间块都执行 `dv.pages().where(p => p.task_uuid === ...)` 全库扫一遍，日记多时令报/年报明显变慢。
- **建议**：脚本开头建一次 `uuid → page` 的 Map，循环里 O(1) 查。
- **处置**：我没懂是什么意思。

### PERF-2：文件读取全部串行 await ｜ 状态：⬜
- **位置**：Weekly/Monthly/Yearly 的反思提取循环
- **问题**：`await app.vault.read` 一个接一个，可用 `Promise.all` 并发（缓存预检查后并发读，收益明显）。
- **建议**：改为并发读取。
- **处置**：这个也看不懂，告诉我哪一文件哪一行，我去确认

### I18N-1：中英混排不统一 ｜ 状态：⬜
- **位置**：Project-Template（标题英文、末节中文）、W/M/Y（正文混排）
- **建议**：面向开源统一为英文标题 + 中文注释，或维持现状。
- **处置**：按你的建议，做为开源来走

### WEEK-1：周起始为周日起始（locale 'en'），不可配置 ｜ 状态：⬜
- **位置**：Weekly 模板多处 `.locale('en').week(...)`
- **问题**：当前为作者有意选择的周日开始，注释也有说明；但开源使用者对 ISO 周（周一）的需求更普遍。
- **建议**：本次可不动；若做 P3 重构，把它做成 config 开关。
- **处置**：我就要周日为起始。

---

## 🔵 P3 结构决策（只定方向）

### STRUCT-1：W/M/Y 三模板重复代码严重 ｜ 状态：⬜
- **问题**：AI prompt（40+ 行）、"想法与反思"扫描逻辑、`renderDashboard`（100+ 行）、工具函数在 Weekly/Monthly/Yearly 里近乎逐字重复，改一处要同步改三处（本次 CONS-1 就是漏同步的实例）。
- **建议**：抽成 Templater user script（repo 已有 `javascript/` 目录可供挂载）：`config.js`（标签、标题关键词、项目分组、周起始）+ `timeStats.js`（扫描/统计/渲染）。三模板各自瘦身到几十行。
- **处置**：☐ 做重构，而且我希望你考虑一下其他几个代码，能够复用，建立成lib（思想）的都建立，外面就负责调用即可。记得lib做得具有同一个prefix，例如lib_weekly_use_XXXX.js 理解吗？你不一定听我的命名规则，但是我要极度可读

### STRUCT-2：硬编码约定散落各处 ｜ 状态：⬜
- **问题**：`#journal/daily` 标签、`⏳ 时间块记录` / `想法与反思` 标题关键词硬编码在 6+ 个文件里；使用者标题不一样就全部静默失效。
- **建议**：随 STRUCT-1 一起收进 `config.js`，一处可改。
- **处置**：什么叫struct-1？意思是类似占位符#1这样吗？解释清楚再说

### STRUCT-3：技术总结模板有两个副本 ｜ 状态：⬜
- **位置**：`What-is_总结模板.md` 与 `TechnicalConclusion-Template.md` 内容基本重复
- **建议**：保留 TechnicalConclusion 为唯一真源，What-is 改为说明文档并链接过去（或删除）。
- **处置**：☐ 合并，只留下一份，起始我都没使用这两份template,你给我融合它们

---

## 备注

- `Area-Journal`、`Project_Obsidian-Nexus` 为 demo vault 自引用内容，不算泄密，默认保留。
- DailyNote 的「🛐 今日灵修」板块不涉泄密，但属个人定制内容，是否保留或做成可选，随 PRIV 批次一并决定。
- `javascript/uuid.js` 用 `Math.random()` 生成 uuid，对笔记 ID 场景足够，无需处理。
