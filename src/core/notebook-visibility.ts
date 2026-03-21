import { closeNotebook, openNotebook } from "@/api";
import type { NotebookOption, PartitionConfig } from "@/types/partition";

export async function applyPartitionNotebookVisibility(
    partition: PartitionConfig,
    notebooks: NotebookOption[],
): Promise<void> {
    const allowedIds = new Set(partition.notebookIds);

    for (const notebook of notebooks) {
        if (allowedIds.has(notebook.id) && notebook.closed) {
            await openNotebook(notebook.id);
        } else if (!allowedIds.has(notebook.id) && !notebook.closed) {
            await closeNotebook(notebook.id);
        }
    }
}
