export class ViewSettings {
    searchText = "";
    statusFilter = null;
    depthFilterEnabled = false;
    depthBaseTaskId = null;
    maxDepth = null;
    resetDepth() {
        this.depthFilterEnabled = false;
        this.depthBaseTaskId = null;
        this.maxDepth = null;
    }
    reset() {
        this.searchText = "";
        this.statusFilter = null;
        this.resetDepth();
    }
}
//# sourceMappingURL=view-settings.js.map