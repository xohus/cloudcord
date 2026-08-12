import { useProxy } from "@core/vendetta/storage";
import { botCordState, setActiveBotAccount, updateBotCordSwitcher } from "@lib/api/botcord";
import { onJsxCreate, deleteJsxCreate } from "@lib/api/react/jsx";
import React, { useMemo, useRef, useState } from "react";
import { Animated, Image, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";

function avatarUrl(account: any) {
    return account?.avatar ? `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.png?size=128` : null;
}

function FloatingBotSwitcher() {
    const state = useProxy(botCordState);
    const accounts = state.accounts ?? [];
    const settings = state.switcher ?? { enabled: true, x: 12, y: 180, size: 58 };
    const { width, height } = useWindowDimensions();
    const [expanded, setExpanded] = useState(false);
    const position = useRef(new Animated.ValueXY({ x: settings.x, y: settings.y })).current;
    const start = useRef({ x: settings.x, y: settings.y });

    const active = useMemo(() => accounts.find(a => a.id === state.activeAccountId) ?? accounts[0] ?? null, [accounts, state.activeAccountId]);
    const size = Math.max(46, Math.min(92, settings.size || 58));

    const pan = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
            position.stopAnimation((v: any) => { start.current = { x: v.x, y: v.y }; });
        },
        onPanResponderMove: (_e, g) => {
            position.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy });
        },
        onPanResponderRelease: (_e, g) => {
            const x = Math.max(6, Math.min(width - size - 6, start.current.x + g.dx));
            const y = Math.max(54, Math.min(height - size - 24, start.current.y + g.dy));
            position.setValue({ x, y });
            updateBotCordSwitcher({ x, y });
        }
    }), [height, position, size, width]);

    if (!settings.enabled || !active || accounts.length === 0) return null;

    return <Animated.View
        pointerEvents="box-none"
        {...pan.panHandlers}
        style={{ position: "absolute", zIndex: 2147483647, elevation: 9999, transform: position.getTranslateTransform() }}
    >
        {expanded && <View style={{
            position: "absolute",
            bottom: size + 10,
            right: 0,
            width: Math.max(210, size * 3.8),
            padding: 10,
            gap: 7,
            borderRadius: 16,
            backgroundColor: "rgba(20,20,24,0.96)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)"
        }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>BotCord</Text>
            {accounts.map(account => {
                const uri = avatarUrl(account);
                const selected = account.id === active.id;
                return <Pressable key={account.id} onPress={() => setActiveBotAccount(account.id)} style={{
                    flexDirection: "row", alignItems: "center", gap: 9, padding: 8, borderRadius: 10,
                    backgroundColor: selected ? "rgba(88,101,242,0.34)" : "rgba(255,255,255,0.06)"
                }}>
                    {uri ? <Image source={{ uri }} style={{ width: 30, height: 30, borderRadius: 15 }} /> : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#5865F2", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white" }}>🤖</Text></View>}
                    <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: "white", fontWeight: selected ? "700" : "500" }}>{account.username}</Text><Text style={{ color: "#aeb1b8", fontSize: 11 }}>{selected ? "Active bot" : "Tap to switch"}</Text></View>
                </Pressable>;
            })}
            <View style={{ flexDirection: "row", gap: 7 }}>
                <Pressable onPress={() => updateBotCordSwitcher({ size: Math.max(46, size - 6) })} style={{ flex: 1, padding: 8, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center" }}><Text style={{ color: "white", fontWeight: "700" }}>−</Text></Pressable>
                <Pressable onPress={() => updateBotCordSwitcher({ size: Math.min(92, size + 6) })} style={{ flex: 1, padding: 8, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center" }}><Text style={{ color: "white", fontWeight: "700" }}>+</Text></Pressable>
            </View>
        </View>}
        <Pressable onPress={() => setExpanded(v => !v)} style={{
            width: size, height: size, borderRadius: size / 2, overflow: "hidden",
            alignItems: "center", justifyContent: "center", backgroundColor: "#5865F2",
            borderWidth: 2, borderColor: "rgba(255,255,255,0.85)"
        }}>
            {avatarUrl(active) ? <Image source={{ uri: avatarUrl(active)! }} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * 0.46 }}>🤖</Text>}
        </Pressable>
    </Animated.View>;
}

const inject = (_Component: any, ret: JSX.Element) => React.createElement(React.Fragment, null, ret, React.createElement(FloatingBotSwitcher));

export function initBotCordSwitcher() {
    onJsxCreate("App", inject);
    return () => deleteJsxCreate("App", inject);
}
