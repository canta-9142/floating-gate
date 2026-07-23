import { ViewSettings } from "../domain/view-settings.js";
export const APP_STATE_VERSION = "1";
export class AppState {
    version;
    canvases;
    currentCanvasId;
    viewSettings;
    constructor(version = APP_STATE_VERSION, canvases = [], currentCanvasId = null, viewSettings = new ViewSettings()) {
        this.version = version;
        this.canvases = canvases;
        this.currentCanvasId = currentCanvasId;
        this.viewSettings = viewSettings;
    }
}
//# sourceMappingURL=app-state.js.map