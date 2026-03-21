import { Dialog, Menu, Plugin, getFrontend, showMessage } from "siyuan";
import "./index.scss";

import { lsNotebooks } from "@/api";
import { applyPartitionNotebookVisibility } from "@/core/notebook-visibility";
import { linkNotebookToPartition, removePartition as removePartitionState } from "@/core/partition-service";
import { normalizeState } from "@/core/partition-store";
import PartitionPanel from "@/partition-panel.svelte";
import type { NotebookOption, PartitionConfig, PluginState } from "@/types/partition";

const STORAGE_NAME = "partition-state";

export default class SiyuanPartitionPlugin extends Plugin {
    private isMobile = false;
    private topBarElement?: HTMLElement;
    private notebooks: NotebookOption[] = [];
    private syncingNotebookCreation = false;

    async onload() {
        this.isMobile = ["mobile", "browser-mobile"].includes(getFrontend());

        this.addIcons(`
<symbol id="iconPartition" viewBox="0 0 32 32">
<path d="M4 6.667A2.667 2.667 0 0 1 6.667 4h18.667A2.667 2.667 0 0 1 28 6.667v5.866a2.667 2.667 0 0 1-.781 1.886l-3.467 3.467a2.667 2.667 0 0 0-.781 1.886v5.562A2.667 2.667 0 0 1 20.305 28H6.667A2.667 2.667 0 0 1 4 25.333V6.667zm5.333 2.666v4h13.334v-4H9.333zm0 9.334v4h8v-4h-8z"></path>
</symbol>`);

        await this.refreshNotebookCache();
        await this.ensureState();

        this.addCommand({
            langKey: "openPartitionManager",
            callback: () => this.openSetting(),
        });

        this.eventBus.on("opened-notebook", this.handleNotebookChanged);
        this.eventBus.on("closed-notebook", this.handleNotebookChanged);
        this.eventBus.on("ws-main", this.handleWsMain);

        await this.applyActivePartition();
        console.log(`[${this.name}] loaded`);
    }

    onLayoutReady() {
        this.topBarElement = this.addTopBar({
            icon: "iconPartition",
            title: this.i18n.partitionManager,
            position: "left",
            callback: () => this.handleTopBarClick(),
        });
        this.decorateTopBarButton();
    }

    async onunload() {
        this.eventBus.off("opened-notebook", this.handleNotebookChanged);
        this.eventBus.off("closed-notebook", this.handleNotebookChanged);
        this.eventBus.off("ws-main", this.handleWsMain);
        console.log(`[${this.name}] unloaded`);
    }

    openSetting(): void {
        this.refreshNotebookCache().then(() => {
            const dialog = new Dialog({
                title: this.i18n.partitionManager,
                content: `<div class="partition-panel-host" style="height: 100%;"></div>`,
                width: this.isMobile ? "92vw" : "820px",
                height: this.isMobile ? "80vh" : "640px",
                destroyCallback: () => {
                    panel.$destroy();
                },
            });

            const host = dialog.element.querySelector(".partition-panel-host") as HTMLElement;
            const panel = new PartitionPanel({
                target: host,
                props: {
                    state: this.getState(),
                    notebooks: this.notebooks,
                    i18n: this.i18n,
                    onSave: async (state: PluginState) => {
                        await this.saveState(state);
                        showMessage(this.i18n.stateSaved);
                        dialog.destroy();
                    },
                },
            });
        });
    }

    private async ensureState() {
        const stored = await this.loadData(STORAGE_NAME) as PluginState | undefined;
        const state = normalizeState(stored, this.notebooks, this.i18n.defaultPartition);
        this.data[STORAGE_NAME] = state;
        await this.saveData(STORAGE_NAME, state);
    }

    private getState(): PluginState {
        return normalizeState(this.data[STORAGE_NAME], this.notebooks, this.i18n.defaultPartition);
    }

    private async saveState(state: PluginState) {
        const normalized = normalizeState(state, this.notebooks, this.i18n.defaultPartition);
        this.data[STORAGE_NAME] = normalized;
        await this.saveData(STORAGE_NAME, normalized);
        await this.applyActivePartition();
        this.refreshTopBar();
    }

