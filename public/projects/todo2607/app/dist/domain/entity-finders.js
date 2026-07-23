export const findCanvasById = (canvases, canvasId) => {
    if (canvasId === null)
        return undefined;
    return canvases.find(canvas => canvas.id === canvasId);
};
export const findCanvasByTaskId = (canvases, taskId) => {
    return canvases.find(canvas => canvas.tasks.some(task => task.id === taskId));
};
export const findCanvasByConnectionId = (canvases, connectionId) => {
    return canvases.find(canvas => canvas.connections.some(connection => connection.id === connectionId));
};
export function findTaskById(source, taskId) {
    for (const item of source) {
        if ("tasks" in item) {
            const task = item.tasks.find(candidate => candidate.id === taskId);
            if (task)
                return task;
        }
        else if (item.id === taskId) {
            return item;
        }
    }
    return undefined;
}
//# sourceMappingURL=entity-finders.js.map