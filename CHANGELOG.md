# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog.

## [0.0.1] - 2026-03-21

Initial MVP release of SiYuan Partition.

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
