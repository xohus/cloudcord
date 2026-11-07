import { onEditMessage, onSendMessage } from "@core/plugins/shared/sendMessage";
import { instead } from "@lib/api/patcher";
import { animateCxAssets, bindCxSocialEvents, createCxPlusReactionHandler, createCxPreviousSendHandler, createCxSession, cxAppearanceTargets, cxProfileMenuActions, CX_INLINE_EDITOR_LIMIT, fixCxFileExtensions, floorCxRelativeTime, formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, getCxProfileMenuCopy, isCxProfileUserId, markCxServersRead, MAX_CX_SOURCE, overrideCxMethods, raiseCxAvatarResolution, reviewCx, runCxFriendInvites, runCxIncomingRules, type CxProfileMenuAction } from "@lib/api/cx";
import { cxCatalog } from "@lib/api/cxCatalog";
import { registerCommand } from "@lib/api/commands";
import { describeCcpReport } from "@lib/api/ccpInspect";
import { copyCcpReport } from "@lib/api/ccpReport";
import { ApplicationCommandOptionType, ApplicationCommandType } from "@lib/api/commands/types";
import { intercept } from "@lib/api/flux";
import { getCurrentTheme } from "@lib/addons/themes";
import { registerColorOverlay, updateBunnyColor } from "@lib/addons/themes/colors/updater";
import { NativeFileModule } from "@lib/api/native/modules";
import { isThemeSupported } from "@lib/api/native/loader";
import { deleteJsxCreate, onJsxCreate } from "@lib/api/react/jsx";
import { settings } from "@lib/api/settings";
import { resolveSemanticColor, semanticColors } from "@lib/ui/color";
import { showToast } from "@lib/ui/toasts";
import type { CxUploadAnonymiser } from "@lib/api/cx";
import { findByFilePath, findByProps, findByStoreName, findByStoreNameLazy } from "@metro";
import { clipboard, commands, FluxDispatcher, messageUtil, React } from "@metro/common";
import { Stack, TableRow, TableRowGroup } from "@metro/common/components";
import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import { Animated, FlatList, ScrollView, SectionList, Text, TextInput, View } from "react-native";

const session = createCxSession();
const UserStore = findByStoreNameLazy("UserStore");
const ChannelStore = findByStoreNameLazy("ChannelStore");
const MessageStore = findByStoreNameLazy("MessageStore");
const EmojiStore = findByStoreNameLazy("EmojiStore");
const RelationshipStore = findByStoreNameLazy("RelationshipStore");
const UserProfileStore = findByStoreNameLazy("UserProfileStore");
const GuildMemberStore = findByStoreNameLazy("GuildMemberStore");
const GuildStore = findByStoreNameLazy("GuildStore");
const GuildChannelStore = findByStoreNameLazy("GuildChannelStore");
const ActiveJoinedThreadsStore = findByStoreNameLazy("ActiveJoinedThreadsStore");
const ReadStateStore = findByStoreNameLazy("ReadStateStore");
const SpotifyStore = findByStoreNameLazy("SpotifyStore");
const SelectedChannelStore = findByStoreNameLazy("SelectedChannelStore");

type AppearanceChange = (element: JSX.Element) => JSX.Element | null;
const appearanceBindings = new Map<string | object, ReturnType<typeof bindAppearance>>();

function bindAppearance(name: string | object) {
    let revision = 0;
    let changes = new Set<AppearanceChange>();
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    };
    const getRevision = () => revision;
    function Appearance({ element }: { element: JSX.Element; }) {
        React.useSyncExternalStore(subscribe, getRevision);
        if (settings.safeMode?.enabled) return element;
        let current: JSX.Element | null = element;
        for (const change of changes) {
            current = change(current);
            if (!current) break;
        }
        return current;
    }
    const wrap = (_: unknown, element: JSX.Element) => <Appearance key={element.key} element={element} />;
    function refresh() {
        revision++;
        for (const listener of [...listeners]) listener();
    }
    onJsxCreate(name, wrap, true);
    return (change: AppearanceChange, beforeWrapping: boolean) => {
        if (beforeWrapping) changes = new Set([change, ...changes]);
        else changes.add(change);
        refresh();
        return () => {
            if (!changes.delete(change)) return;
            if (!changes.size) {
                deleteJsxCreate(name, wrap, true);
                appearanceBindings.delete(name);
            }
            refresh();
        };
    };
}

function registerJsxAppearance(names: readonly (string | object)[], change: AppearanceChange, beforeWrapping = false) {
    const cleanups = names.map(name => {
        let bind = appearanceBindings.get(name);
        if (!bind) {
            bind = bindAppearance(name);
            appearanceBindings.set(name, bind);
        }
        return bind(change, beforeWrapping);
    });
    return () => { for (const cleanup of cleanups) cleanup(); };
}

let memberRowScope: { context: Context<boolean>; stop: () => void; users: number; } | undefined;

function registerMemberRowAppearance(target: string | object, change: AppearanceChange) {
    if (!memberRowScope) {
        const context = React.createContext(false);
        const stop = registerJsxAppearance(["UserRowSubLabel"], element => element.props.guildId
            ? <context.Provider value={true}>{element}</context.Provider> : element);
        memberRowScope = { context, stop, users: 0 };
    }
    const scope = memberRowScope;
    scope.users++;
    function MemberAppearance({ element }: { element: JSX.Element; }) {
        const inMemberRow = React.useContext(scope.context);
        return inMemberRow && !settings.safeMode?.enabled ? change(element) : element;
    }
    const stopAppearance = registerJsxAppearance([target], element => <MemberAppearance element={element} />);
    return () => {
        stopAppearance();
        if (--scope.users === 0) {
            scope.stop();
            memberRowScope = undefined;
        }
    };
}

let staticTypingDots: { stop: () => void; users: number; } | undefined;
let hasUploadAnonymiser = false;

