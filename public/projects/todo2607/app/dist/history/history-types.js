export { applyTaskSnapshot, createCanvasSnapshot, createConnectionSnapshot, createTaskSnapshot, restoreCanvasSnapshot, restoreConnectionSnapshot, restoreTaskSnapshot, } from "../domain/entity-snapshots.js";
export var HistoryOperationType;
(function (HistoryOperationType) {
    HistoryOperationType["TaskCreate"] = "task-create";
    HistoryOperationType["TaskEdit"] = "task-edit";
    HistoryOperationType["TaskMove"] = "task-move";
    HistoryOperationType["TaskDelete"] = "task-delete";
    HistoryOperationType["ConnectionCreate"] = "connection-create";
    HistoryOperationType["ConnectionDelete"] = "connection-delete";
    HistoryOperationType["TaskPaste"] = "task-paste";
    HistoryOperationType["CanvasDelete"] = "canvas-delete";
})(HistoryOperationType || (HistoryOperationType = {}));
export const createSelectionSnapshot = (target) => ({
    currentTaskId: target.currentTaskId,
    currentConnectionId: target.currentConnectionId,
    connectionParentTaskId: target.connectionParentTaskId,
});
export const createDepthFilterSnapshot = (viewSettings) => ({
    depthFilterEnabled: viewSettings.depthFilterEnabled,
    depthBaseTaskId: viewSettings.depthBaseTaskId,
    maxDepth: viewSettings.maxDepth,
});
export const createViewSettingsSnapshot = (viewSettings) => ({
    searchText: viewSettings.searchText,
    statusFilter: viewSettings.statusFilter,
    ...createDepthFilterSnapshot(viewSettings),
});
export const createCanvasContextSnapshot = (target) => ({
    currentCanvasId: target.state.currentCanvasId,
    selection: createSelectionSnapshot(target),
    viewSettings: createViewSettingsSnapshot(target.state.viewSettings),
});
//# sourceMappingURL=history-types.js.map