<script lang="ts">
    import {
        addPartition as addPartitionState,
        removePartition as removePartitionState,
        renamePartition,
        selectPartition,
        togglePartitionNotebook,
    } from "@/core/partition-service";
    import type { NotebookOption, PluginState } from "@/types/partition";

    export let state: PluginState;
    export let notebooks: NotebookOption[];
    export let i18n: Record<string, string>;
    export let onSave: (state: PluginState) => Promise<void>;
    export let onCancel: (() => void) | undefined;

    let draft: PluginState = cloneState(state);
    let isDirty = false;
    let saving = false;

    $: activePartition = draft.partitions.find((item) => item.id === draft.activePartitionId) ?? draft.partitions[0];
    $: selectedNotebookCount = activePartition?.notebookIds.length ?? 0;

    function cloneState(source: PluginState): PluginState {
        return {
            version: source.version,
            activePartitionId: source.activePartitionId,
            partitions: source.partitions.map((item) => ({
                ...item,
                notebookIds: [...item.notebookIds],
            })),
        };
    }

    function addPartition() {
        draft = addPartitionState(draft, `${i18n.partitionLabel} ${draft.partitions.length + 1}`);
        isDirty = true;
    }

    function removePartition(id: string) {
        draft = removePartitionState(draft, id);
        isDirty = true;
    }

    function updateActive(field: "name", value: string) {
        if (!activePartition) {
            return;
        }

        if (field === "name") {
            draft = renamePartition(draft, activePartition.id, value);
            isDirty = true;
        }
    }

    function toggleNotebook(notebookId: string, checked: boolean) {
        if (!activePartition) {
            return;
        }

        draft = togglePartitionNotebook(draft, activePartition.id, notebookId, checked);
        isDirty = true;
    }

    function isNotebookSelected(notebookId: string) {
        return activePartition?.notebookIds.includes(notebookId) ?? false;
    }

    async function save() {
        if (saving) {
            return;
        }

        saving = true;
        try {
            await onSave(cloneState(draft));
            isDirty = false;
        } finally {
            saving = false;
        }
    }

    function cancel() {
        if (saving) {
            return;
        }

        if (isDirty && !window.confirm(i18n.unsavedChangesConfirm)) {
            return;
        }

        onCancel?.();
    }
</script>

<div class="partition-panel">
    <aside class="partition-list">
        <div class="partition-list__header">
            <strong>{i18n.partitionManager}</strong>
            <button class="b3-button b3-button--small" on:click={addPartition}>
                {i18n.addPartition}
            </button>
        </div>

        {#each draft.partitions as partition}
            <div class:selected={partition.id === draft.activePartitionId} class="partition-item">
                <button
                    type="button"
                    class="partition-item__main"
                    on:click={() => {
                        draft = selectPartition(draft, partition.id);
                    }}
                >
                    <span>{partition.name || i18n.unnamedPartition}</span>
                </button>
                <button
                    type="button"
                    class="partition-item__remove"
                    disabled={draft.partitions.length <= 1 || saving}
                    on:click={() => removePartition(partition.id)}
                >
                    {i18n.remove}
                </button>
            </div>
        {/each}
    </aside>

    <section class="partition-form">
        {#if activePartition}
            {#key activePartition.id}
                <div class="partition-form__top">
                    <div class="partition-form__status">
                        <span class:partition-form__dirty={isDirty} class="partition-form__hint">
                            {isDirty ? i18n.unsavedChanges : i18n.allChangesSaved}
                        </span>
                        <span class="partition-form__hint">
                            {i18n.selectedNotebookCountLabel} {selectedNotebookCount} / {notebooks.length}
                        </span>
                    </div>
                    <div class="partition-form__name">
                        <span class="b3-label__text">{i18n.partitionName}</span>
                        <div class="partition-form__name-row">
                            <input
                                class="b3-text-field fn__block"
                                value={activePartition.name}
                                on:input={(event) => updateActive("name", event.currentTarget.value)}
                            />
                        </div>
                    </div>
                </div>

                <div class="partition-notebook-list">
                    {#if notebooks.length > 0}
                        {#each notebooks as notebook (notebook.id)}
                            <label class="partition-notebook-item">
                                <input
                                    type="checkbox"
                                    checked={isNotebookSelected(notebook.id)}
                                    on:change={(event) => toggleNotebook(notebook.id, event.currentTarget.checked)}
                                />
                                <span>{notebook.name}</span>
                                <span class="partition-notebook-item__meta">{notebook.id}</span>
                            </label>
                        {/each}
                    {:else}
                        <div class="partition-empty">{i18n.noNotebookFound}</div>
                    {/if}
                </div>

                {#if draft.partitions.length <= 1}
                    <div class="partition-inline-hint">{i18n.lastPartitionHint}</div>
                {/if}

                <div class="partition-form__actions">
                    <button class="b3-button b3-button--cancel partition-form__action" disabled={saving} on:click={cancel}>
                        {i18n.close}
                    </button>
                    <button class="b3-button b3-button--text partition-form__action" disabled={!isDirty || saving} on:click={save}>
                        {saving ? i18n.saving : i18n.save}
                    </button>
                </div>
            {/key}
        {/if}
    </section>
</div>