function registerUploadAnonymiser(anonymiser: CxUploadAnonymiser) {
    if (hasUploadAnonymiser) throw new Error("An upload naming rule is already enabled");
    const preview = findByFilePath("modules/media_uploads/native/UploadPreviewActionSheet.tsx")?.default;
    if (typeof preview !== "function") throw new Error("Discord's attachment preview is unavailable");
    const uploader = findByFilePath("lib/uploader/native/CloudUploader.tsx")?.default?.prototype;
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    type Upload = Parameters<CxUploadAnonymiser["isAnonymous"]>[0];
    function AnonymousUploadRow({ upload }: { upload: Upload; }) {
        const [selected, setSelected] = React.useState(() => anonymiser.isAnonymous(upload));
        return <TableRow label="Use anonymous filename" subLabel={selected ? "On" : "Off"} onPress={() => {
            if (!enabled()) return;
            const next = !selected;
            anonymiser.setAnonymous(upload, next);
            setSelected(next);
        }} />;
    }
    function PreviewWithAnonymousRow({ previewProps }: { previewProps: { upload?: Upload; }; }) {
        const output = preview(previewProps) as ReactNode;
        const { upload } = previewProps;
        if (!enabled() || !upload || typeof upload !== "object") return output;
        let inserted = false;
        function insert(tree: ReactNode, depth = 0): ReactNode {
            if (inserted || depth >= 12) return tree;
            if (Array.isArray(tree)) {
                const next = tree.map(child => insert(child, depth + 1));
                return inserted ? next : tree;
            }
            if (!React.isValidElement<{ children?: ReactNode; onLayout?: unknown; spacing?: number; }>(tree)) return tree;
            const { children, onLayout, spacing } = tree.props;
            if (tree.type === Stack && spacing === 16 && typeof onLayout === "function") {
                inserted = true;
                return React.cloneElement(tree, { children: [...React.Children.toArray(children),
                    <TableRowGroup key="cx-anonymous-upload" title="CloudCord"><AnonymousUploadRow upload={upload} /></TableRowGroup>] });
            }
            const next = insert(children, depth + 1);
            return next === children ? tree : React.cloneElement(tree, { children: next });
        }
        return insert(output);
    }
    const stopUploads = overrideCxMethods(uploader, {
        uploadFiles: (args, original) => {
            anonymiser.apply(args[0]);
            return original(args);
        },
    }, enabled);
    const stopPreview = registerJsxAppearance([preview], element =>
        <PreviewWithAnonymousRow previewProps={element.props} />);
    hasUploadAnonymiser = true;
    return () => {
        active = false;
        stopPreview();
        stopUploads();
        hasUploadAnonymiser = false;
    };
}

function registerStaticTypingDots() {
    if (!staticTypingDots) {
        const ellipsis = findByFilePath("design/components/Button/native/ButtonEllipsis.native.tsx")?.Ellipsis;
        if (!ellipsis) throw new Error("Discord's typing dots are unavailable");
        const InTypingIndicator = React.createContext(false);
        function TypingDots({ element }: { element: JSX.Element; }) {
            const inside = React.useContext(InTypingIndicator);
            if (!inside || settings.safeMode?.enabled) return element;
            const backgroundColor = resolveSemanticColor(semanticColors.INTERACTIVE_TEXT_DEFAULT ?? semanticColors.INTERACTIVE_ICON_DEFAULT)
                ?? "#949ba4";
            const dot = { width: 5, height: 5, borderRadius: 3, backgroundColor };
            return <View style={{ flexDirection: "row", gap: 4 }} accessible={false}>
                <View style={dot} /><View style={dot} /><View style={dot} />
            </View>;
        }
        const stopScope = registerJsxAppearance(["TypingIndicatorInner"], element =>
            <InTypingIndicator.Provider value={true}>{element}</InTypingIndicator.Provider>);
        const stopDots = registerJsxAppearance([ellipsis], element => <TypingDots element={element} />);
        staticTypingDots = { stop: () => { stopDots(); stopScope(); }, users: 0 };
    }
    const binding = staticTypingDots;
    binding.users++;
    return () => {
        if (--binding.users === 0) {
            binding.stop();
            staticTypingDots = undefined;
        }
    };
}

type AppearanceProps = {
    children?: ReactNode; accessibilityRole?: string; accessibilityLabel?: string; onPress?: unknown;
    IconComponent?: unknown; triggerOnLongPress?: boolean;
};

function containsAppearanceType(tree: ReactNode, types: ReadonlySet<unknown>, depth = 0): boolean {
    if (depth >= 16) return false;
    if (Array.isArray(tree)) return tree.some(child => containsAppearanceType(child, types, depth + 1));
    return React.isValidElement<AppearanceProps>(tree)
        && (types.has(tree.type) || containsAppearanceType(tree.props.children, types, depth + 1));
}

function hideAppearanceElements(tree: ReactNode, shouldHide: (element: ReactElement<AppearanceProps>) => boolean, depth = 0): ReactNode {
    if (depth >= 16) return tree;
    if (Array.isArray(tree)) {
        const next = tree.map(child => hideAppearanceElements(child, shouldHide, depth + 1));
        return next.every((child, index) => child === tree[index]) ? tree : next;
    }
    if (!React.isValidElement<AppearanceProps>(tree)) return tree;
    if (shouldHide(tree)) return null;
    const { children } = tree.props;
    const next = hideAppearanceElements(children, shouldHide, depth + 1);
    return next === children ? tree : React.cloneElement(tree, { children: next });
}

