/** Bound an async load even when its transport ignores cancellation. */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 12000, message = "Loading took too long. Check your connection and retry."): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
        Promise.resolve(promise),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
    ]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
}
