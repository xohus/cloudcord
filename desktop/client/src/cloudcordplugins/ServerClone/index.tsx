/*
 * CloudCord Server Clone
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { cloneServer } from "@utils/serverClone";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter, React, RestAPI, showToast, Toasts } from "@webpack/common";

const PARTS = [
    ["settings", "Name, icon, banner and settings"],
    ["roles", "Roles, colours, permissions and order"],
    ["channels", "Categories and channels with permissions"],
    ["emojis", "Emojis"],
    ["stickers", "Stickers"],
] as const;

function CloneModal({ guild, rootProps }: { guild: any; rootProps: ModalProps; }) {
    const [name, setName] = React.useState(`${guild.name} (copy)`.slice(0, 100));
    const [include, setInclude] = React.useState<Record<string, boolean>>(Object.fromEntries(PARTS.map(([key]) => [key, true])));
    const [state, setState] = React.useState<{ running: boolean; step?: string; done: number; total: number; result?: { guildId: string; skipped: string[]; }; error?: string; }>({ running: false, done: 0, total: 1 });
    const signal = React.useRef({ cancelled: false });

    const start = async () => {
        signal.current = { cancelled: false };
        setState({ running: true, done: 0, total: 1, step: "Starting" });
        try {
            const result = await cloneServer({
                rest: RestAPI as any, sourceGuildId: guild.id, name, include, signal: signal.current,
                onProgress: (step, done, total) => setState(previous => ({ ...previous, step, done, total })),
            });
            setState(previous => ({ ...previous, running: false, result }));
            showToast("Server cloned.", Toasts.Type.SUCCESS);
        } catch (error: any) {
            setState(previous => ({ ...previous, running: false, error: error?.body?.message || error?.message || "Cloning failed" }));
        }
    };

    const percent = Math.round(100 * state.done / Math.max(1, state.total));
    return <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
        <ModalHeader><h2 className="cc-clone-title">Clone {guild.name}</h2><ModalCloseButton onClick={rootProps.onClose} /></ModalHeader>
        <ModalContent className="cc-clone">
            {!state.running && !state.result && <>
                <label className="cc-clone-field">New server name
                    <input value={name} maxLength={100} onChange={event => setName(event.currentTarget.value)} />
                </label>
                <div className="cc-clone-parts">
                    {PARTS.map(([key, label]) => <label key={key}>
                        <input type="checkbox" checked={include[key]} onChange={event => setInclude({ ...include, [key]: event.currentTarget.checked })} /> {label}
                    </label>)}
                </div>
                <p className="cc-clone-note">This creates a new server owned by you and copies the parts above using your account, the same way you'd set it up by hand. It goes slowly to stay within Discord's limits, so big servers take a few minutes. Messages and members are never copied. Banners and invite backgrounds need boosts, and Community channel types become normal channels.</p>
                <p className="cc-clone-note">Only clone servers you have the right to copy.</p>
            </>}
            {(state.running || state.result || state.error) && <div className="cc-clone-progress">
                <div className="cc-clone-bar"><div style={{ width: `${percent}%` }} /></div>
                <div className="cc-clone-step">{state.running ? `${state.step} (${state.done}/${state.total})` : state.error ? `Stopped: ${state.error}` : "Finished"}</div>
                {state.result?.skipped.length ? <details open><summary>{state.result.skipped.length} things couldn't be copied</summary>
                    <ul>{state.result.skipped.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
            </div>}
        </ModalContent>
        <ModalFooter className="cc-clone-footer">
            {!state.running && !state.result && <button className="cc-clone-btn primary" disabled={!name.trim()} onClick={start}>Clone server</button>}
            {state.running && <button className="cc-clone-btn" onClick={() => { signal.current.cancelled = true; }}>Stop</button>}
            {state.result && <button className="cc-clone-btn primary" onClick={() => { rootProps.onClose(); NavigationRouter.transitionToGuild(state.result!.guildId); }}>Open new server</button>}
            {!state.running && <button className="cc-clone-btn" onClick={rootProps.onClose}>Close</button>}
        </ModalFooter>
    </ModalRoot>;
}

const guildMenu: NavContextMenuPatchCallback = (children, { guild }: { guild: any; }) => {
    if (!guild?.id) return;
    const group = findGroupChildrenByChildId("privacy", children) ?? children;
    group.push(<Menu.MenuItem id="cc-clone-server" label="Clone server" action={() => openModal(props => <CloneModal guild={guild} rootProps={props} />)} />);
};

export default definePlugin({
    name: "ServerClone",
    description: "Copy a server's roles, channels, permissions, emojis, stickers and settings into a new server you own. Right-click a server, then Clone server.",
    authors: [Devs.Xohus],
    tags: ["Servers", "Utility"],
    contextMenus: { "guild-context": guildMenu, "guild-header-popout": guildMenu },
});
