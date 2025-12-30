# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
