import { TaskStatus } from "./enums.js";
export class Task {
    id;
    title;
    description;
    status;
    x;
    y;
    createdAt;
    updatedAt;
    constructor(id, title = "", description = "", status = TaskStatus.NOTSTARTED, x = 0, y = 0) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.x = x;
        this.y = y;
        const now = new Date().toISOString();
        this.createdAt = now;
        this.updatedAt = now;
    }
    updateDetails = (title, description, status) => {
        if (this.title === title && this.description === description && this.status === status) {
            return false;
        }
        this.title = title;
        this.description = description;
        this.status = status;
        this.updateTimestamp();
        return true;
    };
    updatePosition = (x, y) => {
        if (this.x === x && this.y === y)
            return false;
        this.x = x;
        this.y = y;
        this.updateTimestamp();
        return true;
    };
    updateTimestamp = () => {
        this.updatedAt = new Date().toISOString();
    };
}
//# sourceMappingURL=task.js.map