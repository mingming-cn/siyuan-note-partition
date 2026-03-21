import type { NotebookOption, PartitionConfig, PluginState } from "@/types/partition";

export const PARTITION_STATE_VERSION = 1;

export function createDefaultPartition(notebooks: NotebookOption[]): PartitionConfig {
    const now = Date.now();
    return {
        id: "default",
        name: "Default Partition",
        notebookIds: notebooks.map((item) => item.id),
        sort: 0,
        createdAt: now,
        updatedAt: now,
    };
}

export function normalizeState(
    state: Partial<PluginState> | undefined,
    notebooks: NotebookOption[],
    defaultPartitionName: string,
): PluginState {
    const partitions = Array.isArray(state?.partitions) && state?.partitions.length > 0
        ? state.partitions.map((item, index) => normalizePartition(item as Partial<PartitionConfig>, index, defaultPartitionName))
        : [withPartitionName(createDefaultPartition(notebooks), defaultPartitionName)];

    if (partitions.length === 1 && partitions[0].id === "default" && partitions[0].notebookIds.length === 0) {
        partitions[0] = withPartitionName(createDefaultPartition(notebooks), defaultPartitionName);
    }

    const activePartitionId = partitions.some((item) => item.id === state?.activePartitionId)
        ? (state?.activePartitionId as string)
        : partitions[0].id;

    return {
        version: PARTITION_STATE_VERSION,
        activePartitionId,
        partitions,
    };
}

export function createPartition(name: string, sort: number): PartitionConfig {
    const now = Date.now();
    return {
        id: `partition-${now}`,
        name,
        notebookIds: [],
        sort,
        createdAt: now,
        updatedAt: now,
    };
}

function normalizePartition(partition: Partial<PartitionConfig>, index: number, defaultPartitionName: string): PartitionConfig {
    const now = Date.now();
    const legacyNotebookId = typeof (partition as PartitionConfig & { notebookId?: string }).notebookId === "string"
        ? (partition as PartitionConfig & { notebookId?: string }).notebookId
        : "";
    const notebookIds = Array.isArray(partition.notebookIds)
        ? partition.notebookIds
        : legacyNotebookId
            ? [legacyNotebookId]
            : [];

    const normalized: PartitionConfig = {
        id: partition.id || `partition-${index + 1}`,
        name: partition.name || `${defaultPartitionName} ${index + 1}`,
        notebookIds,
        sort: typeof partition.sort === "number" ? partition.sort : index,
        createdAt: typeof partition.createdAt === "number" ? partition.createdAt : now,
        updatedAt: typeof partition.updatedAt === "number" ? partition.updatedAt : now,
    };

    if (normalized.id === "default" && !partition.name) {
        return withPartitionName(normalized, defaultPartitionName);
    }

    return normalized;
}

function withPartitionName(partition: PartitionConfig, name: string): PartitionConfig {
    return {
        ...partition,
        name,
    };
}
