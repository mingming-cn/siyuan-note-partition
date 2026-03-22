# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog.

## [0.0.2] - 2026-03-22

Refinement release focused on partition switching reliability, state normalization, and panel usability.

### Added

- Unsaved-change awareness in the partition management panel, including saved/unsaved status text and a close confirmation prompt.
- Explicit save lifecycle feedback in the panel, including saving state and save failure messages.
- Selected notebook count display in the partition management panel.
- Partial notebook visibility failure feedback when some notebook open/close operations do not complete successfully.

### Changed

- Reworked partition switching to build a visibility plan first and then apply notebook open/close operations in a controlled batch.
- Serialized active-partition application and notebook-sync flows to reduce repeated overlapping operations during notebook events and partition changes.
- Improved persisted state normalization by removing invalid notebook references, deduplicating notebook IDs, preserving localized default partition naming, and writing normalized state back only when needed.
- Adjusted partition creation to use more collision-resistant IDs.
- Refined the partition management panel layout and actions, including a dedicated close action and clearer save affordances.
- Updated plugin metadata, icon assets, supported frontend/backend declarations, and author information for distribution readiness.
- Refined README documentation and reference links.

### Fixed

- Fixed save-flow robustness by surfacing kernel request failures instead of silently treating them as empty results.
- Fixed automatic notebook association sync to react more narrowly to notebook creation and removal related events.
- Fixed top-bar partition menu positioning so it aligns more reliably with the trigger button.
- Fixed repeated state writes by comparing normalized state before persisting.
- Fixed TypeScript configuration compatibility for ES2021 string APIs used by the plugin.

### Removed

- Removed leftover template/example files that were no longer part of the actual plugin implementation.

## [0.0.1] - 2026-03-21

Initial MVP release of SiYuan Note Partition.

### Added

- Partition-based notebook visibility management for SiYuan.
- Automatic creation of a `Default Partition` on first use.
- Initial association of the default partition with all existing top-level notebooks.
- Top-bar entry that shows the plugin icon and current partition name.
- Quick partition switching from the top-bar menu.
- Partition management dialog built with Svelte.
- Partition creation, renaming, and deletion.
- Protection against deleting the last remaining partition.
- Notebook-to-partition association management for top-level notebooks.
- Notebook visibility switching by opening notebooks in the active partition and closing unrelated notebooks.
- Automatic association of newly created top-level notebooks with the current active partition.
- Persistent plugin state storage through plugin data APIs.
- Basic i18n resources for English and Simplified Chinese.

### Changed

- Narrowed the product model to notebook-only association.
- Clarified the plugin positioning as workflow isolation in the UI, not security isolation.
- Adopted the left top-bar button as the primary product entry.

### Limitations

- Only top-level notebook filtering is supported.
- Path-level filtering is not supported.
- Note-level association is not supported.
- Conflict handling for notebooks manually opened or closed outside partition switching still needs improvement.
- Auto-association feedback and failure resilience still need improvement.
