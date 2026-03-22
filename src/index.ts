import { Dialog, Menu, Plugin, getFrontend, showMessage, type IWebSocketData } from "siyuan";
import "./index.scss";

import { lsNotebooks } from "@/api";
import {
  applyPartitionNotebookVisibility,
  buildPartitionNotebookVisibilityPlan,
} from "@/core/notebook-visibility";
import { linkNotebookToPartition, removePartition as removePartitionState } from "@/core/partition-service";
import { isPluginStateEqual, normalizeState } from "@/core/partition-store";
import PartitionPanel from "@/partition-panel.svelte";
import type { NotebookOption, PartitionConfig, PluginState } from "@/types/partition";

const STORAGE_NAME = "partition-state";

export default class SiyuanPartitionPlugin extends Plugin {
  private isMobile = false;
  private topBarElement?: HTMLElement;
  private state!: PluginState;
  private notebooks: NotebookOption[] = [];
  private notebookSyncPending = false;
  private notebookSyncPromise: Promise<void> | null = null;
  private applyingPartitionVisibility = false;
  private pendingPartitionApply = false;
  private activePartitionApplyPromise: Promise<void> | null = null;
  private switchingPartitionInteractionLocked = false;

  async onload() {
    this.isMobile = ["mobile", "browser-mobile"].includes(getFrontend());

    this.addIcons(`
<symbol id="iconPartition" viewBox="0 0 32 32">
<path d="M4 6.667A2.667 2.667 0 0 1 6.667 4h18.667A2.667 2.667 0 0 1 28 6.667v5.866a2.667 2.667 0 0 1-.781 1.886l-3.467 3.467a2.667 2.667 0 0 0-.781 1.886v5.562A2.667 2.667 0 0 1 20.305 28H6.667A2.667 2.667 0 0 1 4 25.333V6.667zm5.333 2.666v4h13.334v-4H9.333zm0 9.334v4h8v-4h-8z"></path>
</symbol>`);

    await this.refreshNotebookCache();
    await this.loadStateFromStorage();

    this.addCommand({
      langKey: "openPartitionManager",
      hotkey: "",
      callback: () => this.openSetting(),
    });

    this.eventBus.on("opened-notebook", this.handleNotebookChanged);
    this.eventBus.on("closed-notebook", this.handleNotebookChanged);
    this.eventBus.on("ws-main", this.handleWsMain);

    await this.scheduleApplyActivePartition();
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
    this.unlockPartitionInteraction();
    console.log(`[${this.name}] unloaded`);
  }

  uninstall() {
    console.log(`[${this.name}] uninstall`);
    // Delete plugin data when uninstalling the plugin
    this.removeData(STORAGE_NAME).catch(e => {
      showMessage(`uninstall [${this.name}] remove data [${STORAGE_NAME}] fail: ${e.msg}`);
    });
  }

