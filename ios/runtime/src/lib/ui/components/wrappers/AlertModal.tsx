import { findByFilePath, findByPropsLazy } from "@metro";
import { Text } from "@metro/common/components";
import { Button } from "@metro/common/types/components";
import { ComponentProps, ComponentType, ReactNode } from "react";
import { View } from "react-native";

type ActionButtonProps = Omit<ComponentProps<Button>, "onPress"> & {
    onPress?: () => void | Promise<unknown>;
};

const alertComponents = findByPropsLazy("AlertModal", "AlertActions");

export const AlertActionButton: ComponentType<ActionButtonProps> = props => {
    const NativeAction = alertComponents.AlertActionButton as ComponentType<ActionButtonProps>;
    return <NativeAction {...props} />;
};

export default function AlertModal(props: Record<string, unknown>) {
    // memo/forwardRef components are React objects, not callable functions.
    // Resolve the module lazily, but give React the real component value.
    const _AlertModal = alertComponents.AlertModal as ComponentType<Record<string, unknown>>;
    const forwardFailedModal = findByFilePath("modules/forwarding/native/ForwardFailedAlertModal.tsx");

    // ponyfill for extraContent
    if (!forwardFailedModal && "extraContent" in props) {
        const { extraContent, content, ...rest } = props;
        const combinedContent = (
            <View style={{ gap: 16 }}>
                {typeof content === "string" || typeof content === "number" ? <Text variant="text-md/medium" color="text-muted">{content}</Text> : content as ReactNode}
                <View>
                    {extraContent as ReactNode}
                </View>
            </View>
        );

        return <_AlertModal {...rest} content={combinedContent} />;
    }

    return <_AlertModal {...props} />;
}