function registerTreeAppearance(rule: {
    hideComponents?: readonly string[]; hideIcons?: readonly string[];
    keepWhilePresent?: readonly string[]; hideLabels?: readonly string[]; hideText?: readonly string[];
    hideControlIcons?: readonly string[]; hideLongPressMenu?: boolean;
} & ({ renderTree: string; } | { renderComponent: string; })) {
    const target = "renderTree" in rule ? findByFilePath(rule.renderTree)?.default : rule.renderComponent;
    if (!target) throw new Error("Discord's appearance component is unavailable");
    const getTypes = (names: readonly string[]) => new Set(names.map(name => findByProps(name)?.[name]).filter(Boolean));
    const components = getTypes(rule.hideComponents ?? []);
    const icons = getTypes(rule.hideIcons ?? []);
    const controlIcons = getTypes(rule.hideControlIcons ?? []);
    const longPressMenu = rule.hideLongPressMenu && findByProps("ContextMenu")?.ContextMenu;
    if (rule.hideControlIcons && controlIcons.size !== rule.hideControlIcons.length || rule.hideLongPressMenu && !longPressMenu) {
        throw new Error("Discord's appearance controls are unavailable");
    }
    const translations = (rule.hideLabels || rule.hideText) && findByProps("intl", "t");
    const translate = (keys: readonly string[] = []) => keys.flatMap(key => {
        const message = translations?.t?.[key];
        const label = message && translations?.intl?.string?.(message);
        return typeof label === "string" && label ? [label] : [];
    });
    const labels = new Set(translate(rule.hideLabels));
    const text = new Set(translate(rule.hideText).map(label => label.toUpperCase()));
    if (!components.size && !icons.size && !labels.size && !text.size && !controlIcons.size && !longPressMenu) {
        throw new Error("Discord's appearance targets are unavailable");
    }
    const keep = getTypes(rule.keepWhilePresent ?? []);
    if (rule.keepWhilePresent && keep.size !== rule.keepWhilePresent.length) {
        throw new Error("Discord's active call controls are unavailable");
    }
    const shouldHide = ({ type, props }: ReactElement<AppearanceProps>) => {
        const { children, accessibilityRole, accessibilityLabel, onPress, IconComponent, triggerOnLongPress } = props;
        return components.has(type)
            || Boolean(longPressMenu && type === longPressMenu && triggerOnLongPress === true)
            || accessibilityRole === "text" && typeof children === "string" && text.has(children)
            || typeof onPress === "function" && (
                controlIcons.has(IconComponent)
                || Boolean(accessibilityLabel && labels.has(accessibilityLabel))
                || accessibilityRole === "button" && icons.size > 0 && containsAppearanceType(children, icons)
            );
    };
    const wrappers = new WeakMap<object, { type: ComponentType<object>; forwardsRef: boolean; }>();
    return registerJsxAppearance([target], element => {
        if (typeof target !== "string" && element.type !== target) return element;
        const component = element.type as {
            $$typeof?: symbol;
            type?: unknown;
            compare?: (previous: object, next: object) => boolean;
        };
        let wrapper = wrappers.get(component);
        if (!wrapper) {
            const memoized = component?.$$typeof === Symbol.for("react.memo");
            const inner = (memoized ? component.type : component) as { $$typeof?: symbol; render?: unknown; };
            const forwardsRef = inner?.$$typeof === Symbol.for("react.forward_ref");
            const nativeRender = forwardsRef ? inner.render : inner;
            if (typeof nativeRender !== "function" || nativeRender.prototype?.isReactComponent) return element;
            const render = nativeRender;
            function FilteredTree(props: object, ref?: unknown) {
                const tree = render(props, ref) as ReactNode;
                return settings.safeMode?.enabled || keep.size && containsAppearanceType(tree, keep) ? tree : hideAppearanceElements(tree, shouldHide);
            }
            const filtered = forwardsRef ? React.forwardRef(FilteredTree) : FilteredTree;
            wrapper = { type: memoized ? React.memo(filtered, component.compare) : filtered, forwardsRef };
            wrappers.set(component, wrapper);
        }
        const props = { ...element.props, key: element.key };
        if (wrapper.forwardsRef) props.ref ??= Object.getOwnPropertyDescriptor(element, "ref")?.value;
        return React.createElement(wrapper.type, props);
    });
}

type PickerTab = "gif" | "sticker";
type PickerTabRule = { tab: PickerTab; };

function bindExpressionPickerTabs() {
    const picker = findByFilePath("modules/expression_picker/native/ExpressionPicker.tsx")?.default;
    const nativeRender = picker?.$$typeof === Symbol.for("react.memo") && picker.type;
    const order: readonly string[] | undefined = findByFilePath("modules/expression_picker/ExpressionPickerConstants.tsx")?.ExpressionPickerOrder;
    if (typeof nativeRender !== "function" || !Array.isArray(order) || order.length !== 3
        || !["emoji", "gif", "sticker"].every(tab => order.includes(tab))) {
        throw new Error("Discord's expression picker is unavailable");
    }
    const render = nativeRender;
    const tabs = order;
    const rules = new Set<PickerTabRule>();
    let filterCurrentRender = false;
    const overrides: Parameters<typeof overrideCxMethods>[1] = {
        useSegmentedControlState(args, invoke) {
            if (!filterCurrentRender) return invoke(args);
            const options = args[0] as {
                items?: readonly unknown[];
                defaultIndex?: number;
                onSetActiveIndex?: (index: number) => unknown;
            } | undefined;
            const selected = options?.defaultIndex;
            if (!Array.isArray(options?.items) || options.items.length !== tabs.length
                || selected == null || !Number.isInteger(selected) || selected < 0 || selected >= tabs.length
                || typeof options.onSetActiveIndex !== "function") return invoke(args);
            const visible = tabs.flatMap((tab, index) => index === selected || ![...rules].some(rule => rule.tab === tab) ? [index] : []);
            if (visible.length === tabs.length) return invoke(args);
            const { items, onSetActiveIndex } = options;
            return invoke([{
                ...options,
                items: visible.map(index => items[index]),
                defaultIndex: visible.indexOf(selected),
                onSetActiveIndex(index: number) {
                    const nativeIndex = visible[index];
                    if (nativeIndex != null) return onSetActiveIndex(nativeIndex);
                },
            }, ...args.slice(1)]);
        },
    };
    // Discord can import the hook directly or through the design barrel.
    const modules = new Set([
        findByFilePath("design/components/SegmentedControl/native/SegmentedControlState.native.tsx"),
        findByFilePath("design/native.tsx"),
    ].filter(module => typeof module?.useSegmentedControlState === "function"));
    if (!modules.size) throw new Error("Discord's segmented control is unavailable");
    const cleanups: (() => void)[] = [];
    const stop = () => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); };
    try {
        for (const module of modules) cleanups.push(overrideCxMethods(module, overrides));
    } catch (error) {
        stop();
        throw error;
    }
    function FilteredPicker({ originalProps }: { originalProps: { visibleTabs?: readonly string[]; }; }) {
        const previous = filterCurrentRender;
        const { visibleTabs } = originalProps;
        // A single-purpose picker may be opened by another Discord feature.
        filterCurrentRender = !settings.safeMode?.enabled && rules.size > 0
            && (visibleTabs === undefined || Array.isArray(visibleTabs)
                && visibleTabs.length === tabs.length && visibleTabs.every((tab, index) => tab === tabs[index]));
        try {
            return render(originalProps) as ReactNode;
        } finally {
            filterCurrentRender = previous;
        }
    }
    const wrap: AppearanceChange = element => element.type === picker
        ? <FilteredPicker key={element.key} originalProps={element.props} />
        : element;
    return { picker, rules, wrap, stop };
}

