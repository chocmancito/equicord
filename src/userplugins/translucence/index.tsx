import { disableStyle, enableStyle } from "@api/Styles";
import definePlugin from "@utils/types";

import { applyStyles, clearStyles, loadLocalImage, settings } from "./settings";
import style from "./style.css?managed";

export default definePlugin({
    name: "Translucence",
    description: "Tema Translucence con fondo (URL o archivo local), colores y apariencia editables",
    authors: [{ name: "v_vh", id: 0n }],
    settings,

    async start() {
        enableStyle(style);
        await loadLocalImage();
        applyStyles();
    },

    stop() {
        disableStyle(style);
        clearStyles();
    }
});
