export const cxProfileMenuActions = {
    "user-url": { label: "Copy User URL", format: (id: string) => "<https://discord.com/users/" + id + ">" },
    "user-mention": { label: "Copy User Mention", format: (id: string) => "<@" + id + ">" },
} as const;

export type CxProfileMenuAction = keyof typeof cxProfileMenuActions;

export function isCxProfileUserId(id: unknown): id is string {
    return typeof id === "string" && /^\d{17,20}$/.test(id);
}
