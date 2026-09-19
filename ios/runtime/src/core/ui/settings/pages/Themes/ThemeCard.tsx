import AddonCard, { CardWrapper } from "@core/ui/components/AddonCard";
import { VdThemeInfo, themes, selectTheme } from "@lib/addons/themes";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { showToast } from "@lib/ui/toasts";
import { showSheet } from "@lib/ui/sheets";
import { NavigationNative, React } from "@metro/common";

export default function ThemeCard({ item: theme }: CardWrapper<VdThemeInfo>) {
  const navigation = NavigationNative.useNavigation();
  const [removed, setRemoved] = React.useState(false);

  // This is needed because of React™
  if (removed) return null;

  const { authors } = theme.data;

  return (
    <AddonCard
      headerLabel={theme.data.name}
      headerSublabel={
        authors ? `by ${authors.map((i) => i.name).join(", ")}` : ""
      }
      descriptionLabel={theme.data.description ?? "No description."}
      toggleType={!settings.safeMode?.enabled ? "radio" : undefined}
      toggleValue={() => themes[theme.id].selected}
      onToggleChange={async (v: boolean) => {
        try {
          await selectTheme(v ? theme : null);
          showToast(v ? `Applied ${theme.data.name}` : "Theme disabled", findAssetId("Check"));
        } catch (e: any) {
          console.error("Error while selecting theme:", e);
          showToast(e?.message ?? "Could not apply theme", findAssetId("CircleXIcon-primary"));
        }
      }}
      overflowTitle={theme.data.name}
      actions={[
        {
          icon: "CircleInformationIcon-primary",
          onPress: () => {
            const importPromise = import("./sheets/ThemeInfoActionSheet");
            showSheet("ThemeInfoActionSheet", importPromise, {
              theme,
              navigation,
            });
          },
        },
      ]}
    />
  );
}
