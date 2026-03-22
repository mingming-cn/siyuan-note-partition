import { closeNotebook, openNotebook } from "@/api";
import type { NotebookOption, PartitionConfig } from "@/types/partition";

export interface VisibilityPlan {
    toOpen: string[];
    toClose: string[];
}

export interface VisibilityApplyResult {
    opened: string[];
    closed: string[];
    failed: Array<{ id: string; action: "open" | "close" }>;
}

export function buildPartitionNotebookVisibilityPlan(
    partition: PartitionConfig,
    notebooks: NotebookOption[],
): VisibilityPlan {
    const allowedIds = new Set(partition.notebookIds);
    const toOpen: string[] = [];
    const toClose: string[] = [];

    for (const notebook of notebooks) {
        if (allowedIds.has(notebook.id) && notebook.closed) {
            toOpen.push(notebook.id);
        } else if (!allowedIds.has(notebook.id) && !notebook.closed) {
            toClose.push(notebook.id);
        }
    }

    return { toOpen, toClose };
}

export async function applyPartitionNotebookVisibility(plan: VisibilityPlan): Promise<VisibilityApplyResult> {
    const operations = [
        ...plan.toOpen.map((id) => ({ id, action: "open" as const })),
        ...plan.toClose.map((id) => ({ id, action: "close" as const })),
    ];

    const results = await Promise.allSettled(
        operations.map(async ({ id, action }) => {
            if (action === "open") {
                await openNotebook(id);
            } else {
                await closeNotebook(id);
            }

            return { id, action };
        }),
    );

    const opened: string[] = [];
    const closed: string[] = [];
    const failed: Array<{ id: string; action: "open" | "close" }> = [];

    results.forEach((result, index) => {
        const operation = operations[index];
        if (result.status === "fulfilled") {
            if (operation.action === "open") {
                opened.push(operation.id);
            } else {
                closed.push(operation.id);
            }
            return;
        }

        failed.push(operation);
    });

    return {
        opened,
        closed,
        failed,
    };
}
