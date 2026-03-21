import type { PartitionConfig, PluginState } from "@/types/partition";

import { createPartition } from "@/core/partition-store";

export function addPartition(state: PluginState, name: string): PluginState {
    const partition = createPartition(name, state.partitions.length);
    return {
        ...state,
        activePartitionId: partition.id,
        partitions: [...state.partitions, partition],
    };
}

export function removePartition(state: PluginState, partitionId: string): PluginState {
    if (state.partitions.length <= 1) {
        return state;
    }

    const partitions = state.partitions.filter((item) => item.id !== partitionId);
    return {
        ...state,
        activePartitionId: partitions.some((item) => item.id === state.activePartitionId)
            ? state.activePartitionId
            : partitions[0].id,
        partitions: partitions.map((item, index) => ({ ...item, sort: index })),
    };
}

export function renamePartition(state: PluginState, partitionId: string, name: string): PluginState {
    return {
        ...state,
        partitions: state.partitions.map((item) => item.id === partitionId ? {
            ...item,
            name,
            updatedAt: Date.now(),
        } : item),
    };
}

export function selectPartition(state: PluginState, partitionId: string): PluginState {
    return state.partitions.some((item) => item.id === partitionId)
        ? { ...state, activePartitionId: partitionId }
        : state;
}

export function togglePartitionNotebook(
    state: PluginState,
    partitionId: string,
    notebookId: string,
    checked: boolean,
): PluginState {
    return {
        ...state,
        partitions: state.partitions.map((item) => {
            if (item.id !== partitionId) {
                return item;
            }

            const notebookIds = checked
                ? [...new Set([...item.notebookIds, notebookId])]
                : item.notebookIds.filter((id) => id !== notebookId);

            return {
                ...item,
                notebookIds,
                updatedAt: Date.now(),
            };
        }),
    };
}

export function linkNotebookToPartition(
    state: PluginState,
    notebookId: string,
    partitionId: string,
): PluginState {
    return {
        ...state,
        partitions: state.partitions.map((item) => {
            if (item.id !== partitionId || item.notebookIds.includes(notebookId)) {
                return item;
            }

            return {
                ...item,
                notebookIds: [...item.notebookIds, notebookId],
                updatedAt: Date.now(),
            };
        }),
    };
}
