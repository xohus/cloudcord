import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { findByProps } from "@webpack";
import { React } from "@webpack/common";

function AccountSwitcher() {
    const api: any = findByProps("getAccounts", "switchAccount") || findByProps("getAccountIds", "switchAccount");
    const [, refresh] = React.useState(0);
    const accounts = api?.getAccounts?.() ?? api?.getAccountIds?.()?.map((id: string) => ({ id })) ?? [];
    return <SettingsTab>
        <Heading className={Margins.top16}>Account Switcher</Heading>
        <Paragraph className={Margins.bottom20}>Switch using Discord's saved accounts. CloudCord never asks for or stores account tokens.</Paragraph>
        {accounts.map((account: any) => <div key={account.id ?? account.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid var(--background-modifier-accent)" }}>
            <span>{account.username ?? account.globalName ?? account.id ?? account.userId}</span>
            <Button size="small" onClick={() => { api.switchAccount(account.id ?? account.userId); setTimeout(() => refresh(x => x + 1), 250); }}>Switch</Button>
        </div>)}
        {!accounts.length && <Paragraph>Discord has no additional saved accounts available.</Paragraph>}
        {api?.openAccountSwitcher && <Button className={Margins.top20} onClick={() => api.openAccountSwitcher()}>Add or manage accounts</Button>}
    </SettingsTab>;
}
export default wrapTab(AccountSwitcher, "Account Switcher");
