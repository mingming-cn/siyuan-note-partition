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
    export let onSave: (state: PluginState) => void;

    let draft: PluginState = cloneState(state);

    $: activePartition = draft.partitions.find((item) => item.id === draft.activePartitionId) ?? draft.partitions[0];

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
    }

    function removePartition(id: string) {
        draft = removePartitionState(draft, id);
    }

    function updateActive(field: "name", value: string) {
        if (!activePartition) {
            return;
        }

        if (field === "name") {
            draft = renamePartition(draft, activePartition.id, value);
        }
    }

    function toggleNotebook(notebookId: string, checked: boolean) {
        if (!activePartition) {
            return;
        }

        draft = togglePartitionNotebook(draft, activePartition.id, notebookId, checked);
    }

    function isNotebookSelected(notebookId: string) {
        return activePartition?.notebookIds.includes(notebookId) ?? false;
    }

    function save() {
        onSave?.(cloneState(draft));
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
            <button
                class:selected={partition.id === draft.activePartitionId}
                class="partition-item"
                on:click={() => {
                    draft = selectPartition(draft, partition.id);
                }}
            >
                <span>{partition.name || i18n.unnamedPartition}</span>
                <span
                    class:disabled={draft.partitions.length <= 1}
                    class="partition-item__remove"
                    on:click|stopPropagation={() => removePartition(partition.id)}
                >
                    {i18n.remove}
                </span>
            </button>
        {/each}
    </aside>

    <section class="partition-form">
        {#if activePartition}
            {#key activePartition.id}
                <div class="partition-form__top">
                    <div class="partition-form__name">
                        <span class="b3-label__text">{i18n.partitionName}</span>
                        <div class="partition-form__name-row">
                            <input
                                class="b3-text-field fn__block"
                                value={activePartition.name}
                                on:input={(event) => updateActive("name", event.currentTarget.value)}
                            />
                            <button class="b3-button b3-button--text partition-form__save" on:click={save}>
                                {i18n.save}
                            </button>
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
            {/key}
        {/if}
    </section>
</div>