    private getActivePartition(): PartitionConfig {
        const state = this.getState();
        return state.partitions.find((item) => item.id === state.activePartitionId) ?? state.partitions[0];
    }

    private refreshTopBar() {
        this.decorateTopBarButton();
    }

    private handleTopBarClick() {
        if (this.isMobile) {
            this.openSetting();
            return;
        }

        const rect = this.resolveMenuRect();
        const menu = new Menu("siyuan-partition-topbar");
        menu.addItem({
            icon: "iconSettings",
            label: this.i18n.openPartitionManager,
            click: () => this.openSetting(),
        });

        const state = this.getState();
        if (state.partitions.length > 0) {
            menu.addSeparator();
        }

        for (const partition of state.partitions) {
            menu.addItem({
                icon: partition.id === state.activePartitionId ? "iconSelect" : "iconRight",
                label: partition.name,
                click: async () => {
                    await this.saveState({ ...state, activePartitionId: partition.id });
                    showMessage(`${this.i18n.switchedTo} ${partition.name}`);
                },
            });
        }

        if (state.partitions.length > 1) {
            menu.addSeparator();
            menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.removeCurrentPartition,
                click: async () => {
                    const nextState = removePartitionState(this.getState(), this.getState().activePartitionId);
                    if (nextState.partitions.length === this.getState().partitions.length) {
                        showMessage(this.i18n.lastPartitionHint, 5000, "error");
                        return;
                    }
                    await this.saveState(nextState);
                    showMessage(this.i18n.partitionRemoved);
                },
            });
        }

        menu.open({
            x: rect.left,
            y: rect.bottom,
            isLeft: true,
        });
    }

    private resolveMenuRect(): DOMRect {
        let rect = this.topBarElement?.getBoundingClientRect();
        if (rect && rect.width > 0) {
            return rect;
        }

        const fallback = document.querySelector("#barMore, #barPlugins") as HTMLElement | null;
        return fallback?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
    }

    private escapeHtml(value: string) {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#39;");
    }

    private refreshNotebookCache = async () => {
        const response = await lsNotebooks();
        const previousNotebookIds = new Set(this.notebooks.map((item) => item.id));
        this.notebooks = (response?.notebooks || []).map((item) => ({
            id: item.id,
            name: item.name,
            closed: item.closed,
            icon: item.icon,
        }));
        const addedNotebookIds = this.notebooks
            .map((item) => item.id)
            .filter((id) => !previousNotebookIds.has(id));
        return addedNotebookIds;
    };

    private handleNotebookChanged = async () => {
        await this.syncNewNotebooksToActivePartition();
    };

    private async applyActivePartition() {
        await this.refreshNotebookCache();
        const activePartition = this.getActivePartition();
        await applyPartitionNotebookVisibility(activePartition, this.notebooks);
        await this.refreshNotebookCache();
    }

    private decorateTopBarButton() {
        if (!this.topBarElement) {
            return;
        }

        const activePartition = this.getActivePartition();
        this.topBarElement.classList.add("partition-topbar");
        this.topBarElement.setAttribute("aria-label", this.i18n.partitionManager);
        this.topBarElement.innerHTML = `
<svg class="toolbar__icon"><use xlink:href="#iconPartition"></use></svg>
<span class="partition-topbar__value">${this.escapeHtml(activePartition.name)}</span>`;
    }

    private handleWsMain = async () => {
        await this.syncNewNotebooksToActivePartition();
    };

    private async syncNewNotebooksToActivePartition() {
        if (this.syncingNotebookCreation) {
            return;
        }

        this.syncingNotebookCreation = true;
        try {
            const addedNotebookIds = await this.refreshNotebookCache();
            const current = normalizeState(this.data[STORAGE_NAME], this.notebooks, this.i18n.defaultPartition);
            const nextState = addedNotebookIds.length > 0
                ? addedNotebookIds.reduce(
                    (state, notebookId) => linkNotebookToPartition(state, notebookId, current.activePartitionId),
                    current,
                )
                : current;

            this.data[STORAGE_NAME] = nextState;
            await this.saveData(STORAGE_NAME, nextState);
            if (addedNotebookIds.length > 0) {
                await this.applyActivePartition();
            }
            this.refreshTopBar();
        } finally {
            this.syncingNotebookCreation = false;
        }
    }
}
