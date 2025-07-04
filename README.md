<div align="center">
  <h2>Obsidian-Nexus</h2>
  <p><i>An Automated PARA Journal & Task Vault</i></p>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/potterwhite/obsidian-nexus/main/asset/banner.png" alt="Project Banner" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/potterwhite/obsidian-nexus/releases"><img src="https://img.shields.io/badge/version-v0.1.0--alpha-orange"
  alt="version"></a>
  <a href="https://github.com/potterwhite/obsidian-nexus/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license"></a>
</p>

<p align="center">
  <strong>English</strong> | <a href="./README_zh.md">简体中文</a>
</p>

<p align="center">
  <a href="#-the-ultimate-quick-start-guide">🚀 Quick Start</a> •
  <a href="./AAR.md">📄 My Journey (AAR)</a> •
  <a href="#️-hotkeys--quick-reference">⌨️ Hotkey Cheatsheet</a>
</p>

---

> ### Alpha Version Notice
> **This is an early alpha release of Obsidian-Nexus.** It is intended for testing and feedback purposes. You may encounter bugs or incomplete features. Your feedback is invaluable in helping shape the future of this project! Please report any issues you find.

### ✨ Core Features

-   **🚀 Zero-Config Startup**: Ready to use right out of the box. All plugins, templates, and hotkeys are pre-configured for you.
-   **📂 Pure PARA Architecture**: Built-in `Projects`, `Areas`, `Resources`, `Archives` folder structure for intuitive organization.
-   **⏱️ Automated Time-Logging**: Log time blocks in your Daily Notes, and your Project pages will automatically aggregate the total time spent.
-   **⌨️ One-Click Operations**: Use `Alt+I` to insert a time block, `Alt+P` to create a new project... All high-frequency actions are bound to hotkeys.
-   **📚 Full Template Suite**: Includes beautifully crafted templates for projects, tasks, daily notes, and weekly/monthly reviews, all located within the Vault.

### 🚀 The Ultimate Quick Start Guide

> **Warning**: This project provides a **complete Obsidian Vault**, not just a theme or plugin. Please follow these steps for a seamless "out-of-the-box" experience.

#### Step 1: Get The Vault

-   **Download ZIP**: Click `Code` -> `Download ZIP` on this page, then **unzip** the file.
-   **Use Git**: `git clone https://github.com/potterwhite/obsidian-nexus.git`

#### Step 2: Open as Vault in Obsidian
1. Launch Obsidian.
2. Click `Open another vault` -> `Open folder as vault`.
3. **Select the `VaultPARA` folder** inside the project directory. This is the most crucial step!

#### Step 3: Trust Author & Install Plugins (One-Click)
1. On first open, click **`Trust author and enable plugins`**.
2. A notification will pop up to install missing plugins. Click the **`Install`** button.

Congratulations! Everything is now set up.

### workflows: Daily Usage

The core logic of this vault is to first create a file, then insert a template into it.

1.  **Create a Project**:
    -   First, create a new note inside the `1_PROJECT` folder (e.g., right-click -> New note).
    -   With the blank note open, press `Alt+P` to insert the complete project template.

2.  **Create a Task**:
    -   Similarly, create a new note for your task (e.g., in a relevant `2_AREA` subfolder).
    -   With the new note open, press `Alt+T` to insert the task template.

3.  **Log Daily Time**:
    -   Press `Alt+D` to create or open today's Daily Note.
    -   Inside the note, press `Alt+I` to insert a standard time-log block.

4.  **Review Progress**:
    -   Open your project file to see the auto-updating table of all logged time.

### ⌨️ Hotkeys & Quick Reference

| Action | Hotkey | Associated Template |
| :--- | :--- | :--- |
| **Daily Workflow** | | |
| Templater: Insert Today's Daily Note | `Alt` + `D` | `DailyNote-Template.md` |
| Templater: Insert Time Block | `Alt` + `I` | `TimeBlock-Insert-Templater.md` |
| **Content Creation** | | |
| Templater: Insert New Project | `Alt` + `P` | `Project-Template.md` |
| Templater: Insert New Task | `Alt` + `T` | `Task-Template.md` |
| **Reviews** | | |
| Templater: Insert Weekly Review | `Alt` + `W` | `Weekly-Review-Template.md` |
| Templater: Insert Monthly Review | `Alt` + `M` | `Monthly-Review-Template.md` |

### 🐞 Known Issues & Roadmap

-   **`Update Task Time` Script (`Alt+U`) is disabled**: This script depends on the `MetaEdit` community plugin, which is currently unmaintained and fails to install. The hotkey and script file remain for future-proofing, but are not functional in this version.
-   **Roadmap**: Future versions aim to implement a reliable method for caching time-spent data back to task files.

### Further Reading & Customization

-   **My Journey**: To understand the full thought process and challenges behind this system, read **[My After Action Review (AAR.md)](./AAR.md)**.
-   **Templates & Scripts**: Located in `VaultPARA/3_RESOURCE/PKB/Templates/`.
-   **Hotkeys**: Defined in `VaultPARA/.obsidian/hotkeys.json`.