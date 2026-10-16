import { NavigationNative, ReactNative } from "@metro/common";
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
) {
    return async () => {
        if (onPress) return void onPress();

        if (typeof renderPromise !== "function") return;

        const Component = await renderPromise().then(m => m.default);
        if (!Component) return;

        if (typeof screenOptions === "string") {
            screenOptions = { title: screenOptions };
        }

        navigation ??= tabsNavigationRef.getRootNavigationRef();
        navigation.navigate("PUPU_CUSTOM_PAGE", {
            ...screenOptions,
            render: () => <Component {...props} />
        });
    };
}

