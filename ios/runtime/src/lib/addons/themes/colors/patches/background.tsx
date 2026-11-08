import { useProxy } from "@core/vendetta/storage";
import { colorsPref } from "@lib/addons/themes/colors/preferences";
import { getThemeColors, subscribeThemeColors } from "@lib/addons/themes/colors/updater";
import { after } from "@lib/api/patcher";
import { deleteJsxCreate, onJsxCreate } from "@lib/api/react/jsx";
import { settings } from "@lib/api/settings";
import { useObservable } from "@lib/api/storage";
import { logger } from "@lib/utils/logger";
import { findByDisplayName, findByFilePathLazy } from "@metro";
import { React } from "@metro/common";
import { getLazyContext } from "@metro/lazy";
import chroma from "chroma-js";
import { Image, Platform, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const Messages = findByFilePathLazy("modules/messages/native/Messages.tsx", true);
const MessagesRenderer = findByFilePathLazy("modules/messages/native/MessagesRenderer.tsx", true);
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
    const { safeMode } = useProxy(settings);
    const theme = React.useSyncExternalStore(subscribeThemeColors, getThemeColors);
    const background = !safeMode?.enabled && colorsPref.customBackground !== "hidden" ? theme?.background : undefined;
    const opacity = typeof background?.opacity === "number" && Number.isFinite(background.opacity)
        ? Math.min(1, Math.max(0, background.opacity))
        : 1;
    const url = opacity > 0 ? background?.url : undefined;
    const blur = background?.blur;
    const request = React.useMemo(() => ({ source: url ? { uri: url } : undefined }), [url]);
    const current = React.useRef<typeof request | null>(request);
    const [loaded, setLoaded] = React.useState<typeof request | null>(null);
    React.useLayoutEffect(() => {
        current.current = request;
        return () => { current.current = null; };
    }, [request]);
    const color = theme?.semantic?.BACKGROUND_PRIMARY?.value;
    const tint = typeof color === "string" && chroma.valid(color) ? color : "black";
    const content = url && loaded === request ? tintMessageSurface(children, opacity, tint, direct) : children;

    return <View style={styles.container}>
        {request.source && <View pointerEvents="none" style={[styles.imageLayer, { backgroundColor: tint }]}>
            <Image
                key={url}
                accessible={false}
                source={request.source}
                style={styles.image}
                resizeMode="cover"
                resizeMethod={Platform.OS === "android" && request.source.uri.startsWith("data:image/") ? "resize" : undefined}
                blurRadius={typeof blur === "number" ? blur : undefined}
                onLoad={() => { if (current.current === request) setLoaded(request); }}
                onError={() => { if (current.current === request) setLoaded(null); }}
            />
        </View>}
        <React.Fragment key="messages">{content}</React.Fragment>
    </View>;
}

export function mapChatBackgroundRenderer(element: JSX.Element, map: (renderer: JSX.Element) => JSX.Element) {
    if (element.type !== ThemeBackground) return map(element);
    const { children, direct } = element.props;
    if (!direct || !React.isValidElement(children)) return element;
    const renderer = map(children);
    return renderer === children ? element : React.cloneElement(element, { children: renderer });
}

export default function patchChatBackground() {
    let active = true;
    let modernSeen = false;
    let unpatch: (() => void) | undefined;
    let exactRenderer: object | undefined;

    // Recent Android builds use a function component for the native message
    // renderer. iOS exposes a memoized forward ref with displayName "Messages".
    function wrapRenderer(_: unknown, element: React.ReactElement) {
        if (!active || element.type === ThemeBackground) return element;
        modernSeen = true;
        unpatch?.();
        unpatch = undefined;
        return <ThemeBackground key={element.key} direct>{element}</ThemeBackground>;
    }
    onJsxCreate("MessagesRenderer", wrapRenderer);
    function wrapMessagesDisplayName(_: unknown, element: React.ReactElement<{ channelId?: string; style?: StyleProp<ViewStyle>; }>) {
        const component = element.type as { $$typeof?: symbol; type?: { $$typeof?: symbol; name?: string; }; name?: string; };
        const inner = component.$$typeof === Symbol.for("react.memo") ? component.type : component;
        if (typeof inner === "function") return inner.name === "MessagesRenderer" ? wrapRenderer(null, element) : element;
        if (!active || inner?.$$typeof !== Symbol.for("react.forward_ref")
            || typeof element.props.channelId !== "string" || !("style" in element.props)) return element;
        return wrapRenderer(null, element);
    }
    onJsxCreate("Messages", wrapMessagesDisplayName);

    function attach(exports: any) {
        if (!active || modernSeen || unpatch) return true;
        const component = exports?.default ?? exports;
        const renderer = component?.type ?? component;
        const target = typeof renderer?.prototype?.render === "function" ? renderer.prototype : renderer;
        if (typeof target?.render !== "function") return false;
        unpatch = after("render", target, (_, content) => (
            active && !modernSeen && React.isValidElement(content) ? <ThemeBackground>{content}</ThemeBackground> : content
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

    let cancelRenderer: (() => void) | undefined;
    try {
        cancelRenderer = getLazyContext(MessagesRenderer)?.getExports(exports => {
            if (!active || exactRenderer) return;
            const renderer = exports?.default ?? exports;
            if (typeof renderer !== "function" && renderer?.$$typeof !== Symbol.for("react.memo")
                && renderer?.$$typeof !== Symbol.for("react.forward_ref")) return;
            exactRenderer = renderer;
            onJsxCreate(renderer, wrapRenderer);
        });
    } catch { /* Component names and the legacy render patch still provide fallback routes. */ }

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
        cancelRenderer?.();
        cancel?.();
        unpatch?.();
        deleteJsxCreate("MessagesRenderer", wrapRenderer);
        deleteJsxCreate("Messages", wrapMessagesDisplayName);
        if (exactRenderer) deleteJsxCreate(exactRenderer, wrapRenderer);
    };
}
