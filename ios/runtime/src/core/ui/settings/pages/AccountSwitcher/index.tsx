import { findAssetId } from "@lib/api/assets";
import { findByProps } from "@metro/wrappers";
import { TableRow, TableRowGroup } from "@metro/common/components";
import { ScrollView } from "react-native";
import { settings } from "@lib/api/settings";

export default function AccountSwitcher() {
    const api: any = findByProps("getAccounts", "switchAccount") || findByProps("getAccountIds", "switchAccount");
    const accounts = api?.getAccounts?.() ?? api?.getAccountIds?.()?.map((id: string) => ({ id })) ?? [];
    return <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 38 }}>
        <TableRowGroup title="Discord saved accounts">
            {accounts.map((account: any) => <TableRow key={account.id ?? account.userId} arrow label={account.username ?? account.globalName ?? account.id ?? account.userId} subLabel="Switch account" icon={<TableRow.Icon source={findAssetId("UserIcon")!} />} onPress={() => api.switchAccount(account.id ?? account.userId)} />)}
            {!accounts.length && <TableRow label="No additional saved accounts" subLabel="Add another account through Discord first" icon={<TableRow.Icon source={findAssetId("UserIcon")!} />} />}
            {api?.openAccountSwitcher && <TableRow arrow label="Add or manage accounts" subLabel="Open Discord's account manager" icon={<TableRow.Icon source={findAssetId("UserIcon")!} />} onPress={() => api.openAccountSwitcher()} />}
        </TableRowGroup>
        {!api && <TableRowGroup title="Enable Discord's mobile switcher">
            <TableRow
                label="Experiments enabled"
                subLabel="In Discord's Experiment Overrides, set Mobile Account Switcher to Treatment 1, then reload Discord"
                icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                onPress={() => { settings.enableDiscordDeveloperSettings = true; }}
            />
        </TableRowGroup>}
    </ScrollView>;
}