let expressionPickerBinding: ReturnType<typeof bindExpressionPickerTabs> | undefined;

function registerExpressionPickerTab(tab: PickerTab) {
    const binding = expressionPickerBinding ??= bindExpressionPickerTabs();
    const rule = { tab };
    binding.rules.add(rule);
    // A new callback also refreshes already mounted pickers when the set changes.
    const stop = registerJsxAppearance([binding.picker], element => binding.wrap(element));
    return () => {
        binding.rules.delete(rule);
        stop();
        if (!binding.rules.size) {
            binding.stop();
            expressionPickerBinding = undefined;
        }
    };
}

function registerRenderedChannelStyle(rule: {
    renderedComponents: readonly string[]; condition: "muted" | "inactive"; values: { opacity: number; };
}) {
    const wrappers = new WeakMap<object, ComponentType<{ originalProps: object; }>>();
    return registerJsxAppearance(rule.renderedComponents, element => {
        const { muted, unread } = element.props;
        if (typeof muted !== "boolean" || typeof unread !== "boolean"
            || !(muted || rule.condition === "inactive" && !unread)) return element;

        const component = element.type as { $$typeof?: symbol; type?: unknown; };
        const render = component?.$$typeof === Symbol.for("react.memo") ? component.type : component;
        if (typeof render !== "function" || render.prototype?.isReactComponent) return element;
        let wrapper = wrappers.get(component);
        if (!wrapper) {
            wrapper = function StyledChannel({ originalProps }) {
                const output = render(originalProps) as ReactNode;
                if (settings.safeMode?.enabled || !React.isValidElement<{ style?: unknown; }>(output)) return output;
                if (!("style" in output.props)) return output;
                return React.cloneElement(output, { style: [output.props.style, rule.values] });
            };
            wrappers.set(component, wrapper);
        }
        return React.createElement(wrapper, { originalProps: element.props, key: element.key });
    });
}

const profileMenuActions = new Set<{ action: CxProfileMenuAction; }>();
let stopProfileMenuHooks: (() => void) | undefined;

function patchProfileMenus() {
    const ProfileUser = React.createContext<{ id: string; guildId?: string; } | undefined>(undefined);
    function ProfileMenu({ element }: { element: React.ReactElement<{ items: unknown[][]; }>; }) {
        const user = React.useContext(ProfileUser);
        if (!user || settings.safeMode?.enabled) return element;
        const { id, guildId } = user;
        const entries = new Map([...profileMenuActions].map(entry => [entry.action, entry]));
        if (!entries.size) return element;
        const actions = [...entries.values()].flatMap(entry => {
            const { label, scope } = cxProfileMenuActions[entry.action];
            if (scope === "server" && !getCxProfileMenuCopy(entry.action, id, UserProfileStore, guildId)) return [];
            return [{ label, action: () => {
                if (!profileMenuActions.has(entry) || settings.safeMode?.enabled) return;
                const text = getCxProfileMenuCopy(entry.action, id, UserProfileStore, guildId);
                if (text) {
                    clipboard.setString(text);
                    showToast.showCopyToClipboard?.();
                } else showToast("No profile colors found.");
            } }];
        });
        return actions.length ? React.cloneElement(element, { items: [...element.props.items, actions] }) : element;
    }
    const provideUser = (_: unknown, element: JSX.Element) => {
        const id = element.props.user?.id;
        if (!isCxProfileUserId(id)) return element;
        const guildId = element.props.displayProfile?.guildId ?? element.props.channel?.getGuildId?.();
        const user = { id, guildId: isCxProfileUserId(guildId) ? guildId : undefined };
        return <ProfileUser.Provider value={user} key={element.key}>{element}</ProfileUser.Provider>;
    };
    const addMenuItems = (_: unknown, element: JSX.Element) => {
        const { items, onOpen, children } = element.props;
        return typeof onOpen === "function" && typeof children === "function" && Array.isArray(items) && items.every(Array.isArray)
            ? <ProfileMenu key={element.key} element={element} />
            : element;
    };
    onJsxCreate("UserProfileOverflowMenu", provideUser, true);
    onJsxCreate("ContextMenu", addMenuItems, true);
    return () => {
        deleteJsxCreate("ContextMenu", addMenuItems, true);
        deleteJsxCreate("UserProfileOverflowMenu", provideUser, true);
    };
}

function registerProfileMenuAction(action: CxProfileMenuAction) {
    stopProfileMenuHooks ??= patchProfileMenus();
    const entry = { action };
    profileMenuActions.add(entry);
    return () => {
        profileMenuActions.delete(entry);
        if (!profileMenuActions.size) {
            stopProfileMenuHooks?.();
            stopProfileMenuHooks = undefined;
        }
    };
}

