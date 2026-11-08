export type CxUploadNaming = { manual: boolean; } & (
    { mode: "random"; length: number; } | { mode: "consistent"; basename: string; } | { mode: "timestamp"; }
    | { mode: "format"; template: string; length: number; casing?: "lowercase" | "uppercase"; }
);

type Upload = { filename: string; item?: object; spoiler?: boolean; };
const characters = "0123456789bdfhjkmnpqrstvwxz";
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const identity = (upload: Upload) => isObject(upload.item) ? upload.item : upload;

function randomName(length: number, alphabet = characters) {
    return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function formatName(rule: CxUploadNaming, original: string) {
    switch (rule.mode) {
        case "consistent": return rule.basename;
        case "timestamp": return String(Date.now());
        case "random": return randomName(rule.length);
        case "format": {
            const values = {
                random: randomName(rule.length, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"),
                timestamp: String(Date.now()),
                original: original.replace(/[^\p{L}\p{N}_.-]+/gu, "_").slice(0, 48),
            };
            let formatted = rule.template.replace(/\{(random|timestamp|original)\}/g, (_, key: keyof typeof values) => values[key]);
            if (rule.casing === "lowercase") formatted = formatted.toLowerCase();
            if (rule.casing === "uppercase") formatted = formatted.toUpperCase();
            return formatted.slice(0, 96).replace(/^spoiler_/i, "_") || values.random;
        }
    }
}

// AnonymiseFileNames by fawn (GPL-3.0-or-later).
export function createCxUploadAnonymiser(rule: CxUploadNaming) {
    const choices = new WeakMap<object, boolean>();
    const names = new WeakMap<object, { original: string; basename: string; wasSpoiler: boolean; }>();
    let spoilers = false;
    function isAnonymous(upload: Upload) {
        return choices.get(upload) ?? choices.get(identity(upload)) ?? !rule.manual;
    }
    function apply(files: unknown) {
        if (!Array.isArray(files)) return;
        const changed: { upload: Upload; previous: string; }[] = [];
        try {
            for (const upload of files as Upload[]) {
                if (!isObject(upload)) continue;
                const rename = isAnonymous(upload);
                const before = upload.filename;
                if (typeof before !== "string") {
                    if (rename) throw new Error("Could not anonymise an attachment filename");
                    continue;
                }
                const cached = names.get(upload);
                const unprefixed = before.replace(/^SPOILER_/, "");
                const suffix = /(?:\.tar\.[a-z0-9]+|\.[a-z0-9]+)$/i.exec(unprefixed);
                const extension = suffix?.index ? suffix[0] : "";
                const original = cached?.original ?? unprefixed.slice(0, unprefixed.length - extension.length);
                const wasSpoiler = cached?.wasSpoiler ?? before.startsWith("SPOILER_");
                const basename = cached?.basename ?? formatName(rule, original);
                const prefix = spoilers || upload.spoiler || wasSpoiler ? "SPOILER_" : "";
                const sent = prefix + (rename ? basename : original) + extension;
                if (sent !== before) {
                    changed.push({ upload, previous: before });
                    upload.filename = sent;
                    if (upload.filename !== sent) throw new Error("Could not anonymise an attachment filename");
                }
                names.set(upload, { original, basename, wasSpoiler });
            }
        } catch (error) {
            for (const { upload, previous } of changed.reverse()) {
                try { upload.filename = previous; } catch { /* Discord has not started the upload. */ }
            }
            throw error;
        }
    }
    return {
        apply,
        isAnonymous,
        setAnonymous(upload: Upload, value: boolean) {
            choices.set(upload, value);
            choices.set(identity(upload), value);
        },
        setSpoilers(value?: boolean) {
            spoilers = value ?? !spoilers;
            return spoilers;
        },
    };
}

export type CxUploadAnonymiser = ReturnType<typeof createCxUploadAnonymiser>;
