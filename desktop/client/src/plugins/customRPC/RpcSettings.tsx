/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./settings.css";

import { isPluginEnabled } from "@api/PluginManager";
import { Heading } from "@components/Heading";
import { resolveError } from "@components/settings/tabs/plugins/components/Common";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { ActivityType } from "@vencord/discord-types/enums";
import { Select, Text, TextInput, useState } from "@webpack/common";

import CustomRPCPlugin, { setRpc, settings, TimestampMode } from ".";

const cl = classNameFactory("vc-customRPC-settings-");

type SettingsKey = keyof typeof settings.store;

interface TextOption<T> {
    settingsKey: SettingsKey;
    label: string;
    disabled?: boolean;
    transform?: (value: string) => T;
    isValid?: (value: T) => true | string;
}

interface SelectOption<T> {
    settingsKey: SettingsKey;
    label: string;
    disabled?: boolean;
    options: { label: string; value: T; default?: boolean; }[];
}

const makeValidator = (maxLength: number, isRequired = false) => (value: string) => {
    if (isRequired && !value) return "This field is required.";
    if (value.length > maxLength) return `Must be not longer than ${maxLength} characters.`;
    return true;
};

const maxLength128 = makeValidator(128);

function isAppIdValid(value: string) {
    if (!/^\d{16,21}$/.test(value)) return "Must be a valid Discord ID.";
    return true;
}

const updateRPC = debounce(() => {
    setRpc(true);
    if (isPluginEnabled(CustomRPCPlugin.name)) setRpc();
});

function isStreamLinkDisabled() {
    return settings.store.type !== ActivityType.STREAMING;
}

function isStreamLinkValid(value: string) {
    if (!isStreamLinkDisabled() && !/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(value)) return "Streaming link must be a valid URL.";
    if (value && value.length > 512) return "Streaming link must be not longer than 512 characters.";
    return true;
}

function parseNumber(value: string) {
    return value ? parseInt(value, 10) : 0;
}

function isNumberValid(value: number) {
    if (isNaN(value)) return "Must be a number.";
    if (value < 0) return "Must be a positive number.";
    return true;
}

function isUrlValid(value: string) {
    if (value && !/^https?:\/\/.+/.test(value)) return "Must be a valid URL.";
    return true;
}

function isImageKeyValid(value: string) {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(value)) return "Don't use a Discord link. Use an Imgur image link instead.";
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgur link must be a direct link to the image (e.g. https://i.imgur.com/...). Right click the image and click 'Copy image address'";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenor link must be a direct link to the image (e.g. https://media.tenor.com/...). Right click the GIF and click 'Copy image address'";
    return true;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode; }) {
    return (
        <section className={cl("section")}>
            <Heading tag="h3" className={cl("section-title")}>{title}</Heading>
            {hint && <Text variant="text-sm/normal" className={cl("hint")}>{hint}</Text>}
            {children}
        </section>
    );
}

const TYPE_LABEL: Record<number, string> = {
    [ActivityType.PLAYING]: "Playing",
    [ActivityType.STREAMING]: "Streaming",
    [ActivityType.LISTENING]: "Listening to",
    [ActivityType.WATCHING]: "Watching",
    [ActivityType.COMPETING]: "Competing in",
};

const previewImage = (value?: string) => value && /^https?:\/\//.test(value) ? value : undefined;

// A live card that mirrors what friends will see on your profile.
function ActivityPreview() {
    const s = settings.use();
    const big = previewImage(s.imageBig);
    const small = previewImage(s.imageSmall);
    const buttons = [s.buttonOneText, s.buttonTwoText].filter(Boolean);
    return (
        <div className={cl("preview")}>
            <Text variant="text-xs/semibold" className={cl("preview-type")}>{(TYPE_LABEL[s.type ?? 0] ?? "Playing").toUpperCase()}</Text>
            <div className={cl("preview-body")}>
                <div className={cl("preview-art")}>
                    {big ? <img src={big} alt="" className={cl("preview-big")} /> : <div className={cl("preview-big", "preview-empty")}>{s.imageBig ? "Key" : "No image"}</div>}
                    {small && <img src={small} alt="" className={cl("preview-small")} />}
                </div>
                <div className={cl("preview-text")}>
                    <Text variant="text-md/semibold">{s.appName || "Application name"}</Text>
                    {s.details && <Text variant="text-sm/normal">{s.details}</Text>}
                    {s.state && <Text variant="text-sm/normal">{s.state}{s.partySize && s.partyMaxSize ? ` (${s.partySize} of ${s.partyMaxSize})` : ""}</Text>}
                    {s.timestampMode !== TimestampMode.NONE && <Text variant="text-xs/normal" className={cl("hint")}>00:00 elapsed</Text>}
                </div>
            </div>
            {buttons.length > 0 && <div className={cl("preview-buttons")}>{buttons.map((label, i) => <div key={i} className={cl("preview-button")}>{label}</div>)}</div>}
        </div>
    );
}

function ImagePair({ keyName, label }: { keyName: "imageBig" | "imageSmall"; label: string; }) {
    const s = settings.use();
    const url = previewImage(s[keyName]);
    return (
        <div className={cl("image-row")}>
            <div className={cl("thumb")}>{url ? <img src={url} alt="" /> : <span>{label === "Large image" ? "L" : "S"}</span>}</div>
            <div className={cl("image-fields")}>
                <PairSetting data={[
                    { settingsKey: keyName, label: `${label} link`, isValid: isImageKeyValid },
                    { settingsKey: `${keyName}Tooltip` as SettingsKey, label: "Hover text", isValid: maxLength128 },
                ]} />
                <SingleSetting settingsKey={`${keyName}URL` as SettingsKey} label="Opens when clicked (optional)" isValid={isUrlValid} />
            </div>
        </div>
    );
}

