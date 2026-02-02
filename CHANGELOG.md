# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


---

## [0.7.0](https://github.com/potterwhite/obsidian-nexus/compare/v0.6.0...v0.7.0) (2026-02-02)

* **review:** improve weekly and monthly reflection and task review templates ([#19](https://github.com/potterwhite/obsidian-nexus/issues/19)) ([f40a6ae](https://github.com/potterwhite/obsidian-nexus/commit/f40a6ae90c2794c15316f6e18cd3ca320ed286fc))

### ✨ Added

* Added reflection look-back sections to weekly and monthly review templates.
* Enabled extraction of the **“想法与反思”** section from daily journals within the corresponding time window.
* Added a one-click button to copy aggregated reflections together with a predefined analysis prompt.

### Changed

* Refactored weekly and monthly review templates to share a unified structure.
* Reworked task time analytics to support grouped project dashboards.

### Performance

* Batched Dataview rendering to reduce repeated DOM reflow during review generation.

---

## [0.6.0](https://github.com/potterwhite/obsidian-nexus/compare/v0.5.2...v0.6.0) (2026-01-13)

feat(templates): overhaul review system with visualization, interactivity, and performance fixes

Major upgrades to Daily, Weekly, and Yearly templates, introducing data visualization and significantly improving rendering performance.

Details:
1. Daily Note (Interactive):
   - Feat: Replaced static frontmatter with JS execution block.
   - Feat: Added `tp.system.prompt` to allow custom date input (defaults to today) with auto-validation and dynamic frontmatter generation.

2. Yearly & Weekly Reviews (Visualization):
   - Feat: Integrated `ChartsView` plugin to generate Pie (weight), Column (time comparison), and Bar (ranking) charts.
   - Perf: Optimized Column charts by limiting data to top 40 projects and using vertical text for X-axis to prevent rendering lag.
   - Feat: Added pagination logic for Bar charts to handle long project lists across multiple pages.
   - Perf: Rewrote "Ideas & Reflections" extraction in Yearly Review to use `app.metadataCache`. Skips file reading if headers are missing, reducing generation time from ~10s to <1s.

3. Monthly Review:
   - Style: Improved time formatting to show "X min (Y hour Z min)" instead of just minutes.

4. New Template:
   - Feat: Created `年度时间统计表-Template.md` for manual annual reporting with interactive prompts and built-in ChartsView support.

* **templates:** overhaul review system with visualization, interactivity, and performance fixes ([6938d03](https://github.com/potterwhite/obsidian-nexus/commit/6938d03560bbb0efa2ec4d4e75d2c06f0c434858))


---


## [0.5.2](https://github.com/potterwhite/obsidian-nexus/compare/v0.5.1...v0.5.2) (2026-01-07)


### 🐛 Fixed

* **templates:** correct DailyNote rendering logic and relocate technical template ([21945fa](https://github.com/potterwhite/obsidian-nexus/commit/21945fa858d883a34dd96848c3ea6482b36ab360))

## [0.5.1](https://github.com/potterwhite/obsidian-nexus/compare/v0.5.0...v0.5.1) (2026-01-05)


### 🐛 Fixed

* **docs:** replace hardcoded version badge with dynamic GitHub Releases shield ([b96b851](https://github.com/potterwhite/obsidian-nexus/commit/b96b851ce764ca8234f5941dd98282ed0d327ec0))

## [0.5.0](https://github.com/potterwhite/obsidian-nexus/compare/v0.4.0...v0.5.0) (2026-01-05)


### ✨ Added

* **templates:** add Technical Conclusion template and normalize YAML lists ([3162688](https://github.com/potterwhite/obsidian-nexus/commit/3162688f865711ad68b9881e26b88a562abe6798))

## [0.4.0](https://github.com/potterwhite/obsidian-nexus/compare/v0.3.0...v0.4.0) (2026-01-03)


### Features

* **templates:** add dynamic yearly company review template ([#7](https://github.com/potterwhite/obsidian-nexus/issues/7)) ([59c8cdf](https://github.com/potterwhite/obsidian-nexus/commit/59c8cdf4f623c99684dec4ae72384531e4110d47))

## [0.3.0](https://github.com/potterwhite/obsidian-nexus/compare/v0.2.2...v0.3.0) (2025-12-30)


### Features

* **template:** add hour/minute formatting to project summary table ([c5086bd](https://github.com/potterwhite/obsidian-nexus/commit/c5086bde576c48b9ed4e03566fdc1490eb31ba0c))
* trigger first release ([d2a6de0](https://github.com/potterwhite/obsidian-nexus/commit/d2a6de0e86f3cdc8cabd5cc19e3ede543dd4fd58))

## [0.2.2] - 2025-12-30
### ✨ Added
- **Week Summary Template**: Enhanced the "Project Total Duration" table. It now displays a breakdown of hours and minutes alongside the total minutes (e.g., `150 minutes (2h 30m)`) for better readability.

### ⚡ Improved
- Updated the DataviewJS script to conditionally format time strings: tasks under 60 minutes remain concise, while longer tasks automatically show the hour conversion.


## [0.2.1] - 2025-12-30
- Remove "Yearly-Rank-By-Day.md" forever
- Add shortcut for Yearly-Review-Markdown Insert in README


## [0.2.0] - 2025-12-30

### Added
- Two powerful yearly review templates:
  - **Rank by Day**: detailed timeline, project totals, and Charts View visualizations (pie, column, bar).
  - **Rank by Month**: monthly breakdown table with total time and main focus project per month.
- Rich chart visualizations (using Obsidian Charts View plugin) in Monthly and Yearly reviews:
  - Pie chart for project time distribution.
  - Vertical column and horizontal bar charts for project hours.
- Interactive Templater script for time block insertion with improved UX:
  - Start/end time prompts (with current time default).
  - Task selection via suggester.
  - Automatic UUID linking and clean display name.
  - Preview notice before insertion.
- Default year pre-fill and robust input validation in Monthly, Weekly, and Yearly review Templater prompts.
- Essential `.obsidian` configuration files for out-of-the-box experience:
    - `daily-notes.json` (Daily note creation path and template).
    - `templates.json` (Templater template folder location).

### Changed
- Daily Note template improvements:
  - More reliable inheritance of unfinished tasks from yesterday's "Tomorrow's Plan" (supports multiple file name formats and bilingual headings).
  - Time analysis now shows total in hours + minutes with clearer formatting and cross-day safety.
- Weekly Review template enhancements:
  - Clickable links to original daily notes and specific time blocks.
  - Proper cross-year week boundary handling (Sunday-start weeks that span December–January).
  - Total weekly time displayed in hours + minutes.
- Standardized project and area links as quoted strings (`"[[Link]]"`) for consistency across templates.
- Updated version number in AAR.md to v0.2.0.
- Essential `.obsidian` configuration files for out-of-the-box experience:
  - `appearance.json`, `hotkeys.json`, and `core-plugins.json` for consistent look and shortcuts.

### Fixed
- Cross-year week calculation bug in weekly reviews.
- Chart label overlapping and rotation issues.
- Time block insertion display problems (e.g., unwanted italics from underscores in task names).
- Removed unnecessary personal configuration (`graph.json`) from shared vault.

## [0.1.0] - 2025-07-29

### Added
- Initial PARA-based vault structure with core folders (Projects, Areas, Resources, Archives).
- Foundational templates: Daily Note, Weekly Review, Task, Project.
- Basic time tracking and DataviewJS summaries in daily notes.

[0.1.0]: https://github.com/potterwhite/obsidian-nexus/releases/tag/v0.1.0

[0.2.0]: https://github.com/potterwhite/obsidian-nexus/releases/tag/v0.2.0

[0.2.1]: https://github.com/potterwhite/obsidian-nexus/releases/tag/v0.2.1

[0.2.2]: https://github.com/potterwhite/obsidian-nexus/releases/tag/v0.2.2
