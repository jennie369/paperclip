import { U as Utils, C as Color } from './mermaid.core-C_2SeKLZ.js';

/* IMPORT */
/* MAIN */
const channel = (color, channel) => {
    return Utils.lang.round(Color.parse(color)[channel]);
};

export { channel as c };
