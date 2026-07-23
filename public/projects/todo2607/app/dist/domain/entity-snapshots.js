import { Canvas } from "./canvas.js";
import { Connection } from "./connection.js";
import { Task } from "./task.js";
export const createTaskSnapshot = (task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    x: task.x,
    y: task.y,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
});
export const createConnectionSnapshot = (connection) => ({
    id: connection.id,
    parentTaskId: connection.parentTaskId,
    childTaskId: connection.childTaskId,
    createdAt: connection.createdAt,
});
export const createCanvasSnapshot = (canvas) => ({
    id: canvas.id,
    title: canvas.title,
    tasks: canvas.tasks.map(createTaskSnapshot),
    connections: canvas.connections.map(createConnectionSnapshot),
    x: canvas.x,
    y: canvas.y,
    createdAt: canvas.createdAt,
    updatedAt: canvas.updatedAt,
});
export const applyTaskSnapshot = (task, snapshot) => Object.assign(task, {
    id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    status: snapshot.status,
    x: snapshot.x,
    y: snapshot.y,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
});
export const restoreTaskSnapshot = (snapshot) => applyTaskSnapshot(new Task(snapshot.id), snapshot);
export const restoreConnectionSnapshot = (snapshot) => Object.assign(new Connection(snapshot.id, snapshot.parentTaskId, snapshot.childTaskId), { createdAt: snapshot.createdAt });
export const restoreCanvasSnapshot = (snapshot) => Object.assign(new Canvas(snapshot.id, snapshot.title, snapshot.x, snapshot.y), {
    tasks: snapshot.tasks.map(restoreTaskSnapshot),
    connections: snapshot.connections.map(restoreConnectionSnapshot),
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
});
//# sourceMappingURL=entity-snapshots.js.map