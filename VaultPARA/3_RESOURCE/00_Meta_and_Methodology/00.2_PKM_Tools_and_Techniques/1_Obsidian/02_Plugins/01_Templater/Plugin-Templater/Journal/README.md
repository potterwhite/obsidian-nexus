# Journal 模板说明

本目录的回顾类模板（Daily/Weekly/Monthly/Yearly/Period）都建立在两个共享库之上，
逻辑集中在库里，模板本身只负责传参和调用（KNOWN_ISSUES STRUCT-1）。

## 共享库（改逻辑改这里，不要改模板）

| 文件 | 角色 | 加载方式 |
|---|---|---|
| `../javascript/lib_config.js` | 全部约定：日记标签、章节标题关键词（中英双语）、独立统计的项目列表、dataview 库路径、周起始 locale、`safeUuid()` | Templater 用户脚本：`tp.user.lib_config()` |
| `../dv-lib/dv_review_lib.js` | 全部 dataviewjs 逻辑：时间块收集、反思提取、图表/表格渲染、警告提示 | dataviewjs 里 `eval(await dv.io.load(cfg.DV_LIB_PATH))` |

⚠️ 新增或重命名 `javascript/` 下的用户脚本后，**必须重启 Obsidian**
（或在 Templater 设置里重开）才会被加载；模板运行时报
「lib_config.js 未加载」就是这个原因。

约定修改示例：日记标签换名字 → 只改 `lib_config.js` 的 `DAILY_TAG`；
章节标题改名 → 只改 `SECTION_KEYS`（数组里可放多个别名，旧笔记仍能被识别）。

## 各模板

###### DailyNote-Template
日记骨架：灵修 / 今日目标 / 时间块记录 / 时间分析 / 想法与反思 / 明日计划。
标题为英文在前、中文括号在后（KNOWN_ISSUES I18N-1），但中文旧标题仍能被统计逻辑识别。

###### Weekly-Review-Template / Monthly-Review-Template
回顾 + 时间统计（表格 + Pie/Column/Bar 图），数据来自带 `journal/daily` 标签的日记。
反思区可选「复制 AI 提示词」按钮，把本周/月反思拼成提示词供外部 AI 总结。

###### Yearly-Review-Template
年度回顾：自动汇总本年 12 篇月报正文（type: month-summary）+ 年度时间统计
（月度趋势/项目排行/分页图表）+ 年度 40 问（Steph Ango）。

###### Period-Review-Template（通用区间报告，v1）
一个模板覆盖任意区间：月份 / 季度 / 半年度 / 公历年度 / 自定义起止。
两层交互：先选模式，再问参数（都有默认值，回车即可）。
- 时间统计按**精确日期**计算；
- 汇总区窗口 ≥2 个月聚合月报、<2 个月自动降级聚合周报；
- 自定义区间的起止不在自然月/周边界时，边界月/周报**整篇纳入**，
  生成的报告里会有固定的 [!warning] 提醒；
- 农历年模式尚未实现（留待后续迭代）。
- ⚠️ 热键需手动绑定：Templater 设置 → Template Hotkeys →
  添加本模板，建议绑 `Alt+G`。

###### 年度时间统计表-Template
手动录入数据，按脚本内固定变量格式输出三种图形的模板（面向 A4 横向打印）。

## 快捷键（见 `.obsidian/hotkeys.json`）

Alt+D 日记 · Alt+W 周回顾 · Alt+M 月回顾 · Alt+Y 年回顾 ·
Alt+P 项目 · Alt+T 任务 · Alt+C 技术总结 · Alt+I 插入时间块 · Alt+U 回写任务耗时 ·
Alt+G 通用区间报告（新增，需在 Templater 设置里手动绑定）
