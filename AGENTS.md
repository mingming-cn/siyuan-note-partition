# siyuan-partition Codex Reference

## 1. Project Goal

This project is a SiYuan plugin for notebook partitioning.

Core idea:
- Simulate workspace-like behavior by switching visible top-level notebooks.
- Let different partitions expose different notebook sets without switching real SiYuan workspaces.
- Reduce context-switching cost in one SiYuan instance.

Important product boundary:
- This is UI-level workflow isolation, not security isolation.
- Hidden content is only hidden from the current UI flow, not encrypted or access-controlled.

## 2. Current Repository Status

The repository is no longer a sample template. It is a usable MVP.

Current state:
- `src/index.ts` implements the active plugin lifecycle, top-bar entry, partition switching, notebook visibility control, and notebook-creation sync.
- `src/partition-panel.svelte` implements the partition management dialog.
- `src/core/partition-store.ts`, `src/core/partition-service.ts`, and `src/core/notebook-visibility.ts` contain the current storage and domain logic.
- The product model has been narrowed to notebook-only association. There is no path-level or note-level filtering.

When generating code, treat the current code as an in-progress product with real behavior already in place.

## 3. Tech Stack

Primary stack:
- TypeScript
- Svelte 4
- Vite 5
- Sass
- `siyuan` npm package / SiYuan Plugin API typings

Build/runtime notes:
- Entry: `src/index.ts`
- Styles: `src/index.scss`
- Bundler: Vite library mode, CommonJS output
- Dev output dir: `dev/`
- Prod output dir: `dist/`
- Packaging: `package.zip`

## 4. Repository Structure

Key files:
- `src/index.ts`: plugin entry, lifecycle, left top-bar integration, partition switching, notebook sync
- `src/partition-panel.svelte`: partition management dialog UI
- `src/core/partition-store.ts`: state normalization, migration, default partition creation
- `src/core/partition-service.ts`: partition add/remove/rename/select/notebook-link rules
- `src/core/notebook-visibility.ts`: open/close notebook visibility control for active partition
- `src/types/partition.ts`: partition and notebook types
- `src/api.ts`: kernel API wrappers
- `src/index.scss`: plugin styles
- `public/i18n/`: plugin i18n resources
- `plugin.json`: SiYuan plugin manifest

## 5. External References

Use these as primary references when implementing features:

1. SiYuan community reference
   - https://docs.siyuan-note.club/zh-Hans/reference/

2. Plugin Quick Start
   - https://ld246.com/article/1723732790981

3. SiYuan Plugin API typings
   - https://github.com/siyuan-note/petal

4. Official sample plugin
   - https://github.com/siyuan-note/plugin-sample

5. Reference implementation idea
   - https://github.com/zxkmm/siyuan_fake_workspace
   - Relevant mainly for top-bar-first interaction and workspace-like switching

## 6. SiYuan-Specific Constraints

Implementations must respect these realities:

- Plugin code runs inside the SiYuan frontend context.
- Prefer public Plugin API and kernel API wrappers.
- Do not rely on unstable internal DOM structure unless there is no public alternative.
- Persist configuration with plugin storage through `loadData` / `saveData`.
- Support desktop first, but avoid writing code that hard-crashes on mobile.

Important API families for this project:
- `notebook`
  - list notebooks
  - open notebooks
  - close notebooks
- plugin methods
  - `addTopBar`
  - `addCommand`
  - `openSetting`
  - `eventBus`

## 7. Product Model For This Repo

Unless requirements change explicitly, assume this model:

Partition:
- A named work partition inside the plugin.
- Owns its own associated top-level notebooks.
- Only notebooks associated with the active partition should remain visible.
- Newly created top-level notebooks should be associated with the active partition automatically.

Product rules that must be preserved:
- On first use, automatically create a `Default Partition`.
- The default partition must be associated with all current notebooks.
- At least one partition must always exist.
- The last remaining partition must not be deletable.
- A notebook may belong to multiple partitions.

Recommended partition data shape:

```ts
interface PartitionConfig {
  id: string;
  name: string;
  notebookIds: string[];
  sort: number;
  createdAt: number;
  updatedAt: number;
}

interface PluginState {
  version: number;
  activePartitionId: string;
  partitions: PartitionConfig[];
}
```

## 8. Current UX Model

Current primary entry:
- A left top-bar button showing `icon + current partition name`

Current management UI:
- Clicking the top-bar button opens a menu for quick switching and management
- Opening partition management shows a dialog
- The dialog has a left partition list and a right edit area
- The right area supports partition renaming and notebook association selection

Not in scope for the current UX:
- Dock entry
- Path-level filtering UI
- Note-level association UI

## 9. Recommended Implementation Direction

Keep the architecture aligned with the current model:

1. Storage layer
   - Centralize partition config read/write.
   - Keep stored schema backward-compatible.

2. Partition service
   - Keep business rules pure where possible.
   - Enforce at-least-one-partition and notebook-link semantics centrally.

3. Visibility control
   - Use top-level notebook visibility as the only filtering mechanism.
   - Do not add path-level or note-level filtering unless requirements change.

4. Notebook creation sync
   - Detect newly added top-level notebooks from notebook list refreshes or event-driven sync.
   - Link them to the current active partition without removing them from other partitions.

## 10. Coding Guidance For Codex

When editing this repo:

- Preserve the notebook-only partition model.
- Keep the left top-bar button as the primary user entry unless requirements change explicitly.
- Keep UI text ready for i18n.
- Do not claim privacy or security guarantees the plugin cannot actually provide.
- Avoid expensive full-tree scans on every UI update.
- Separate domain state from UI rendering and event glue.

## 11. Non-Goals

Do not assume these are in scope unless explicitly requested:

- True multi-workspace isolation
- Encryption or note access control
- Path-level partition filtering
- Note-level partition filtering
- Large-scale notebook restructuring as a default behavior
- Deep coupling to unofficial internal APIs when public APIs are sufficient

## 12. Current Gaps

Before the plugin can be considered polished, these areas still need improvement:
- better feedback and resilience around notebook auto-association events
- optional import/export for partition configuration
- conflict handling when users manually open or close notebooks outside partition switching
- cleanup of no-longer-used template leftovers if still present

## 13. Source Summary

This document is based on:
- the current repository structure and source files
- SiYuan community reference index
- SiYuan plugin quick-start material
- `siyuan-note/petal` Plugin API typings
- `zxkmm/siyuan_fake_workspace` product description

If implementation details conflict with newer official SiYuan docs or newer `petal` typings, prefer the newer official source.
