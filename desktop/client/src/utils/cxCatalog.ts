import boldText from "../../../../examples/cx/catalog/plugins/bold-text.cx";
import calculator from "../../../../examples/cx/catalog/plugins/calculator.cx";
import clapText from "../../../../examples/cx/catalog/plugins/clap-text.cx";
import leetText from "../../../../examples/cx/catalog/plugins/leet-text.cx";
import reverseText from "../../../../examples/cx/catalog/plugins/reverse-text.cx";
import spaceOut from "../../../../examples/cx/catalog/plugins/space-out.cx";
import starify from "../../../../examples/cx/catalog/plugins/starify.cx";
import unitConverter from "../../../../examples/cx/catalog/plugins/unit-converter.cx";
import blueHour from "../../../../examples/cx/catalog/themes/blue-hour.cx";
import midnight from "../../../../examples/cx/midnight.cx";
import counter from "../../../../examples/cx/pilot/character-counter.cx";
import talkInReverse from "../../../../examples/cx/catalog/plugins/talk-in-reverse.cx";
import writeUpperCase from "../../../../examples/cx/catalog/plugins/write-upper-case.cx";
import unindent from "../../../../examples/cx/catalog/plugins/unindent.cx";
import normalizeMessageLinks from "../../../../examples/cx/catalog/plugins/normalize-message-links.cx";

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
        { name: "Calculator", source: calculator },
        { name: "UnitConverter", source: unitConverter },
        { name: "TalkInReverse", source: talkInReverse },
        { name: "WriteUpperCase", source: writeUpperCase },
        { name: "Unindent", source: unindent },
        { name: "NormalizeMessageLinks", source: normalizeMessageLinks },
    ],
    themes: [
        { name: "Blue Hour", source: blueHour },
        { name: "Midnight", source: midnight },
    ],
};
