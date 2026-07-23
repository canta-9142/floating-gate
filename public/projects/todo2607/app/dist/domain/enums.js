export const AppMode = {
    NORMAL: "normal",
    EDIT: "edit",
    CONNECT: "connect",
};
export const TaskStatus = {
    NOTSTARTED: "not_started",
    INPROGRESS: "in_progress",
    COMPLETED: "completed",
};
export const isTaskStatus = (value) => value === TaskStatus.NOTSTARTED
    || value === TaskStatus.INPROGRESS
    || value === TaskStatus.COMPLETED;
//# sourceMappingURL=enums.js.map