import { AppMode, isTaskStatus, TaskStatus } from "../domain/enums.js";
import { Task } from "../domain/task.js";
import { Connection } from "../domain/connection.js";
import { Canvas } from "../domain/canvas.js";
import { ViewSettings } from "../domain/view-settings.js";
import { findCanvasByConnectionId, findCanvasById, findCanvasByTaskId, findTaskById, } from "../domain/entity-finders.js";
import { AppState } from "./app-state.js";
import { ClipboardState } from "./clipboard-state.js";
import { FilterService, } from "../services/filter-service.js";
import { LocalStorageService, } from "../services/local-storage-service.js";
import { createCanvasContextSnapshot, createCanvasSnapshot, createConnectionSnapshot, createDepthFilterSnapshot, createSelectionSnapshot, createTaskSnapshot, createViewSettingsSnapshot, HistoryManager, HistoryOperationType, } from "../history/history-manager.js";
export { AppState } from "./app-state.js";
export class Application {
    mode = AppMode.NORMAL;
    state = new AppState();
    currentTaskId = null;
    currentConnectionId = null;
    connectionParentTaskId = null;
    clipboardState = new ClipboardState();
    historyManager = new HistoryManager();
    isDirty = false;
    savedStateSignature = this.stateSignature();
    pendingTaskMove = null;
    generateId(type) {
        const timestamp = new Date().toISOString().replace(/\D/g, "");
        const randomPart = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12)
            ?? Math.random().toString(36).slice(2, 14).padEnd(12, "0");
        return `${type}-${timestamp}-${randomPart}`;
    }
    // Public methods
    setMode = (mode) => {
        this.mode = mode;
        if (mode !== AppMode.CONNECT) {
            this.connectionParentTaskId = null;
        }
    };
    getCurrentCanvas = () => {
        return findCanvasById(this.state.canvases, this.state.currentCanvasId);
    };
    getTask = (taskId) => {
        return findTaskById(this.state.canvases, taskId);
    };
    getVisibleItems = () => {
        const canvas = this.getCurrentCanvas();
        if (!canvas) {
            return { tasks: [], connections: [] };
        }
        const settings = this.state.viewSettings;
        return FilterService.apply({
            tasks: canvas.tasks,
            connections: canvas.connections,
        }, {
            keyword: settings.searchText,
            status: settings.statusFilter,
            depth: settings.depthFilterEnabled
                && settings.depthBaseTaskId !== null
                && settings.maxDepth !== null
                ? {
                    baseTaskId: settings.depthBaseTaskId,
                    maxDepth: settings.maxDepth,
                }
                : null,
        });
    };
    // Canvas manipulation
    createCanvas = (title = "新規キャンバス") => {
        const normalizedTitle = title.trim() || "新規キャンバス";
        const canvas = new Canvas(this.generateId("canvas"), normalizedTitle);
        this.state.canvases.push(canvas);
        this.state.currentCanvasId = canvas.id;
        this.currentTaskId = null;
        this.currentConnectionId = null;
        this.connectionParentTaskId = null;
        this.mode = AppMode.NORMAL;
        this.resetDepthFilter();
        this.updateDirtyState();
    };
    removeCanvas = (canvasId) => {
        const index = this.state.canvases.findIndex(canvas => canvas.id === canvasId);
        if (index < 0)
            return false;
        const canvas = this.state.canvases[index];
        if (!canvas)
            return false;
        const previousCanvasContext = createCanvasContextSnapshot(this);
        const canvasSnapshot = createCanvasSnapshot(canvas);
        const removedTaskIds = new Set(canvas.tasks.map(task => task.id));
        const removedConnectionIds = new Set(canvas.connections.map(connection => connection.id));
        this.state.canvases.splice(index, 1);
        if (this.state.currentCanvasId === canvasId) {
            this.state.currentCanvasId = this.state.canvases[index]?.id
                ?? this.state.canvases[index - 1]?.id
                ?? null;
        }
        if (this.currentTaskId && removedTaskIds.has(this.currentTaskId))
            this.currentTaskId = null;
        if (this.currentConnectionId && removedConnectionIds.has(this.currentConnectionId)) {
            this.currentConnectionId = null;
        }
        if (this.connectionParentTaskId && removedTaskIds.has(this.connectionParentTaskId)) {
            this.connectionParentTaskId = null;
        }
        this.mode = AppMode.NORMAL;
        if (this.state.viewSettings.depthBaseTaskId
            && removedTaskIds.has(this.state.viewSettings.depthBaseTaskId)) {
            this.state.viewSettings.depthFilterEnabled = false;
            this.state.viewSettings.depthBaseTaskId = null;
        }
        if (this.state.canvases.length === 0) {
            this.state.viewSettings.reset();
        }
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.CanvasDelete,
            canvasId,
            targetId: canvasId,
            canvas: { value: canvasSnapshot, index },
            context: {
                before: previousCanvasContext,
                after: createCanvasContextSnapshot(this),
            },
        });
        return true;
    };
    updateCanvasTitle = (canvasId, title) => {
        const canvas = findCanvasById(this.state.canvases, canvasId);
        const normalizedTitle = title.trim();
        if (!canvas || !normalizedTitle)
            return false;
        if (canvas.updateTitle(normalizedTitle))
            this.updateDirtyState();
        return true;
    };
    updateCanvasPosition = (canvasId, x, y, deferDirtyState = false) => {
        const canvas = findCanvasById(this.state.canvases, canvasId);
        if (!canvas || !Number.isFinite(x) || !Number.isFinite(y))
            return false;
        canvas.updatePosition(x, y);
        if (!deferDirtyState)
            this.updateDirtyState();
        return true;
    };
    changeCanvas = (canvasId) => {
        if (this.mode !== AppMode.NORMAL)
            return false;
        const destination = findCanvasById(this.state.canvases, canvasId);
        if (!destination)
            return false;
        const nextViewSettings = Object.assign(new ViewSettings(), this.state.viewSettings);
        if (nextViewSettings.depthBaseTaskId !== null
            && !destination.tasks.some(task => task.id === nextViewSettings.depthBaseTaskId)) {
            this.resetDepthFilter(nextViewSettings);
        }
        const nextState = new AppState(this.state.version, this.state.canvases, destination.id, nextViewSettings);
        if (!LocalStorageService.save(nextState))
            return false;
        this.state.currentCanvasId = destination.id;
        this.state.viewSettings = nextViewSettings;
        this.currentTaskId = null;
        this.currentConnectionId = null;
        this.connectionParentTaskId = null;
        this.mode = AppMode.NORMAL;
        this.rememberSavedState();
        return true;
    };
    // Tasks manipulation
    createTaskAt = (title, description, status, x, y) => {
        const canvas = findCanvasById(this.state.canvases, this.state.currentCanvasId);
        const normalizedTitle = title.trim();
        if (!canvas
            || !normalizedTitle
            || !isTaskStatus(status)
            || !Number.isFinite(x)
            || !Number.isFinite(y))
            return null;
        const previousSelection = createSelectionSnapshot(this);
        const previousViewSettings = createViewSettingsSnapshot(this.state.viewSettings);
        const task = new Task(this.generateId("task"), normalizedTitle, description, status, x, y);
        canvas.tasks.push(task);
        this.resetFilters();
        this.currentTaskId = task.id;
        this.currentConnectionId = null;
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.TaskCreate,
            canvasId: canvas.id,
            targetId: task.id,
            task: { value: createTaskSnapshot(task), index: canvas.tasks.length - 1 },
            selection: {
                before: previousSelection,
                after: createSelectionSnapshot(this),
            },
            viewSettings: {
                before: previousViewSettings,
                after: createViewSettingsSnapshot(this.state.viewSettings),
            },
        });
        return task.id;
    };
    updateTask = (taskId, title, description, status) => {
        const normalizedTitle = title.trim();
        return normalizedTitle && isTaskStatus(status)
            ? this.mutateTask(taskId, HistoryOperationType.TaskEdit, task => task.updateDetails(normalizedTitle, description, status))
            : false;
    };
    updateTaskPosition = (taskId, x, y) => {
        const isActiveMove = this.pendingTaskMove?.taskId === taskId;
        return Number.isFinite(x) && Number.isFinite(y)
            ? this.mutateTask(taskId, HistoryOperationType.TaskMove, task => task.updatePosition(x, y), !isActiveMove, isActiveMove)
            : false;
    };
    beginTaskMove = (taskId) => {
        const canvas = findCanvasByTaskId(this.state.canvases, taskId);
        const task = canvas?.tasks.find(candidate => candidate.id === taskId);
        if (!canvas || !task)
            return false;
        this.pendingTaskMove = {
            canvasId: canvas.id,
            taskId,
            previousTask: createTaskSnapshot(task),
        };
        return true;
    };
    finishTaskMove = (taskId) => {
        const pending = this.pendingTaskMove;
        this.pendingTaskMove = null;
        if (!pending || pending.taskId !== taskId)
            return false;
        const canvas = findCanvasById(this.state.canvases, pending.canvasId);
        const task = canvas?.tasks.find(candidate => candidate.id === taskId);
        if (!canvas || !task)
            return false;
        this.updateDirtyState();
        if (pending.previousTask.x === task.x && pending.previousTask.y === task.y)
            return true;
        this.recordTaskChange(HistoryOperationType.TaskMove, canvas.id, pending.previousTask, task);
        return true;
    };
    removeTask = (taskId) => {
        const canvas = findCanvasByTaskId(this.state.canvases, taskId);
        if (!canvas)
            return false;
        const taskIndex = canvas.tasks.findIndex(task => task.id === taskId);
        const task = canvas.tasks[taskIndex];
        if (!task)
            return false;
        const previousSelection = createSelectionSnapshot(this);
        const previousDepthFilter = createDepthFilterSnapshot(this.state.viewSettings);
        const removedConnections = canvas.connections.flatMap((connection, index) => connection.parentTaskId === taskId || connection.childTaskId === taskId
            ? [{ connection: createConnectionSnapshot(connection), index }]
            : []);
        const removedConnectionIds = new Set(removedConnections.map(item => item.connection.id));
        canvas.tasks = canvas.tasks.filter(task => task.id !== taskId);
        canvas.connections = canvas.connections.filter(connection => connection.parentTaskId !== taskId && connection.childTaskId !== taskId);
        if (this.currentTaskId === taskId)
            this.currentTaskId = null;
        if (this.connectionParentTaskId === taskId)
            this.connectionParentTaskId = null;
        if (this.currentConnectionId && removedConnectionIds.has(this.currentConnectionId)) {
            this.currentConnectionId = null;
        }
        if (this.state.viewSettings.depthBaseTaskId === taskId) {
            this.state.viewSettings.depthFilterEnabled = false;
            this.state.viewSettings.depthBaseTaskId = null;
        }
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.TaskDelete,
            canvasId: canvas.id,
            targetId: taskId,
            task: { value: createTaskSnapshot(task), index: taskIndex },
            connections: removedConnections.map(item => ({
                value: item.connection,
                index: item.index,
            })),
            selection: {
                before: previousSelection,
                after: createSelectionSnapshot(this),
            },
            depthFilter: {
                before: previousDepthFilter,
                after: createDepthFilterSnapshot(this.state.viewSettings),
            },
        });
        return true;
    };
    createConnection = (parentTaskId, childTaskId) => {
        const canvas = findCanvasById(this.state.canvases, this.state.currentCanvasId);
        if (!canvas)
            return false;
        if (parentTaskId === childTaskId)
            return false;
        const visibleTaskIds = new Set(this.getVisibleItems().tasks.map(task => task.id));
        if (!visibleTaskIds.has(parentTaskId) || !visibleTaskIds.has(childTaskId))
            return false;
        const duplicated = canvas.connections.some(connection => connection.parentTaskId === parentTaskId && connection.childTaskId === childTaskId);
        if (duplicated)
            return false;
        const connection = new Connection(this.generateId("connection"), parentTaskId, childTaskId);
        canvas.connections.push(connection);
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.ConnectionCreate,
            canvasId: canvas.id,
            targetId: connection.id,
            connection: {
                value: createConnectionSnapshot(connection),
                index: canvas.connections.length - 1,
            },
        });
        return true;
    };
    removeConnection = (connectionId) => {
        const canvas = findCanvasByConnectionId(this.state.canvases, connectionId);
        if (!canvas)
            return false;
        const connectionIndex = canvas.connections.findIndex(connection => connection.id === connectionId);
        const connection = canvas.connections[connectionIndex];
        if (!connection)
            return false;
        const previousSelection = createSelectionSnapshot(this);
        canvas.connections = canvas.connections.filter(connection => connection.id !== connectionId);
        if (this.currentConnectionId === connectionId)
            this.currentConnectionId = null;
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.ConnectionDelete,
            canvasId: canvas.id,
            targetId: connectionId,
            connection: { value: createConnectionSnapshot(connection), index: connectionIndex },
            selection: {
                before: previousSelection,
                after: createSelectionSnapshot(this),
            },
        });
        return true;
    };
    copyTaskToClipboard = (taskId) => {
        const canvas = findCanvasByTaskId(this.state.canvases, taskId);
        const task = canvas?.tasks.find(candidate => candidate.id === taskId);
        if (!canvas || !task)
            return false;
        Object.assign(this.clipboardState, {
            sourceTaskId: task.id,
            sourceCanvasId: canvas.id,
            title: task.title,
            description: task.description,
            status: task.status,
            x: task.x,
            y: task.y,
        });
        return true;
    };
    pasteTask = (fallbackPosition = { x: 40, y: 40 }) => {
        const snapshot = this.clipboardState.taskSnapshot;
        if (!snapshot
            || !Number.isFinite(fallbackPosition.x)
            || !Number.isFinite(fallbackPosition.y))
            return false;
        const canvas = findCanvasById(this.state.canvases, this.state.currentCanvasId);
        if (!canvas)
            return false;
        const useCopiedPosition = snapshot.sourceCanvasId === canvas.id
            && canvas.tasks.some(task => task.id === snapshot.sourceTaskId);
        const previousSelection = createSelectionSnapshot(this);
        const newTask = new Task(this.generateId("task"), snapshot.title, snapshot.description, snapshot.status, useCopiedPosition ? snapshot.x + 24 : fallbackPosition.x, useCopiedPosition ? snapshot.y + 24 : fallbackPosition.y);
        canvas.tasks.push(newTask);
        this.currentTaskId = newTask.id;
        this.currentConnectionId = null;
        this.syncSelectionWithVisibleItems();
        this.updateDirtyState();
        this.historyManager.record({
            type: HistoryOperationType.TaskPaste,
            canvasId: canvas.id,
            targetId: newTask.id,
            task: { value: createTaskSnapshot(newTask), index: canvas.tasks.length - 1 },
            selection: {
                before: previousSelection,
                after: createSelectionSnapshot(this),
            },
        });
        return true;
    };
    // Undo and Redo
    undo = () => {
        this.pendingTaskMove = null;
        const succeeded = this.historyManager.undo(this);
        if (succeeded) {
            this.normalizeDepthFilterForCurrentCanvas();
            this.syncSelectionWithVisibleItems();
            this.updateDirtyState();
        }
        return succeeded;
    };
    redo = () => {
        this.pendingTaskMove = null;
        const succeeded = this.historyManager.redo(this);
        if (succeeded) {
            this.normalizeDepthFilterForCurrentCanvas();
            this.syncSelectionWithVisibleItems();
            this.updateDirtyState();
        }
        return succeeded;
    };
    // Searching and Filters
    updateSearchText = (searchText) => {
        if (!this.getCurrentCanvas())
            return false;
        this.state.viewSettings.searchText = searchText;
        this.afterFilterChange();
        return true;
    };
    updateStatusFilter = (status) => {
        if (!this.getCurrentCanvas())
            return false;
        if (status !== null && !isTaskStatus(status))
            return false;
        this.state.viewSettings.statusFilter = status;
        this.afterFilterChange();
        return true;
    };
    setDepthFilterBaseTask = (baseTaskId) => {
        const canvas = this.getCurrentCanvas();
        if (!canvas || !canvas.tasks.some(task => task.id === baseTaskId))
            return false;
        this.state.viewSettings.depthBaseTaskId = baseTaskId;
        this.afterFilterChange();
        return true;
    };
    setDepthFilter = (baseTaskId, maxDepth) => {
        const canvas = this.getCurrentCanvas();
        if (!canvas
            || baseTaskId === null
            || !Number.isInteger(maxDepth)
            || maxDepth < 0
            || !canvas.tasks.some(task => task.id === baseTaskId)) {
            return false;
        }
        this.state.viewSettings.depthFilterEnabled = true;
        this.state.viewSettings.depthBaseTaskId = baseTaskId;
        this.state.viewSettings.maxDepth = maxDepth;
        this.afterFilterChange();
        return true;
    };
    clearDepthFilter = () => {
        if (!this.getCurrentCanvas())
            return false;
        this.state.viewSettings.depthFilterEnabled = false;
        this.afterFilterChange();
        return true;
    };
    clearSearchText = () => {
        return this.updateSearchText("");
    };
    // Persistence
    save = () => {
        if (this.mode !== AppMode.NORMAL || !LocalStorageService.save(this.state))
            return false;
        this.rememberSavedState();
        return true;
    };
    restore = () => {
        if (this.mode !== AppMode.NORMAL) {
            return { success: false, state: null, errorMessage: "通常モードで復元してください" };
        }
        const result = LocalStorageService.load();
        if (!result.success || !result.state)
            return result;
        this.state = result.state;
        this.currentTaskId = null;
        this.currentConnectionId = null;
        this.connectionParentTaskId = null;
        this.pendingTaskMove = null;
        this.clipboardState.clear();
        this.historyManager.clear();
        this.rememberSavedState();
        return result;
    };
    mutateTask(taskId, type, mutate, recordHistory = true, deferDirtyState = false) {
        const canvas = findCanvasByTaskId(this.state.canvases, taskId);
        const task = canvas?.tasks.find(candidate => candidate.id === taskId);
        if (!canvas || !task)
            return false;
        const before = createTaskSnapshot(task);
        if (!mutate(task))
            return true;
        if (recordHistory) {
            this.historyManager.record({
                type,
                canvasId: canvas.id,
                targetId: task.id,
                task: { before, after: createTaskSnapshot(task) },
            });
        }
        if (type === HistoryOperationType.TaskEdit) {
            this.syncSelectionWithVisibleItems();
        }
        if (!deferDirtyState)
            this.updateDirtyState();
        return true;
    }
    recordTaskChange(type, canvasId, before, task) {
        this.historyManager.record({
            type,
            canvasId,
            targetId: task.id,
            task: { before, after: createTaskSnapshot(task) },
        });
    }
    afterFilterChange() {
        this.syncSelectionWithVisibleItems();
        this.updateDirtyState();
    }
    syncSelectionWithVisibleItems() {
        const visible = this.getVisibleItems();
        const visibleTaskIds = new Set(visible.tasks.map(task => task.id));
        const visibleConnectionIds = new Set(visible.connections.map(connection => connection.id));
        if (this.currentTaskId && !visibleTaskIds.has(this.currentTaskId)) {
            this.currentTaskId = null;
        }
        if (this.currentConnectionId && !visibleConnectionIds.has(this.currentConnectionId)) {
            this.currentConnectionId = null;
        }
        if (this.connectionParentTaskId && !visibleTaskIds.has(this.connectionParentTaskId)) {
            this.connectionParentTaskId = null;
        }
    }
    resetFilters() {
        this.state.viewSettings.reset();
    }
    resetDepthFilter(settings = this.state.viewSettings) {
        settings.resetDepth();
    }
    normalizeDepthFilterForCurrentCanvas() {
        const settings = this.state.viewSettings;
        if (!settings.depthFilterEnabled)
            return;
        const canvas = this.getCurrentCanvas();
        if (!canvas
            || settings.depthBaseTaskId === null
            || settings.maxDepth === null
            || !Number.isInteger(settings.maxDepth)
            || settings.maxDepth < 0
            || !canvas.tasks.some(task => task.id === settings.depthBaseTaskId)) {
            this.resetDepthFilter(settings);
        }
    }
    stateSignature() {
        return JSON.stringify(this.state);
    }
    rememberSavedState() {
        this.savedStateSignature = this.stateSignature();
        this.isDirty = false;
    }
    updateDirtyState() {
        this.isDirty = this.stateSignature() !== this.savedStateSignature;
    }
}
//# sourceMappingURL=application.js.map