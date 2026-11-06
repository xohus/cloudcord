import { colorsPref } from "@lib/addons/themes/colors/preferences";
import { getThemeColors, subscribeThemeColors } from "@lib/addons/themes/colors/updater";
import { after } from "@lib/api/patcher";
import { deleteJsxCreate, onJsxCreate } from "@lib/api/react/jsx";
import { useObservable } from "@lib/api/storage";
import { logger } from "@lib/utils/logger";
import { findByDisplayName, findByFilePathLazy } from "@metro";
import { React } from "@metro/common";
import { getLazyContext } from "@metro/lazy";
import chroma from "chroma-js";
import { Image, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const Messages = findByFilePathLazy("modules/messages/native/Messages.tsx", true);
const styles = StyleSheet.create({ container: { flex: 1 }, image: StyleSheet.absoluteFillObject });

function tintMessageSurface(node: React.ReactNode, opacity: number, direct = false, depth = 0): React.ReactNode {
    if (depth >= 16) return node;
    if (Array.isArray(node)) {
        const children = node.map(child => tintMessageSurface(child, opacity, false, depth + 1));
        return children.some((child, i) => child !== node[i]) ? children : node;
    }
    if (!React.isValidElement<{ children?: React.ReactNode; style?: StyleProp<ViewStyle>; }>(node)) return node;

    const { children, style } = node.props;
    if (direct || ("HACK_fixModalInteraction" in node.props && "onTapReaction" in node.props)) {
        const nativeColor = StyleSheet.flatten(style)?.backgroundColor;
        const tint = typeof nativeColor === "string" && chroma.valid(nativeColor) ? nativeColor : "black";
        const backgroundColor = chroma(tint).alpha(1 - opacity).hex();
        return React.cloneElement(node, { style: [style, { backgroundColor }] });
    }

    const updated = tintMessageSurface(children, opacity, false, depth + 1);
    return updated === children ? node : React.cloneElement(node, { children: updated });
}

function ThemeBackground({ children, direct }: { children: React.ReactNode; direct?: boolean; }) {
    useObservable([colorsPref]);
    const theme = React.useSyncExternalStore(subscribeThemeColors, getThemeColors);
    const background = colorsPref.customBackground !== "hidden" ? theme?.background : undefined;
    const opacity = typeof background?.opacity === "number" && Number.isFinite(background.opacity)
        ? Math.min(1, Math.max(0, background.opacity))
        : 1;
    const content = background?.url ? tintMessageSurface(children, opacity, direct) : children;

    return <View style={styles.container}>
        {background?.url && content !== children && <View pointerEvents="none" style={styles.image}>
            <Image
                accessible={false}
                source={{ uri: background.url }}
                style={styles.image}
                resizeMode="cover"
                blurRadius={typeof background.blur === "number" ? background.blur : undefined}
            />
        </View>}
        <React.Fragment key="messages">{content}</React.Fragment>
    </View>;
}

export default function patchChatBackground() {
    let unpatch: (() => void) | undefined;

    // Recent Android builds use a function component for the native message
    // renderer. Earlier builds expose MessagesConnected as a forward ref.
    function wrapRenderer(_: unknown, element: React.ReactElement) {
        return unpatch ? element : <ThemeBackground key={element.key} direct>{element}</ThemeBackground>;
    }
    onJsxCreate("MessagesRenderer", wrapRenderer);

    function attach(component: any) {
        const target = typeof component?.prototype?.render === "function" ? component.prototype : component;
        if (typeof target?.render !== "function") return;
        unpatch = after("render", target, (_, content) => (
            React.isValidElement(content) ? <ThemeBackground>{content}</ThemeBackground> : content
        ));
    }

    function fallback(error: unknown) {
        try {
            attach(findByDisplayName("MessagesConnected"));
        } catch {
            logger.warn("CloudCord could not attach the chat background", error);
        }
    }

    let cancel: (() => void) | undefined;
    try {
        cancel = getLazyContext(Messages)?.getExports(component => {
            try {
                attach(component);
            } catch (error) {
                fallback(error);
            }
        });
    } catch (error) {
        fallback(error);
    }
    return () => {
        cancel?.();
        unpatch?.();
        deleteJsxCreate("MessagesRenderer", wrapRenderer);
    };
}