export default function CxExtensions() {
    const [source, setSource] = React.useState("");
    const [showCatalog, setShowCatalog] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [pages, setPages] = React.useState({ Plugins: 0, Themes: 0 });
    const [status, setStatus] = React.useState("");
    const [candidate, setCandidate] = React.useState<{ source: string; review: ReturnType<typeof reviewCx>; }>();
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        setCandidate(undefined);
        try {
            setCandidate({ source: next, review: reviewCx(next) });
            setStatus("");
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    async function openFile() {
        let picker: ReturnType<typeof findByProps> | undefined;
        setCandidate(undefined);
        try {
            picker = findByProps("pickSingle", "isCancel");
            if (!picker?.pickSingle || typeof NativeFileModule?.readFile !== "function")
                throw new Error("The file picker is unavailable. Paste the .cx contents below.");
            const file = await picker.pickSingle({
                type: picker.types?.allFiles ?? "*/*",
                mode: "import",
                copyTo: "cachesDirectory",
            });
            if (!/\.cx$/i.test(file?.name ?? "") || !(file.size > 0 && file.size <= MAX_CX_SOURCE))
                throw new Error("Choose a .cx file under 512 KB.");
            if (!file.fileCopyUri?.startsWith("file:///")) throw new Error("Could not copy the selected .cx file.");
            const next = await NativeFileModule.readFile(decodeURIComponent(file.fileCopyUri.slice(7)), "utf8");
            setSource(next.length <= CX_INLINE_EDITOR_LIMIT ? next : "");
            review(next);
        } catch (error) {
            if (!picker?.isCancel?.(error)) setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    function enable() {
        if (!candidate) return;
        try {
            if (settings.safeMode?.enabled) throw new Error("CX is unavailable in Safe Mode");
            session.enable(candidate.source, {
                registerIncomingRules(rules) {
                    let active = true;
                    const context = {
                        currentUser: () => UserStore?.getCurrentUser?.()?.id,
                        channel: (id: string) => ChannelStore?.getChannel?.(id),
                        replyAuthor: (channel: string, id: string) => MessageStore?.getMessage?.(channel, id)?.author,
                        blocked: (id: string) => RelationshipStore?.isBlocked?.(id) === true,
                        ignored: (id: string) => RelationshipStore?.isIgnored?.(id) === true,
                        notify: (body: string) => setTimeout(() => {
                            if (active && !settings.safeMode?.enabled) showToast(body);
                        }, 0),
                    };
                    const social = bindCxSocialEvents(rules, {
                        currentUser: context.currentUser, notify: context.notify,
                        isFriend: id => RelationshipStore?.isFriend?.(id) === true,
                        userName: id => { const user = UserStore?.getUser?.(id); return user?.globalName || user?.username; },
                        channelName: id => ChannelStore?.getChannel?.(id)?.name,
                        voiceChannel: () => SelectedChannelStore?.getVoiceChannelId?.(),
                        joinVoice: id => findByProps("selectVoiceChannel")?.selectVoiceChannel?.(id),
                        removalActions: () => findByProps("removeRelationship"),
                        enabled: () => active && !settings.safeMode?.enabled,
                    });
                    const onIncoming: Parameters<typeof intercept>[0] = payload => {
                        try {
                            if (active && !settings.safeMode?.enabled) {
                                const patch = runCxIncomingRules(rules, payload, context);
                                if (patch !== false) social?.observe(payload);
                                return patch;
                            }
                        } catch { /* Discord must still receive its original event. */ }
                    };
                    let stop: () => void;
                    try { stop = intercept(onIncoming); }
                    catch (error) { social?.stop(); throw error; }
                    return () => { active = false; stop(); social?.stop(); };
                },
                registerProfileMenuAction,
                hideAppearanceTarget(target) {
                    const mobile = cxAppearanceTargets[target].mobile;
                    if ("renderTree" in mobile || "renderComponent" in mobile) return registerTreeAppearance(mobile);
                    if ("expressionPickerTab" in mobile) return registerExpressionPickerTab(mobile.expressionPickerTab);
                    if ("settingsRoute" in mobile) {
                        const route = findByFilePath(mobile.settingsRoute)?.default;
                        return overrideCxMethods(route, {
                            usePredicate(args, invoke) {
                                // The native visibility predicate can call React hooks.
                                invoke(args);
                                return false;
                            },
                        }, () => !settings.safeMode?.enabled);
                    }
                    if ("hideComponentPaths" in mobile) {
                        const components = mobile.hideComponentPaths.map(path => findByFilePath(path)?.default);
                        if (components.some(component => !component)) throw new Error("Discord's appearance components are unavailable");
                        return registerJsxAppearance(components, () => null);
                    }
                    if ("scrollIndicators" in mobile) {
                        const scrollViews = new Set([ScrollView, FlatList, SectionList, Animated?.ScrollView, Animated?.FlatList, Animated?.SectionList]);
                        const components = [...scrollViews].filter((component): component is NonNullable<typeof component> => component != null);
                        return registerJsxAppearance(components, element => React.cloneElement(element, {
                            showsHorizontalScrollIndicator: false,
                            showsVerticalScrollIndicator: false,
                        }));
                    }
                    if ("customStatusEmojis" in mobile) {
                        const hideBubbleEmoji = registerJsxAppearance(mobile.customStatusEmojis, element => {
                            const { customStatusActivity } = element.props;
                            if (!customStatusActivity?.emoji) return element;
                            return React.cloneElement(element, { customStatusActivity: { ...customStatusActivity, emoji: undefined } });
                        });
                        const hideActivityEmoji = registerJsxAppearance(["ActivityStatus"], element => React.cloneElement(element, { hideEmoji: true }), true);
                        return () => { hideActivityEmoji(); hideBubbleEmoji(); };
                    }
                    if ("memberActivityText" in mobile) {
                        const status = findByFilePath("modules/activity_status/native/PresenceActivityStatus.tsx")?.default;
                        if (!status) throw new Error("Discord's member activity renderer is unavailable");
                        return registerMemberRowAppearance(status, element => {
                            const type = element.props.activity?.type;
                            // Discord activity types 0 and 2 are Playing and Listening.
                            return type === 0 || type === 2 ? React.cloneElement(element, { hideText: true }) : element;
                        });
                    }
                    if ("memberCustomStatus" in mobile) {
                        const status = findByFilePath("modules/activity_status/native/ActivityStatus.tsx")?.default;
                        if (typeof status !== "function" || status.prototype?.isReactComponent) {
                            throw new Error("Discord's custom status renderer is unavailable");
                        }
                        function WithoutCustomStatus({ originalProps }: { originalProps: object; }) {
                            const output: ReactNode = status(originalProps);
                            if (settings.safeMode?.enabled || !React.isValidElement<{ children?: ReactNode; }>(output)) return output;
                            const { children } = output.props;
                            if (!Array.isArray(children) || children.length !== 3) return output;
                            const [activity, separator, custom] = children;
                            if (!React.isValidElement(custom) || custom.type !== React.Fragment
                                || separator != null && (!React.isValidElement<{ accessibilityElementsHidden?: boolean; }>(separator)
                                    || separator.props.accessibilityElementsHidden !== true)) return output;
                            // Discord renders the activity, its separator, and the custom status as three siblings.
                            return React.cloneElement(output, { children: [activity, null, null] });
                        }
                        return registerMemberRowAppearance("ActivityStatus", element => element.type === status
                            ? <WithoutCustomStatus originalProps={element.props} /> : element);
                    }
                    if ("emptyServerFolders" in mobile) {
                        return registerJsxAppearance(["GuildsBarGuildFolder"], element => {
                            const { expanded, childNodes, isDragPreview, hideExpandedChildren } = element.props;
                            return expanded === true && !isDragPreview && !hideExpandedChildren
                                && Array.isArray(childNodes) && childNodes.length === 0 ? null : element;
                        });
                    }
                    if ("mentionBadges" in mobile) {
                        const stopLegacy = registerJsxAppearance(["MentionsBadge"], () => null);
                        const stopCount = registerJsxAppearance(["Badge"], element =>
                            typeof element.props.value === "number" && element.props.value > 0
                                && "isMentionLowImportance" in element.props ? null : element);
                        return () => { stopCount(); stopLegacy(); };
                    }
                    if (!("messagePresentation" in mobile)) return registerJsxAppearance(mobile, () => null);
                    const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
                    return overrideCxMethods(renderer, {
                        default(args, invoke) {
                            const presentation = invoke(args);
                            if (!presentation || typeof presentation !== "object") return presentation;
                            if (mobile.messagePresentation === "edited") {
                                if ("edited" in presentation && presentation.edited === true) return { ...presentation, edited: false };
                            } else if (mobile.messagePresentation === "timestamps") {
                                if ("timestamp" in presentation && typeof presentation.timestamp === "string") {
                                    return { ...presentation, timestamp: undefined, timestampTooltip: undefined, timestampAccessibilityLabel: undefined };
                                }
                            } else if ("stickers" in presentation && Array.isArray(presentation.stickers) && presentation.stickers.length) {
                                return { ...presentation, stickers: [] };
                            }
                            return presentation;
                        },
                    }, () => !settings.safeMode?.enabled);
                },
                styleAppearanceTarget(target) {
                    const style = cxAppearanceTargets[target].style;
                    if ("renderedComponents" in style) return registerRenderedChannelStyle(style);
                    if ("serverIconScale" in style) {
                        const iconStyle = { transform: [{ scale: style.serverIconScale }] };
                        return registerJsxAppearance(["GuildsBarAnimatedItemWrapper"], element => {
                            const { children, preventClipping, isDragPreview } = element.props;
                            if (preventClipping || isDragPreview || !React.isValidElement<{
                                source?: unknown; style?: unknown; value?: string; size?: unknown; animate?: boolean;
                            }>(children)) return element;

                            const icon = children.props;
                            // Discord renders either a server image or a label with the server initials here.
                            if ("source" in icon && "style" in icon) {
                                return React.cloneElement(element, { children: React.cloneElement(children, { style: [icon.style, iconStyle] }) });
                            }
                            if (typeof icon.value === "string" && "size" in icon && typeof icon.animate === "boolean") {
                                return React.cloneElement(element, { children: <View style={iconStyle}>{children}</View> });
                            }
                            return element;
                        });
                    }
                    if ("spoilerOutline" in style) {
                        const spoiler = findByFilePath("modules/markup/native/Spoiler.tsx")?.default?.prototype;
                        if (typeof spoiler?.render !== "function") throw new Error("Discord's text spoiler is unavailable");
                        const outline = style.spoilerOutline;
                        const stopText = instead("render", spoiler, function (this: { state?: { revealed?: boolean; }; }, args, original) {
                            const rendered = original.apply(this, args);
                            if (settings.safeMode?.enabled || this.state?.revealed !== false || !React.isValidElement<{ style?: unknown; }>(rendered)) return rendered;
                            return React.cloneElement(rendered, { style: [rendered.props.style, outline] });
                        });
                        try {
                            const stopMedia = registerJsxAppearance(["MediaModalSpoilerOverlay"], element => element.props.source?.obscure
                                ? element : React.cloneElement(element, { style: [element.props.style, outline] }));
                            return () => { stopMedia(); stopText(); };
                        } catch (error) {
                            stopText();
                            throw error;
                        }
                    }
                    if ("component" in style) {
                        return registerJsxAppearance([style.component], element => {
                            if ("props" in style) {
                                return element.props[style.skipWhenTrue] === true ? element : React.cloneElement(element, style.props);
                            }
                            if (!("key" in style)) return React.cloneElement(element, { style: [element.props.style, style.values] });
                            const styles = element.props.styles;
                            return React.cloneElement(element, { styles: { ...styles, [style.key]: [styles?.[style.key], style.values] } });
                        });
                    }
                    if (!isThemeSupported()) throw new Error("This loader does not support color overrides");
                    return registerColorOverlay(style);
                },
                registerUploadAnonymiser,
                registerNativeEffect(effect, avatarResolution = 256) {
                    const enabled = () => !settings.safeMode?.enabled;
                    switch (effect) {
                        case "static-typing-dots":
                            return registerStaticTypingDots();
                        case "fix-file-extensions": {
                            const uploader = findByFilePath("lib/uploader/native/CloudUploader.tsx")?.default?.prototype;
                            return overrideCxMethods(uploader, {
                                uploadFiles: (args, original) => {
                                    fixCxFileExtensions(args[0]);
                                    return original(args);
                                },
                            }, enabled);
                        }
                        case "plus-reactions": {
                            const reactions = findByProps("addReaction", "removeReaction") ?? findByProps("addReaction");
                            if (typeof reactions?.addReaction !== "function") throw new Error("Discord reactions are unavailable");
                            const handle = createCxPlusReactionHandler({
                                messages: channel => MessageStore?.getMessages?.(channel),
                                guild: channel => ChannelStore?.getChannel?.(channel)?.guild_id,
                                emojis: () => EmojiStore,
                                unicode: name => findByProps("convertNameToSurrogate")?.convertNameToSurrogate(name),
                                react: (channel, message, emoji) => reactions.addReaction(channel, message, emoji),
                                error: () => { showToast("Couldn’t react to the previous message."); },
                            });
                            return instead("sendMessage", messageUtil, function (this: unknown, args, original) {
                                if (enabled()) {
                                    const result = handle(args[0], args[1], args[3]);
                                    if (result) return result;
                                }
                                return original.apply(this, args);
                            });
                        }
                        case "silent-typing":
                            return overrideCxMethods(findByProps("startTyping", "stopTyping"), {
                                startTyping: () => undefined,
                            }, enabled);
                        case "pending-friend-count":
                            return overrideCxMethods(RelationshipStore, { getPendingCount: () => 0, getPendingIncomingCount: () => 0 }, enabled);
                        case "animated-assets":
                            return animateCxAssets(findByProps("getUserAvatarURL", "getGuildIconURL"), false, enabled);
                        case "floor-relative-time":
                            return floorCxRelativeTime(findByProps("relativeTimeRounding", "locale"), enabled);
                        case "avatar-resolution":
                            return raiseCxAvatarResolution(findByProps("getUserAvatarURL", "getGuildIconURL"), avatarResolution, enabled);
                        case "stop-auto-unread":
                            return overrideCxMethods(findByStoreName("UnreadSettingNoticeStore2"), { maybeAutoUpgradeChannel: () => false }, enabled);
                    }
                },
                registerReplyPingSuppression() {
                    return onSendMessage((_message, options) => {
                        if (settings.safeMode?.enabled || !options?.messageReference) return;
                        options.allowedMentions = { parse: ["users", "roles", "everyone"], ...options.allowedMentions, replied_user: false };
                    });
                },
                registerPreviousMessageRule(rule) {
                    let active = true;
                    const editor = findByProps("editMessage", "startEditMessage");
                    if (typeof editor?.editMessage !== "function") throw new Error("Discord message edits are unavailable");
                    const currentUser = () => UserStore?.getCurrentUser?.()?.id;
                    const handle = createCxPreviousSendHandler(rule, {
                        currentUser,
                        previous(channel, own) {
                            const existing = own ? MessageStore?.getLastEditableMessage?.(channel) : MessageStore?.getLastMessage?.(channel);
                            if (existing) return existing;
                            const cache = MessageStore?.getMessages?.(channel);
                            const list = cache?.toArray?.() ?? cache?._array;
                            if (!Array.isArray(list)) return;
                            if (!own) return list[list.length - 1];
                            const me = currentUser();
                            for (let i = list.length - 1; i >= 0; i--) if (list[i]?.author?.id === me) return list[i];
                        },
                        edit: (channel, id, content) => editor.editMessage(channel, id, { content }),
                        error: () => { showToast("Couldn’t edit the previous message."); },
                    });
                    const unpatch = instead("sendMessage", messageUtil, function (this: unknown, args, original) {
                        const [channel, message, , options] = args;
                        if (active && !settings.safeMode?.enabled && typeof channel === "string") {
                            const edit = handle(channel, message?.content, Boolean(message?.tts || message?.attachments?.length
                                || message?.stickers?.length || message?.stickerIds?.length || options?.uploads?.length
                                || options?.stickers?.length || options?.messageReference || options?.replyOptions?.messageReference));
                            if (edit) return edit;
                        }
                        return original.apply(this, args);
                    });
                    return () => {
                        active = false;
                        unpatch();
                    };
                },
                registerMessageTransform(transform) {
                    return onSendMessage(message => {
                        if (!settings.safeMode?.enabled && typeof message.content === "string") message.content = transform(message.content);
                    });
                },
                registerMessageEditTransform(transform) {
                    return onEditMessage(message => {
                        if (!settings.safeMode?.enabled && typeof message.content === "string") message.content = transform(message.content);
                    });
                },
                getUserAvatarUrl(id) {
                    const user = id ? UserStore?.getUser?.(id) : UserStore?.getCurrentUser?.();
                    if (user) return findByProps("getUserAvatarURL", "getGuildIconURL")?.getUserAvatarURL(user, true, 1024);
                },
                registerCommand(name, execute, acceptsText, _sendsMessage, optionalSend, inputs) {
                    let builtIns;
                    try {
                        builtIns = commands.getBuiltInCommands(ApplicationCommandType.CHAT, true, false);
                    } catch {
                        builtIns = commands.getBuiltInCommands(Object.values(ApplicationCommandType), true, false);
                    }
                    if (builtIns.some((command: { name: string; }) => command.name === name))
                        throw new Error(`Command /${name} already exists`);
                    return registerCommand({
                        name, description: "Local CX command",
                        shouldHide: () => !settings.safeMode?.enabled,
                        options: [
                            ...(acceptsText ? [{ name: "text", description: "Text to use", type: ApplicationCommandOptionType.STRING, required: true }] : []),
                            ...inputs.map(input => ({
                                name: input.name, description: input.name.replace(/[_-]/g, " "), required: input.required,
                                type: input.type === "integer" ? ApplicationCommandOptionType.INTEGER
                                    : input.type === "boolean" ? ApplicationCommandOptionType.BOOLEAN
                                        : input.type === "user" ? ApplicationCommandOptionType.USER
                                            : input.type === "role" ? ApplicationCommandOptionType.ROLE : ApplicationCommandOptionType.STRING,
                                choices: input.choices?.map(value => ({ name: value, displayName: value, label: value, value })),
                            })),
                            ...(optionalSend ? [{ name: "send", description: "Send the result to this chat", type: ApplicationCommandOptionType.BOOLEAN }] : []),
                        ],
                        execute(args, context) {
                            if (settings.safeMode?.enabled) return;
                            const text = acceptsText ? args.find(arg => arg?.name === "text")?.value : undefined;
                            const outgoing = execute({
                                text: typeof text === "string" ? text : undefined,
                                inputs: Object.fromEntries(inputs.map(input => [input.name, args.find(arg => arg?.name === input.name)?.value])),
                                sendRequested: optionalSend && (args.find(arg => arg?.name === "send")?.value as unknown) === true,
                                reply: message => {
                                    if (!settings.safeMode?.enabled && context.channel?.id) messageUtil.sendBotMessage(context.channel.id, message);
                                },
                                lookup(name, input) {
                                    if (name === "roleMembers" || name === "randomMember") {
                                        const guild = context.guild?.id ?? ChannelStore?.getChannel?.(context.channel?.id)?.guild_id;
                                        if (name === "randomMember") {
                                            const ids: string[] = guild ? GuildMemberStore?.getMemberIds?.(guild) ?? [] : [];
                                            return formatCxRandomMember(input, ids.map(userId => ({ userId })), UserStore?.getCurrentUser?.()?.id);
                                        }
                                        return formatCxRoleMembers(input, guild, guild ? GuildMemberStore?.getMembers?.(guild) ?? [] : [],
                                            id => UserStore?.getUser?.(id));
                                    }
                                    const track = SpotifyStore?.getTrack?.();
                                    if (track) return formatCxSpotify(name, input, track);
                                    const activity = SpotifyStore?.getActivity?.();
                                    return formatCxSpotify(name, input, {
                                        id: activity?.sync_id,
                                        album: { id: activity?.metadata?.album_id },
                                        artists: [{ id: activity?.metadata?.artist_ids?.[0] }],
                                    });
                                },
                                markServersRead: () => markCxServersRead({
                                    guilds: GuildStore, channels: GuildChannelStore, threads: ActiveJoinedThreadsStore, read: ReadStateStore,
                                }, channels => { FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels }); }),
                                friendInvites: operation => runCxFriendInvites(operation, findByProps("createFriendInvite")),
                                copyDiagnostics: async () => describeCcpReport(await copyCcpReport()),
                            });
                            if (outgoing !== undefined) return { content: outgoing };
                        },
                    });
                },
                toast: message => { showToast(message); },
                applyTheme(theme) {
                    if (!isThemeSupported()) throw new Error("This loader does not support themes");
                    const palette = (value: string) => [value, value];
                    const surface = theme.surface ?? theme.background;
                    const sidebar = theme.sidebar ?? surface;
                    updateBunnyColor({
                        name: theme.name,
                        spec: 2,
                        semanticColors: {
                            BACKGROUND_PRIMARY: palette(theme.background),
                            BACKGROUND_SECONDARY: palette(surface),
                            BACKGROUND_TERTIARY: palette(sidebar),
                            BACKGROUND_BASE_LOW: palette(theme.background),
                            BACKGROUND_BASE_LOWER: palette(surface),
                            BACKGROUND_BASE_LOWEST: palette(sidebar),
                            ...(theme.text ? { TEXT_NORMAL: palette(theme.text), TEXT_PRIMARY: palette(theme.text), TEXT_DEFAULT: palette(theme.text), TEXT_STRONG: palette(theme.text) } : {}),
                            ...(theme.muted ? { TEXT_MUTED: palette(theme.muted), TEXT_SECONDARY: palette(theme.muted), TEXT_SUBTLE: palette(theme.muted) } : {}),
                            ...(theme.accent ? { TEXT_LINK: palette(theme.accent) } : {}),
                            ...Object.fromEntries(Object.entries(theme.semanticColors ?? {}).map(([token, color]) => [token, palette(color)])),
                        },
                        ...(theme.rawColors ? { rawColors: { ...theme.rawColors } } : {}),
                        ...(theme.wallpaper ? { background: { url: theme.wallpaper, alpha: theme.wallpaperOpacity ?? 1, blur: theme.wallpaperBlur } } : {}),
                    }, { mode: theme.mode });
                    return () => updateBunnyColor(getCurrentTheme()?.data ?? null);
                },
            }, candidate.review.permissions);
            setStatus(`${candidate.review.name} is active for this session.`);
            setCandidate(undefined);
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        <Stack spacing={16}>
            <TableRowGroup title="CX catalog">
                <TableRow label={showCatalog ? "Hide catalog" : "Browse catalog"} subLabel={`${cxCatalog.plugins.length} plugins · ${cxCatalog.themes.length} themes`}
                    onPress={() => setShowCatalog(!showCatalog)} />
            </TableRowGroup>
            {showCatalog && <>
                <TextInput accessibilityLabel="Search CX catalog" placeholder="Search CX catalog" placeholderTextColor="#b5bac1"
                    value={search} onChangeText={value => { setSearch(value); setPages({ Plugins: 0, Themes: 0 }); }}
                    autoCorrect={false} style={{ color: "#fff", backgroundColor: "#27282d", padding: 12 }} />
                {([["Plugins", cxCatalog.plugins], ["Themes", cxCatalog.themes]] as const).map(([kind, entries]) => {
                    const matches = entries.filter(entry => entry.name.toLowerCase().includes(searchText));
                    const page = pages[kind];
                    const start = page * 12;
                    return <TableRowGroup key={kind} title={kind}>
                        {matches.slice(start, start + 12).map(entry => <TableRow key={entry.name} label={entry.name} onPress={() => {
                            setShowCatalog(false);
                            setSource(entry.source.length <= CX_INLINE_EDITOR_LIMIT ? entry.source : "");
                            review(entry.source);
                        }} />)}
                        {page > 0 && <TableRow label={`Previous ${kind.toLowerCase()} page`} onPress={() => setPages({ ...pages, [kind]: page - 1 })} />}
                        {start + 12 < matches.length && <TableRow label={`Next ${kind.toLowerCase()} page`} onPress={() => setPages({ ...pages, [kind]: page + 1 })} />}
                        {!matches.length && <TableRow label="No matches" />}
                    </TableRowGroup>;
                })}
            </>}
            <Text style={{ color: "#b5bac1" }}>Paste the contents of a .cx file to review it.</Text>
            <TextInput
                accessibilityLabel="CX source"
                placeholder={'theme "Midnight":'}
                placeholderTextColor="#b5bac1"
                value={source}
                maxLength={MAX_CX_SOURCE}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                style={{ color: "#fff", backgroundColor: "#27282d", minHeight: 140, padding: 12 }}
                onChangeText={value => { setCandidate(undefined); setSource(value); }}
            />
            <TableRowGroup title="CX Extensions">
                <TableRow label="Open a .cx file" onPress={openFile} />
                <TableRow label="Review CX" onPress={() => review(source)} />
                {candidate && <TableRow
                    label={candidate.review.name}
                    subLabel={[...candidate.review.effects, ...(candidate.review.commands ?? [])].join("\n")}
                />}
                {candidate && <TableRow label="Allow for this session" onPress={enable} />}
                {candidate && !source && <TableRow label="Edit CX source" onPress={() => setSource(candidate.source)} />}
                {session.list().map(({ id, name }) => <TableRow key={id} label={`Disable ${name}`} onPress={() => {
                    session.disable(id);
                    setStatus(`${name} disabled.`);
                }} />)}
            </TableRowGroup>
            <Text accessibilityLiveRegion="polite" style={{ color: "#b5bac1" }}>{status}</Text>
        </Stack>
    </ScrollView>;
}