  async openSetting(): Promise<void> {
    try {
      await this.refreshNotebookCache();
      const dialog = new Dialog({
        title: this.i18n.partitionManager,
        content: `<div class="partition-panel-host" style="height: 100%;"></div>`,
        width: this.isMobile ? "92vw" : "820px",
        height: this.isMobile ? "80vh" : "640px",
        disableClose: true,
        hideCloseIcon: true,
        destroyCallback: () => {
          panel.$destroy();
        },
      });

      const host = dialog.element.querySelector(".partition-panel-host") as HTMLElement;
      const panel = new PartitionPanel({
        target: host,
        props: {
          state: this.state,
          notebooks: this.notebooks,
          i18n: this.i18n,
          onSave: async (state: PluginState) => {
            try {
              await this.saveState(state);
              showMessage(this.i18n.stateSaved);
              dialog.destroy();
            } catch (error) {
              const message = error instanceof Error ? error.message : this.i18n.stateSaveFailed;
              showMessage(message || this.i18n.stateSaveFailed, 5000, "error");
            }
          },
          onCancel: () => {
            dialog.destroy();
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : this.i18n.stateSaveFailed;
      showMessage(message || this.i18n.stateSaveFailed, 5000, "error");
    }
  }

  private async loadStateFromStorage() {
    const stored = await this.loadData(STORAGE_NAME) as PluginState | undefined;
    const normalized = normalizeState(stored, this.notebooks, this.i18n.defaultPartition);
    this.state = normalized;
    this.data[STORAGE_NAME] = normalized;
    if (!isPluginStateEqual(stored, normalized)) {
      await this.saveData(STORAGE_NAME, normalized);
    }
  }

  private getState(): PluginState {
    return this.state;
  }

  private async saveState(state: PluginState) {
    const normalized = normalizeState(state, this.notebooks, this.i18n.defaultPartition);
    await this.persistState(normalized);
    await this.scheduleApplyActivePartition();
    this.refreshTopBar();
  }

  private async persistState(state: PluginState) {
    this.state = state;
    this.data[STORAGE_NAME] = state;
    await this.saveData(STORAGE_NAME, state);
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
    const menu = new Menu("siyuan-note-partition-topbar");
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
          const current = this.getState();
          const nextState = removePartitionState(current, current.activePartitionId);
          if (nextState.partitions.length === current.partitions.length) {
            showMessage(this.i18n.lastPartitionHint, 5000, "error");
            return;
          }
          await this.saveState(nextState);
          showMessage(this.i18n.partitionRemoved);
        },
      });
    }

    menu.open({
      x: Math.round(rect.left),
      y: Math.round(rect.bottom + 6),
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
    await this.requestNotebookSync();
  };

  private async scheduleApplyActivePartition() {
    this.pendingPartitionApply = true;
    if (!this.activePartitionApplyPromise) {
      this.activePartitionApplyPromise = this.flushApplyActivePartition().finally(() => {
        this.activePartitionApplyPromise = null;
      });
    }
    await this.activePartitionApplyPromise;
  }

  private async flushApplyActivePartition() {
    if (this.applyingPartitionVisibility) {
      return;
    }

    this.applyingPartitionVisibility = true;
    try {
      while (this.pendingPartitionApply) {
        this.pendingPartitionApply = false;
        await this.applyActivePartitionOnce();
      }
    } finally {
      this.applyingPartitionVisibility = false;
    }
  }

  private async applyActivePartitionOnce() {
    await this.withPartitionInteractionLock(async () => {
      await this.refreshNotebookCache();
      await this.normalizePersistedState();

      const activePartition = this.getActivePartition();
      const plan = buildPartitionNotebookVisibilityPlan(activePartition, this.notebooks);
      if (plan.toOpen.length === 0 && plan.toClose.length === 0) {
        return;
      }

      const result = await applyPartitionNotebookVisibility(plan);
      if (result.opened.length > 0 || result.closed.length > 0) {
        await this.refreshNotebookCache();
      }

      if (result.failed.length > 0) {
        showMessage(`${this.i18n.notebookOperationFailed} (${result.failed.length})`, 5000, "error");
      }
    });
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

  private handleWsMain = async (event: CustomEvent<IWebSocketData>) => {
    if (!this.isNotebookMutationWsEvent(event.detail)) {
      return;
    }

    await this.requestNotebookSync();
  };

  private isNotebookMutationWsEvent(event: IWebSocketData) {
    const fields = [event?.cmd, event?.callback, event?.msg]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase());

    return fields.some((value) => value.includes("createnotebook") || value.includes("removenotebook"));
  }

  private async requestNotebookSync() {
    this.notebookSyncPending = true;
    if (!this.notebookSyncPromise) {
      this.notebookSyncPromise = this.flushNotebookSync().finally(() => {
        this.notebookSyncPromise = null;
      });
    }
    await this.notebookSyncPromise;
  }

  private async flushNotebookSync() {
    try {
      while (this.notebookSyncPending) {
        this.notebookSyncPending = false;
        await this.syncNewNotebooksToActivePartitionOnce();
      }
    } finally {
      this.refreshTopBar();
    }
  }

  private async syncNewNotebooksToActivePartitionOnce() {
    const addedNotebookIds = await this.refreshNotebookCache();
    const current = this.getState();
    const nextState = addedNotebookIds.reduce(
      (state, notebookId) => linkNotebookToPartition(state, notebookId, current.activePartitionId),
      current,
    );

    const normalized = normalizeState(nextState, this.notebooks, this.i18n.defaultPartition);
    const stateChanged = !isPluginStateEqual(normalized, current);
    if (!stateChanged) {
      return;
    }

    await this.persistState(normalized);
    await this.scheduleApplyActivePartition();
  }

  private async normalizePersistedState() {
    const normalized = normalizeState(this.state, this.notebooks, this.i18n.defaultPartition);
    if (isPluginStateEqual(normalized, this.state)) {
      return;
    }

    await this.persistState(normalized);
  }

  private lockPartitionInteraction() {
    if (this.switchingPartitionInteractionLocked) {
      return;
    }

    this.switchingPartitionInteractionLocked = true;
    document.body.classList.add("partition-switching");
  }

  private unlockPartitionInteraction() {
    if (!this.switchingPartitionInteractionLocked) {
      document.body.classList.remove("partition-switching");
      return;
    }

    this.switchingPartitionInteractionLocked = false;
    document.body.classList.remove("partition-switching");
  }

  private async withPartitionInteractionLock<T>(fn: () => Promise<T>): Promise<T> {
    this.lockPartitionInteraction();
    try {
      return await fn();
    } finally {
      window.setTimeout(() => {
        this.unlockPartitionInteraction();
      }, 300);
    }
  }
}
