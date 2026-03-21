export interface PartitionConfig {
    id: string;
    name: string;
    notebookIds: string[];
    sort: number;
    createdAt: number;
    updatedAt: number;
}

export interface PluginState {
    version: number;
    activePartitionId: string;
    partitions: PartitionConfig[];
}

export interface NotebookOption {
    id: string;
    name: string;
    closed: boolean;
    icon?: string;
}
