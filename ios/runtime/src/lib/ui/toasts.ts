import { Strings } from "@core/i18n";
import { findAssetId } from "@lib/api/assets";
import { lazyDestructure } from "@lib/utils/lazy";
import { toasts } from "@metro/common";
import { findByProps } from "@metro/wrappers";
import { Alert, Platform, ToastAndroid } from "react-native";

const { uuid4 } = lazyDestructure(() => findByProps("uuid4"));

export const showToast = (content: string, asset?: number) => {
    // Discord 350's native toast container requires state that the legacy
    // action creator does not provide (useToastContainer: undefined.position).
    // Android's system toast keeps feedback independent of that React tree.
    if (Platform.OS === "android") {
        try {
            if (typeof ToastAndroid?.show === "function") {
                ToastAndroid.show(content, ToastAndroid.SHORT);
                return;
            }
        } catch { /* A native build without ToastAndroid can still show feedback. */ }
        Alert.alert("CloudCord", content);
        return;
    }
    return toasts.open({
    // ? In build 182205/44707, Discord changed their toasts, source is no longer used, rather icon, and a key is needed.
    // TODO: We could probably have the developer specify a key themselves, but this works to fix toasts
    key: `vd-toast-${uuid4()}`,
    content: content,
    source: asset,
    icon: asset,
    });
};

showToast.showCopyToClipboard = (message = Strings.COPIED_TO_CLIPBOARD) => {
    showToast(message, findAssetId("toast_copy_link"));
};
