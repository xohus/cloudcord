/*
 * CloudCord Fake Messages
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import { FakeConversation, FakeLine, FakePerson, installFakeMessages, MAX_FAKE_LINES, MAX_FAKE_PEOPLE, newKey, newLocalChannelId, normalizeConversation } from "@utils/fakeMessages";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, IconUtils, Menu, NavigationRouter, React, RelationshipStore, RestAPI, showToast, Toasts, UserStore, UserUtils } from "@webpack/common";

const STORE_KEY = "CloudCord_fakeMessages";
let conversations: FakeConversation[] = [];
let runtime: ReturnType<typeof installFakeMessages> | null = null;

async function save(next: FakeConversation[]) {
    conversations = next.map(normalizeConversation).filter(Boolean) as FakeConversation[];
    await DataStore.set(STORE_KEY, conversations);
}

const personName = (person: FakePerson) => {
    const user = person.userId ? UserStore.getUser(person.userId) as any : null;
    return person.name || user?.globalName || user?.username || person.userId || "Person";
};

// A real DM with this user if you have one, otherwise a new DM that only exists on this device.
const dmTarget = (userId?: string) => {
    const real = userId ? (ChannelStore as any).getDMFromUserId?.(userId) as string | undefined : undefined;
    return real ? { channelId: real, local: false } : { channelId: newLocalChannelId(), local: true };
};

function Editor({ channelId, dmUser, rootProps }: { channelId?: string; dmUser?: string; rootProps: ModalProps; }) {
    const [, rerender] = React.useReducer((x: number) => x + 1, 0);
    const existing = dmUser
        ? conversations.filter(conversation => conversation.dm && conversation.people.find(person => person.key === conversation.dm!.person)?.userId === dmUser)
        : conversations.filter(conversation => conversation.channelId === channelId);
    const blank = (): FakeConversation => {
        if (!dmUser) return { id: newKey(), name: "Fake conversation", channelId: channelId!, people: [], lines: [] };
        const key = newKey(), target = dmTarget(dmUser);
        return { id: newKey(), name: "Fake DM", channelId: target.channelId, people: [{ key, userId: dmUser }], lines: [], dm: { person: key, local: target.local } };
    };
    const [draft, setDraft] = React.useState<FakeConversation>(existing[0] ? structuredClone(existing[0]) : blank());
    const [friendQuery, setFriendQuery] = React.useState("");
    const [userId, setUserId] = React.useState("");
    const [custom, setCustom] = React.useState({ name: "", avatarUrl: "" });
    const update = (patch: Partial<FakeConversation>) => setDraft(previous => ({ ...previous, ...patch }));
    const full = draft.people.length >= MAX_FAKE_PEOPLE;

    const addPerson = (person: Omit<FakePerson, "key">) => {
        if (full) return showToast(`Up to ${MAX_FAKE_PEOPLE} people per conversation.`, Toasts.Type.FAILURE);
        if (person.userId && draft.people.some(item => item.userId === person.userId)) return;
        update({ people: [...draft.people, { key: newKey(), ...person }] });
    };
    const addById = async () => {
        const id = userId.trim();
        if (!/^\d{15,22}$/.test(id)) return showToast("Enter a Discord user ID.", Toasts.Type.FAILURE);
        try { await UserUtils.getUser(id); } catch { return showToast("Couldn't find that user.", Toasts.Type.FAILURE); }
        addPerson({ userId: id }); setUserId("");
    };
    const friends = RelationshipStore.getFriendIDs()
        .map(id => UserStore.getUser(id) as any).filter(Boolean)
        .filter(user => !friendQuery || `${user.globalName || ""} ${user.username}`.toLowerCase().includes(friendQuery.toLowerCase()))
        .slice(0, 8);
    const me = UserStore.getCurrentUser() as any;

    const setLine = (key: string, patch: Partial<FakeLine>) => update({ lines: draft.lines.map(line => line.key === key ? { ...line, ...patch } : line) });
    const addLine = () => {
        if (!draft.people.length) return showToast("Add a person first.", Toasts.Type.FAILURE);
        if (draft.lines.length >= MAX_FAKE_LINES) return;
        const last = draft.lines[draft.lines.length - 1];
        // Alternate speakers and space lines a minute apart, newest last.
        const nextPerson = draft.people[(draft.people.findIndex(person => person.key === last?.person) + 1) % draft.people.length];
        update({ lines: [...draft.lines.map(line => ({ ...line, minutesAgo: line.minutesAgo + 1 })), { key: newKey(), person: nextPerson.key, text: "", minutesAgo: 0 }] });
    };

    const show = async () => {
        const clean = normalizeConversation({ ...draft, savedAt: Date.now() });
        if (!clean?.lines.length) return showToast("Add at least one message.", Toasts.Type.FAILURE);
        runtime?.hide(clean.id);
        await save([...conversations.filter(conversation => conversation.id !== clean.id), clean]);
        runtime?.show(clean.channelId);
        rootProps.onClose();
        if (clean.dm) NavigationRouter.transitionTo(`/channels/@me/${clean.channelId}`);
    };
    const remove = async (id = draft.id) => {
        runtime?.hide(id);
        await save(conversations.filter(conversation => conversation.id !== id));
        if (id === draft.id) rootProps.onClose(); else rerender();
    };
    // Where it shows: this chat, or a DM with one of the people (not you).
    const whereOptions = draft.people.filter(person => person.userId !== me?.id);
    const setWhere = (value: string) => {
        if (value === "chat") return update({ dm: undefined, channelId: channelId! });
        const person = draft.people.find(item => item.key === value);
        if (!person) return;
        const target = dmTarget(person.userId);
        update({ dm: { person: person.key, local: target.local }, channelId: target.channelId });
    };

    return <ModalRoot {...rootProps} size={ModalSize.LARGE}>
        <ModalHeader><h2 className="cc-fm-title">Fake conversation</h2><ModalCloseButton onClick={rootProps.onClose} /></ModalHeader>
        <ModalContent className="cc-fm">
            <p className="cc-fm-note">Only you see these messages. Nothing is sent, and they disappear for you if you delete the conversation.</p>
            {existing.length > 1 && <select className="cc-fm-input" value={draft.id} onChange={event => setDraft(structuredClone(existing.find(item => item.id === event.currentTarget.value)!))}>
                {existing.map(conversation => <option key={conversation.id} value={conversation.id}>{conversation.name}</option>)}
            </select>}
            <div className="cc-fm-row">
                <input className="cc-fm-input" value={draft.name} maxLength={60} onChange={event => update({ name: event.currentTarget.value })} />
                <button className="cc-fm-btn" onClick={() => setDraft(blank())}>New conversation</button>
            </div>
            <label>Show it in</label>
            <select className="cc-fm-input" value={draft.dm?.person ?? "chat"} onChange={event => setWhere(event.currentTarget.value)}>
                {channelId && <option value="chat">This chat</option>}
                {whereOptions.map(person => <option key={person.key} value={person.key}>A DM with {personName(person)}</option>)}
            </select>
            {draft.dm && <p className="cc-fm-note">{draft.dm.local ? "Adds a DM to your DM list that only exists on this device. What you type there stays on this device too." : "Uses your real DM with them; the fake messages only show for you."}</p>}

            <h3>People ({draft.people.length}/{MAX_FAKE_PEOPLE})</h3>
            <div className="cc-fm-people">
                {draft.people.map(person => <span key={person.key} className="cc-fm-chip">
                    {personName(person)}{!person.userId && " (made up)"}
                    <button aria-label="Remove" onClick={() => update({ people: draft.people.filter(item => item.key !== person.key), lines: draft.lines.filter(line => line.person !== person.key) })}>×</button>
                </span>)}
            </div>
            <div className="cc-fm-grid">
                <div>
                    <label>From your friends</label>
                    <input className="cc-fm-input" placeholder="Search friends" value={friendQuery} onChange={event => setFriendQuery(event.currentTarget.value)} />
                    <div className="cc-fm-list">
                        {me && <button onClick={() => addPerson({ userId: me.id })}>You</button>}
                        {friends.map(user => <button key={user.id} disabled={full} onClick={() => addPerson({ userId: user.id })}>{user.globalName || user.username}</button>)}
                    </div>
                </div>
                <div>
                    <label>By user ID</label>
                    <div className="cc-fm-row"><input className="cc-fm-input" placeholder="123456789012345678" value={userId} onChange={event => setUserId(event.currentTarget.value)} /><button className="cc-fm-btn" disabled={full} onClick={addById}>Add</button></div>
                    <label>Make up a person</label>
                    <input className="cc-fm-input" placeholder="Name" maxLength={32} value={custom.name} onChange={event => setCustom({ ...custom, name: event.currentTarget.value })} />
                    <input className="cc-fm-input" placeholder="Picture URL (https://…, optional)" value={custom.avatarUrl} onChange={event => setCustom({ ...custom, avatarUrl: event.currentTarget.value })} />
                    <button className="cc-fm-btn" disabled={full || !custom.name.trim()} onClick={() => { addPerson({ name: custom.name.trim(), avatarUrl: custom.avatarUrl.trim() || undefined }); setCustom({ name: "", avatarUrl: "" }); }}>Add person</button>
                </div>
            </div>

            <h3>Messages ({draft.lines.length})</h3>
            <div className="cc-fm-lines">
                {draft.lines.map(line => <div key={line.key} className="cc-fm-line">
                    <select className="cc-fm-input" value={line.person} onChange={event => setLine(line.key, { person: event.currentTarget.value })}>
                        {draft.people.map(person => <option key={person.key} value={person.key}>{personName(person)}</option>)}
                    </select>
                    <textarea className="cc-fm-input" rows={1} placeholder="Message" value={line.text} onChange={event => setLine(line.key, { text: event.currentTarget.value })} />
                    <label className="cc-fm-ago"><input type="number" min={0} value={line.minutesAgo} onChange={event => setLine(line.key, { minutesAgo: Math.max(0, Number(event.currentTarget.value) || 0) })} /> min ago</label>
                    <button aria-label="Remove message" onClick={() => update({ lines: draft.lines.filter(item => item.key !== line.key) })}>×</button>
                </div>)}
            </div>
            <button className="cc-fm-btn" onClick={addLine}>Add message</button>

            <h3>All your fake conversations ({conversations.length})</h3>
            <div className="cc-fm-lines">
                {conversations.map(conversation => <div key={conversation.id} className="cc-fm-all">
                    <span>{conversation.name}{conversation.dm ? " (DM)" : ""} · {conversation.lines.length} messages</span>
                    <button className="cc-fm-btn" onClick={() => setDraft(structuredClone(conversation))}>Edit</button>
                    <button className="cc-fm-btn danger" onClick={() => void remove(conversation.id)}>Delete</button>
                </div>)}
            </div>
        </ModalContent>
        <ModalFooter className="cc-fm-footer">
            <button className="cc-fm-btn primary" onClick={show}>{draft.dm ? "Show as DM" : "Show in this chat"}</button>
            {conversations.some(item => item.id === draft.id) && <button className="cc-fm-btn danger" onClick={() => void remove()}>Delete conversation</button>}
        </ModalFooter>
    </ModalRoot>;
}

const openEditor = (channelId?: string | null) => {
    if (!channelId) return showToast("Open a chat first.", Toasts.Type.FAILURE);
    openModal(props => <Editor channelId={channelId} rootProps={props} />);
};

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: any; }) => {
    if (!channel?.id) return;
    children.push(<Menu.MenuItem id="cc-fake-messages" label="Fake conversation…" action={() => openEditor(channel.id)} />);
};
// Right-click a user: a fake DM with them, in your real DM or a new device-only one.
const userMenu: NavContextMenuPatchCallback = (children, { user }: { user: any; }) => {
    if (!user?.id || user.id === (UserStore.getCurrentUser() as any)?.id) return;
    children.push(<Menu.MenuItem id="cc-fake-dm" label="Fake DM…" action={() => openModal(props => <Editor dmUser={user.id} rootProps={props} />)} />);
};

export default definePlugin({
    name: "FakeMessages",
    description: "Make fake conversations and fake DMs, only on your device: messages from friends, any user ID or made-up people (up to 10). Right-click a chat for Fake conversation, or a user for Fake DM.",
    authors: [Devs.Xohus],
    tags: ["Chat", "Fun"],
    contextMenus: { "channel-context": channelMenu, "thread-context": channelMenu, "gdm-context": channelMenu, "user-context": userMenu },
    async start() {
        conversations = ((await DataStore.get(STORE_KEY)) ?? []).map(normalizeConversation).filter(Boolean);
        runtime = installFakeMessages({
            dispatcher: FluxDispatcher, rest: RestAPI, iconUtils: IconUtils,
            getConversations: () => conversations,
            getUser: id => UserStore.getUser(id),
            getGuildId: channelId => (ChannelStore.getChannel(channelId) as any)?.guild_id,
            removeLine: (conversationId, lineKey) => {
                void save(conversations.map(conversation => conversation.id === conversationId ? { ...conversation, lines: conversation.lines.filter(line => line.key !== lineKey) } : conversation));
            },
            explain: () => showToast("That's a fake message on your device.", Toasts.Type.MESSAGE),
            // What you type in a device-only DM becomes your own line in that conversation.
            addOwnLine: (conversationId, text) => {
                const me = UserStore.getCurrentUser() as any;
                void save(conversations.map(conversation => {
                    if (conversation.id !== conversationId || !me) return conversation;
                    let self = conversation.people.find(person => person.userId === me.id);
                    const people = self ? conversation.people : [...conversation.people, self = { key: newKey(), userId: me.id }];
                    // Times count back from the save time: move it to now and keep earlier lines where they were.
                    const elapsed = Math.max(0, Math.round((Date.now() - (conversation.savedAt ?? Date.now())) / 60_000));
                    const lines = conversation.lines.map(line => ({ ...line, minutesAgo: line.minutesAgo + elapsed }));
                    return { ...conversation, people, savedAt: Date.now(), lines: [...lines, { key: newKey(), person: self.key, text, minutesAgo: 0 }] };
                })).then(() => runtime?.show(conversations.find(item => item.id === conversationId)?.channelId));
            },
        });
    },
    stop() {
        runtime?.stop();
        runtime = null;
    },
    openEditor,
});
