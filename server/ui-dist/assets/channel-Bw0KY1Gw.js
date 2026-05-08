import { U as Utils, C as Color } from './mermaid.core-DLfojo-Y.js';

/* IMPORT */
/* MAIN */
const channel = (color, channel) => {
    return Utils.lang.round(Color.parse(color)[channel]);
};

export { channel as c };
