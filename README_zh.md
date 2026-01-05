<div align="center">
  <h2>Obsidian-Nexus</h2>
  <p><i>一个自动化的 PARA 日志与任务管理库</i></p>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/potterwhite/obsidian-nexus/main/asset/banner.png" alt="项目横幅" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/potterwhite/obsidian-nexus/releases"><img src="https://img.shields.io/github/v/release/potterwhite/obsidian-nexus?color=orange&label=%E7%89%88%E6%9C%AC" alt="版本"></a>
  <a href="https://github.com/potterwhite/obsidian-nexus/blob/main/LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-blue" alt="许可证"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  <a href="#-终极上手指南">🚀 快速上手</a> •
  <a href="./AAR.md">📄 我的构建之旅 (AAR)</a> •
  <a href="#️-快捷键备忘单">⌨️ 快捷键备忘单</a>
</p>

---

> ### 内测版 (Alpha) 说明
> **这是 Obsidian-Nexus 的一个早期内测版本**，主要用于测试和收集反馈。您可能会遇到 Bug 或不完整的功能。您的反馈对于本项目的未来发展至关重要！欢迎通过 [Issues](https://github.com/potterwhite/obsidian-nexus/issues) 报告您发现的任何问题。

### ✨ 核心亮点

-   **🚀 零配置启动**：开箱即用，所有插件、模板、快捷键已为你预设完毕。
-   **📂 纯粹的 PARA 架构**：内置 `Projects`, `Areas`, `Resources`, `Archives` 文件夹结构，符合直觉。
-   **⏱️ 自动化耗时统计**：在“每日笔记”中记录时间块，“项目”页面将自动聚合总耗时。
-   **⌨️ 一键式操作**：使用 `Alt+I` 插入时间块，`Alt+P` 新建项目... 所有高频操作均已绑定快捷键。
-   **📚 全套模板**：包含精美的项目、任务、日记、周报/月报模板，全部位于库中。

### 🚀 终极上手指南

> **警告**: 本项目提供的是一个 **完整的 Obsidian 库 (Vault)**，而非单个主题或插件。为获得无缝的“开箱即用”体验，请严格遵循以下步骤。

#### 步骤 1: 获取项目库
-   **下载 ZIP**: 点击本页面右上角的 `Code` -> `Download ZIP` 下载本项目，然后**解压**。
-   **使用 Git**: `git clone https://github.com/potterwhite/obsidian-nexus.git`

#### 步骤 2: 在 Obsidian 中打开为库
1.  启动 Obsidian。
2.  点击 `打开另一个库` -> `打开文件夹作为库`。
3.  **选择项目中的 `VaultPARA` 文件夹**。这是最关键的一步！

#### 步骤 3: 信任作者并安装插件 (一键完成)
1.  首次打开时，请点击 **`信任作者并开启插件`**。
2.  在右下角弹出的提示框中，点击 **`安装`** 按钮以安装缺失的社区插件。

恭喜！一切准备就绪。

### workflows：日常工作流

本库的核心逻辑是“先创建文件，再插入模板”。

1.  **创建项目**:
    -   首先，在 `1_PROJECT` 文件夹中创建一个新笔记（例如：右键 -> 新建笔记）。
    -   在新笔记的空白页面中，按下 `Alt+P` 来插入完整的项目模板。

2.  **创建任务**:
    -   同理，为一个新任务创建一个笔记文件（例如，在相关的 `2_AREA` 子文件夹中）。
    -   在新任务的空白页面中，按下 `Alt+T` 来插入任务模板。

3.  **记录每日耗时**:
    -   按下 `Alt+D` 来创建或打开今天的“每日笔记”。
    -   在笔记中，按下 `Alt+I` 来插入一个标准的时间记录块。

4.  **查看进度**:
    -   打开你的项目文件，即可看到自动更新的总耗时统计表。

### ⌨️ 快捷键备忘单

本库预设了一系列快捷键以加速您的工作流。以下是最重要的一些快捷键列表。

| 功能 (Action) | 快捷键 (Hotkey) | 关联模板 (Associated Template) |
| :--- | :--- | :--- |
| **日常工作流** | | |
| Templater: 插入今日笔记 | `Alt` + `D` | `DailyNote-Template.md` |
| Templater: 插入时间块 | `Alt` + `I` | `TimeBlock-Insert-Templater.md` |
| **内容创作** | | |
| Templater: 插入新项目 | `Alt` + `P` | `Project-Template.md` |
| Templater: 插入新任务 | `Alt` + `T` | `Task-Template.md` |
| **周期复盘** | | |
| Templater: 插入周报 | `Alt` + `W` | `Weekly-Review-Template.md` |
| Templater: 插入月报 | `Alt` + `M` | `Monthly-Review-Template.md` |

### 🐞 已知问题与路线图

-   **“更新任务时间”脚本 (`Alt+U`) 已禁用**: 该脚本依赖于社区插件 `MetaEdit`，但此插件目前已停止维护且无法成功安装。为了未来兼容，相关快捷键和脚本文件仍然保留，但在此版本中无法使用。
-   **路线图**: 未来版本计划实现一种可靠的方法，将计算出的耗时数据缓存回任务文件中，以提升性能。

### 深入了解与自定义

-   **构建心路历程**: 想了解我构建此系统的完整思考和踩过的坑吗？请阅读 **[我的构建复盘 (AAR.md)](./AAR.md)**。
-   **模板与脚本**: 位于 `VaultPARA/3_RESOURCE/PKB/Templates/`。
-   **快捷键**: 定义于 `VaultPARA/.obsidian/hotkeys.json`。