function PairSetting<T>(props: { data: [TextOption<T>, TextOption<T>]; }) {
    const [left, right] = props.data;

    return (
        <div className={cl("pair")}>
            <SingleSetting {...left} />
            <SingleSetting {...right} />
        </div>
    );
}

function SingleSetting<T>({ settingsKey, label, disabled, isValid, transform }: TextOption<T>) {
    const [state, setState] = useState(settings.store[settingsKey] ?? "");
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: any) {
        if (transform) newValue = transform(newValue);

        const valid = isValid?.(newValue) ?? true;

        setState(newValue);
        setError(resolveError(valid));

        if (valid === true) {
            settings.store[settingsKey] = newValue;
            updateRPC();
        }
    }

    return (
        <div className={cl("single", { disabled })}>
            <Heading tag="h5">{label}</Heading>
            <TextInput
                type="text"
                placeholder={"Enter a value"}
                value={state}
                onChange={handleChange}
                disabled={disabled}
            />
            {error && <Text className={cl("error")} variant="text-sm/normal">{error}</Text>}
        </div>
    );
}

function SelectSetting<T>({ settingsKey, label, options, disabled }: SelectOption<T>) {
    return (
        <div className={cl("single", { disabled })}>
            <Heading tag="h5">{label}</Heading>
            <Select
                placeholder={"Select an option"}
                options={options}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={v => settings.store[settingsKey] = v}
                isSelected={v => v === settings.store[settingsKey]}
                serialize={v => String(v)}
                isDisabled={disabled}
            />
        </div>
    );
}

export function RPCSettings() {
    const s = settings.use();

    return (
        <div className={cl("root")}>
            <ActivityPreview />

            <Section title="Activity" hint="What it says you are doing.">
            <SelectSetting
                settingsKey="type"
                label="Activity Type"
                options={[
                    {
                        label: "Playing",
                        value: ActivityType.PLAYING,
                        default: true
                    },
                    {
                        label: "Streaming",
                        value: ActivityType.STREAMING
                    },
                    {
                        label: "Listening",
                        value: ActivityType.LISTENING
                    },
                    {
                        label: "Watching",
                        value: ActivityType.WATCHING
                    },
                    {
                        label: "Competing",
                        value: ActivityType.COMPETING
                    }
                ]}
            />

            <PairSetting data={[
                { settingsKey: "appID", label: "Application ID", isValid: isAppIdValid },
                { settingsKey: "appName", label: "Application Name", isValid: makeValidator(128, true) },
            ]} />

            <PairSetting data={[
                { settingsKey: "details", label: "First line", isValid: maxLength128 },
                { settingsKey: "detailsURL", label: "First line link", isValid: isUrlValid },
            ]} />

            <PairSetting data={[
                { settingsKey: "state", label: "Second line", isValid: maxLength128 },
                { settingsKey: "stateURL", label: "Second line link", isValid: isUrlValid },
            ]} />

            <SingleSetting
                settingsKey="streamLink"
                label="Stream link (Twitch channel or YouTube video, Streaming only)"
                disabled={s.type !== ActivityType.STREAMING}
                isValid={isStreamLinkValid}
            />

            <PairSetting data={[
                {
                    settingsKey: "partySize",
                    label: "Party Size",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.type !== ActivityType.PLAYING,
                },
                {
                    settingsKey: "partyMaxSize",
                    label: "Maximum Party Size",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.type !== ActivityType.PLAYING,
                },
            ]} />

            </Section>

            <Section title="Images" hint="Paste a direct image link, for example from Imgur (right-click the picture, Copy image address). Discord links expire, so they are not accepted. GIFs work.">
            <ImagePair keyName="imageBig" label="Large image" />
            <ImagePair keyName="imageSmall" label="Small image" />
            </Section>

            <Section title="Buttons" hint="Up to two buttons. Other people can click them; you can't click your own.">

            <PairSetting data={[
                { settingsKey: "buttonOneText", label: "Button 1 text", isValid: makeValidator(31) },
                { settingsKey: "buttonOneURL", label: "Button 1 link", isValid: isUrlValid },
            ]} />
            <PairSetting data={[
                { settingsKey: "buttonTwoText", label: "Button 2 text", isValid: makeValidator(31) },
                { settingsKey: "buttonTwoURL", label: "Button 2 link", isValid: isUrlValid },
            ]} />

            </Section>

            <Section title="Time">
            <SelectSetting
                settingsKey="timestampMode"
                label="Timestamp Mode"
                options={[
                    {
                        label: "None",
                        value: TimestampMode.NONE,
                        default: true
                    },
                    {
                        label: "Since discord open",
                        value: TimestampMode.NOW
                    },
                    {
                        label: "Same as your current time (not reset after 24h)",
                        value: TimestampMode.TIME
                    },
                    {
                        label: "Custom",
                        value: TimestampMode.CUSTOM
                    }
                ]}
            />

            <PairSetting data={[
                {
                    settingsKey: "startTime",
                    label: "Start Timestamp (in milliseconds)",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.timestampMode !== TimestampMode.CUSTOM,
                },
                {
                    settingsKey: "endTime",
                    label: "End Timestamp (in milliseconds)",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.timestampMode !== TimestampMode.CUSTOM,
                },
            ]} />
            </Section>
        </div>
    );
}
