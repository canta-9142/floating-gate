export class Connection {
    id;
    parentTaskId;
    childTaskId;
    createdAt;
    constructor(id, parentTaskId, childTaskId) {
        this.id = id;
        this.parentTaskId = parentTaskId;
        this.childTaskId = childTaskId;
        this.createdAt = new Date().toISOString();
    }
}
//# sourceMappingURL=connection.js.map