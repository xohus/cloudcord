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
const styles = StyleSheet.create({
    container: { flex: 1 },
    imageLayer: StyleSheet.absoluteFillObject,
    image: { width: "100%", height: "100%" },
});

function tintMessageSurface(node: React.ReactNode, opacity: number, fallback: string, direct = false, depth = 0): React.ReactNode {
    if (depth >= 16) return node;
    if (Array.isArray(node)) {
        const children = node.map(child => tintMessageSurface(child, opacity, fallback, false, depth + 1));
        return children.some((child, i) => child !== node[i]) ? children : node;
    }
    if (!React.isValidElement<{ children?: React.ReactNode; style?: StyleProp<ViewStyle>; }>(node)) return node;

    const { children, style } = node.props;
    if (direct || ("HACK_fixModalInteraction" in node.props && "onTapReaction" in node.props)) {
        const nativeColor = StyleSheet.flatten(style)?.backgroundColor;
        const tint = typeof nativeColor === "string" && chroma.valid(nativeColor) ? nativeColor : fallback;
        const backgroundColor = chroma(tint).alpha(1 - opacity).hex();
        return React.cloneElement(node, { style: [style, { backgroundColor }] });
    }

    const updated = tintMessageSurface(children, opacity, fallback, false, depth + 1);
    return updated === children ? node : React.cloneElement(node, { children: updated });
}

function ThemeBackground({ children, direct }: { children: React.ReactNode; direct?: boolean; }) {
    useObservable([colorsPref]);
    const theme = React.useSyncExternalStore(subscribeThemeColors, getThemeColors);
    const background = colorsPref.customBackground !== "hidden" ? theme?.background : undefined;
    const opacity = typeof background?.opacity === "number" && Number.isFinite(background.opacity)
        ? Math.min(1, Math.max(0, background.opacity))
        : 1;
    const url = opacity > 0 ? background?.url : undefined;
    const blur = background?.blur;
    const request = React.useMemo(() => ({ url }), [url]);
    const current = React.useRef<typeof request | null>(request);
    const [loaded, setLoaded] = React.useState<typeof request | null>(null);
    React.useLayoutEffect(() => {
        current.current = request;
        return () => { current.current = null; };
    }, [request]);
    const color = theme?.semantic.BACKGROUND_PRIMARY?.value;
    const tint = typeof color === "string" && chroma.valid(color) ? color : "black";
    const content = url && loaded === request ? tintMessageSurface(children, opacity, tint, direct) : children;

    return <View style={styles.container}>
        {url && <View pointerEvents="none" style={styles.imageLayer}>
            <Image
                key={url}
                accessible={false}
                source={{ uri: url }}
                style={styles.image}
                resizeMode="cover"
                blurRadius={typeof blur === "number" ? blur : undefined}
                onLoad={() => { if (current.current === request) setLoaded(request); }}
                onError={() => { if (current.current === request) setLoaded(null); }}
            />
        </View>}
        <React.Fragment key="messages">{content}</React.Fragment>
    </View>;
}

export default function patchChatBackground() {
    let active = true;
    let unpatch: (() => void) | undefined;

    // Recent Android builds use a function component for the native message
    // renderer. Earlier builds expose MessagesConnected as a forward ref.
    function wrapRenderer(_: unknown, element: React.ReactElement) {
        return !active || unpatch ? element : <ThemeBackground key={element.key} direct>{element}</ThemeBackground>;
    }
    onJsxCreate("MessagesRenderer", wrapRenderer);

    function attach(exports: any) {
        if (!active || unpatch) return true;
        const component = exports?.default ?? exports;
        const renderer = component?.type ?? component;
        const target = typeof renderer?.prototype?.render === "function" ? renderer.prototype : renderer;
        if (typeof target?.render !== "function") return false;
        unpatch = after("render", target, (_, content) => (
            active && React.isValidElement(content) ? <ThemeBackground>{content}</ThemeBackground> : content
        ));
        return true;
    }

    function fallback(error?: unknown) {
        if (!active) return;
        try {
            attach(findByDisplayName("MessagesConnected"));
        } catch (fallbackError) {
            logger.warn("CloudCord could not attach the chat background", error ?? fallbackError);
        }
    }

    let cancel: (() => void) | undefined;
    try {
        const lazy = getLazyContext(Messages);
        if (lazy) {
            cancel = lazy.getExports(component => {
                try {
                    if (!attach(component)) fallback();
                } catch (error) {
                    fallback(error);
                }
            });
        } else fallback();
    } catch (error) {
        fallback(error);
    }
    return () => {
        active = false;
        cancel?.();
        unpatch?.();
        deleteJsxCreate("MessagesRenderer", wrapRenderer);
    };
}
