import boldText from "../../../../examples/cx/catalog/plugins/bold-text.cx";
import clapText from "../../../../examples/cx/catalog/plugins/clap-text.cx";
import leetText from "../../../../examples/cx/catalog/plugins/leet-text.cx";
import reverseText from "../../../../examples/cx/catalog/plugins/reverse-text.cx";
import spaceOut from "../../../../examples/cx/catalog/plugins/space-out.cx";
import starify from "../../../../examples/cx/catalog/plugins/starify.cx";
import blueHour from "../../../../examples/cx/catalog/themes/blue-hour.cx";
import midnight from "../../../../examples/cx/midnight.cx";
import counter from "../../../../examples/cx/pilot/character-counter.cx";

// The Endcord command ports are GPL-3.0-or-later, with their original source
// and attribution preserved in desktop/client/src/endcordplugins.
export const cxCatalog = {
    plugins: [
        { name: "CX Character Counter", source: counter },
        { name: "ReverseText", source: reverseText },
        { name: "SpaceOut", source: spaceOut },
        { name: "ClapText", source: clapText },
        { name: "LeetText", source: leetText },
        { name: "BoldText", source: boldText },
        { name: "Starify", source: starify },
    ],
    themes: [
        { name: "Blue Hour", source: blueHour },
        { name: "Midnight", source: midnight },
    ],
};
