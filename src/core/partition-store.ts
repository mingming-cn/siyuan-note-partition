import type { NotebookOption, PartitionConfig, PluginState } from "@/types/partition";

export const PARTITION_STATE_VERSION = 1;

export function createDefaultPartition(notebooks: NotebookOption[], defaultPartitionName: string): PartitionConfig {
    const now = Date.now();
    return {
        id: "default",
        name: defaultPartitionName,
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
    const notebookIdSet = new Set(notebooks.map((item) => item.id));
    const partitions = Array.isArray(state?.partitions) && state?.partitions.length > 0
        ? state.partitions.map((item, index) => normalizePartition(
            item as Partial<PartitionConfig>,
            index,
            defaultPartitionName,
            notebookIdSet,
        ))
        : [createDefaultPartition(notebooks, defaultPartitionName)];

    if (partitions.length === 1 && partitions[0].id === "default" && partitions[0].notebookIds.length === 0) {
        partitions[0] = createDefaultPartition(notebooks, defaultPartitionName);
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

export function isPluginStateEqual(a: PluginState | undefined, b: PluginState | undefined): boolean {
    if (!a || !b) {
        return a === b;
    }

    if (a.version !== b.version || a.activePartitionId !== b.activePartitionId || a.partitions.length !== b.partitions.length) {
        return false;
    }

    return a.partitions.every((partition, index) => {
        const target = b.partitions[index];
        if (!target) {
            return false;
        }

        if (
            partition.id !== target.id ||
            partition.name !== target.name ||
            partition.sort !== target.sort ||
            partition.createdAt !== target.createdAt ||
            partition.updatedAt !== target.updatedAt ||
            partition.notebookIds.length !== target.notebookIds.length
        ) {
            return false;
        }

        return partition.notebookIds.every((id, notebookIndex) => id === target.notebookIds[notebookIndex]);
    });
}

export function createPartition(name: string, sort: number): PartitionConfig {
    const now = Date.now();
    return {
        id: `partition-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        notebookIds: [],
        sort,
        createdAt: now,
        updatedAt: now,
    };
}

function normalizePartition(
    partition: Partial<PartitionConfig>,
    index: number,
    defaultPartitionName: string,
    notebookIdSet: Set<string>,
): PartitionConfig {
    const now = Date.now();
    const legacyNotebookId = typeof (partition as PartitionConfig & { notebookId?: string }).notebookId === "string"
        ? (partition as PartitionConfig & { notebookId?: string }).notebookId
        : "";
    const notebookIds = Array.isArray(partition.notebookIds)
        ? [...new Set(partition.notebookIds.filter((id): id is string => typeof id === "string"))]
        : legacyNotebookId
            ? [legacyNotebookId]
            : [];

    const normalized: PartitionConfig = {
        id: partition.id || `partition-${index + 1}`,
        name: partition.name || `${defaultPartitionName} ${index + 1}`,
        notebookIds: notebookIds.filter((id) => notebookIdSet.has(id)),
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
