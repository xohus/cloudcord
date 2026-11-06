/*
 * Endcord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Adapted from Endcord (github.com/Endcord/Endcord) for Foldcord: the older Button, Text, Forms and
 * toast APIs that Endcord's plugins in src/endcordplugins still import from @webpack/common.
 */

import { BaseText } from "@components/BaseText";
import { Button as NewButton, TextButton } from "@components/Button";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { showToast as nativeShowToast } from "@webpack/common";

export const Forms = {
    FormTitle: Heading,
    FormText: Paragraph,
    FormSection: "section" as never,
    FormDivider: Divider as never,
};

export const Text: any = function TextCompat({ color, variant, ...restProps }: any) {
    if (variant) {
        const [left, right] = variant.split("/");
        if (left && right) {
            restProps.size = left.split("-").pop();
            restProps.weight = right;
        }
    }
    if (color) restProps.style = { ...restProps.style, color: `var(--${color}, var(--text-default))` };
    return <BaseText {...restProps} />;
};

const ButtonColorMapping: Record<string, any> = {
    BRAND: "primary", PRIMARY: "secondary", RED: "dangerPrimary", TRANSPARENT: "secondary",
    CUSTOM: "none", GREEN: "positive", LINK: "link", WHITE: "overlayPrimary"
};
const TextButtonColorMapping: Record<string, any> = {
    BRAND: "primary", PRIMARY: "primary", RED: "danger", TRANSPARENT: "secondary",
    CUSTOM: "secondary", GREEN: "primary", LINK: "link", WHITE: "secondary"
};

export const Button: any = function ButtonCompat({ look, color = "BRAND", size = "medium", ...restProps }: any) {
    return look === "LINK"
        ? <TextButton variant={TextButtonColorMapping[color]} {...restProps} />
        : <NewButton variant={ButtonColorMapping[color]} size={size} {...restProps} />;
};
Button.Looks = { FILLED: "", LINK: "LINK" } as const;
Button.Colors = { BRAND: "BRAND", PRIMARY: "PRIMARY", RED: "RED", TRANSPARENT: "TRANSPARENT", CUSTOM: "CUSTOM", GREEN: "GREEN", LINK: "LINK", WHITE: "WHITE" } as const;
Button.Sizes = { NONE: "min", TINY: "xs", MIN: "min", SMALL: "small", MEDIUM: "medium", LARGE: "medium", XLARGE: "medium" } as const;

const ToastType = {
    MESSAGE: "message", SUCCESS: "success", FAILURE: "failure", CUSTOM: "custom", CLIP: "clip",
    LINK: "link", FORWARD: "forward", BOOKMARK: "bookmark", CLOCK: "clock"
};
const ToastPosition = { TOP: 0, BOTTOM: 1 };

const TypeToVariant: Record<string, string> = { success: "success", failure: "critical" };
const VariantToType: Record<string, string> = {
    success: "success", positive: "success", critical: "failure", danger: "failure", error: "failure", link: "link"
};

export interface ToastOptions {
    position?: number;
    component?: React.ReactNode;
    duration?: number;
}

function show(toast: any) {
    if (!toast || typeof toast.text === "string") return nativeShowToast(toast);
    const { message, type, options } = toast;
    const converted: any = { text: message, variant: TypeToVariant[type] ?? "default" };
    if (options?.duration != null) converted.duration = options.duration;
    if (options?.position != null) converted.position = options.position === ToastPosition.BOTTOM ? "bottom" : "top";
    if (options?.component != null && typeof options.component !== "string") converted.__dangerouslyRenderContent = () => options.component;
    return nativeShowToast(converted);
}

export const Toasts = {
    Type: ToastType,
    Position: ToastPosition,
    genId: () => (Math.random() || Math.random()).toString(36).slice(2),
    show,
    pop: () => { },
    create: (message: string, type: string, options?: ToastOptions) => ({ message, id: Toasts.genId(), type, options }),
};

export function showToast(message: string | { text: string; variant?: string; }, type = ToastType.MESSAGE, options?: ToastOptions) {
    if (typeof message === "object" && message !== null) {
        type = VariantToType[message.variant ?? ""] ?? ToastType.MESSAGE;
        message = String(message.text);
    }
    show(Toasts.create(message, type, options));
}
