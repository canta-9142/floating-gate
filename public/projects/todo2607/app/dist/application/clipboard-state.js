import { isTaskStatus } from "../domain/enums.js";
export class ClipboardState {
    sourceTaskId = null;
    sourceCanvasId = null;
    title = null;
    description = null;
    status = null;
    x = null;
    y = null;
    clear() {
        this.sourceTaskId = null;
        this.sourceCanvasId = null;
        this.title = null;
        this.description = null;
        this.status = null;
        this.x = null;
        this.y = null;
    }
    get hasTask() {
        return this.taskSnapshot !== null;
    }
    get taskSnapshot() {
        if (this.sourceTaskId === null
            || this.sourceCanvasId === null
            || this.title === null
            || this.description === null
            || !isTaskStatus(this.status)
            || this.x === null
            || this.y === null
            || !Number.isFinite(this.x)
            || !Number.isFinite(this.y))
            return null;
        return {
            sourceTaskId: this.sourceTaskId,
            sourceCanvasId: this.sourceCanvasId,
            title: this.title,
            description: this.description,
            status: this.status,
            x: this.x,
            y: this.y,
        };
    }
}
//# sourceMappingURL=clipboard-state.js.map