import { NavigationNative, ReactNative } from "@metro/common";
import { withTimeout } from "@lib/utils/asyncTimeout";
import { findByPropsLazy } from "@metro/wrappers";
import { ErrorBoundary } from "@ui/components";
import { RowConfig } from "@ui/settings";

const tabsNavigationRef = findByPropsLazy("getRootNavigationRef");

export const CustomPageRenderer = React.memo(() => {
    const navigation = NavigationNative.useNavigation();
    const route = NavigationNative.useRoute();

    const { render: PageComponent, ...args } = route?.params ?? {};

    React.useEffect(() => { navigation?.setOptions?.({ ...args }); }, [navigation, args.title]);

    if (!PageComponent) {
        return <ReactNative.View style={{ padding: 24 }}>
            <ReactNative.Text style={{ color: "#b5bac1" }}>This CloudCord page did not receive its navigation details. Go back and open it again from CloudCord settings.</ReactNative.Text>
        </ReactNative.View>;
    }

    return <ErrorBoundary><PageComponent /></ErrorBoundary>;
});

export function wrapOnPress(
    onPress: (() => unknown) | undefined,
    navigation?: any,
    renderPromise?: RowConfig["render"],
    screenOptions?: string | Record<string, any>,
    props?: any,
    navigationMethod: "navigate" | "push" = "navigate",
) {
    let pending = false;
    return async () => {
        if (pending) return;
        pending = true;
        try {
            if (onPress) return void await withTimeout(Promise.resolve().then(onPress));

            if (typeof renderPromise !== "function") return;

            const Component = await withTimeout(Promise.resolve().then(() => renderPromise()).then(m => m.default));
            if (!Component) throw new Error("This page is unavailable in this build. Update CloudCord and try again.");
            if (navigation?.isFocused && !navigation.isFocused()) return;

            if (typeof screenOptions === "string") {
                screenOptions = { title: screenOptions };
            }

            navigation ??= tabsNavigationRef.getRootNavigationRef();
            if (typeof navigation?.[navigationMethod] !== "function") throw new Error("Discord's navigation is still loading. Go back and try again.");
            navigation[navigationMethod]("PUPU_CUSTOM_PAGE", {
                ...screenOptions,
                render: () => <Component {...props} />
            });
        } catch (error) {
            ReactNative.Alert.alert("Couldn't open CloudCord page", error instanceof Error ? error.message : "Loading failed. Check your connection and try again.", [
                { text: "Close", style: "cancel" },
                { text: "Retry", onPress: () => { void wrapOnPress(onPress, navigation, renderPromise, screenOptions, props, navigationMethod)(); } }
            ]);
        } finally { pending = false; }
    };
}

