export class Canvas {
    id;
    title;
    tasks;
    connections;
    x;
    y;
    createdAt;
    updatedAt;
    constructor(id, title = "", x = 0, y = 0) {
        this.id = id;
        this.title = title;
        this.tasks = [];
        this.connections = [];
        this.x = x;
        this.y = y;
        const now = new Date().toISOString();
        this.createdAt = now;
        this.updatedAt = now;
    }
    updateTitle = (title) => {
        if (this.title === title)
            return false;
        this.title = title;
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
//# sourceMappingURL=canvas.js.map