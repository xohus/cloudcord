import { React } from "@webpack/common";

const PAGE_SIZE = 36;

export function usePluginPagination(total: number, filterKey: string, sentinelVisible: boolean) {
    const [page, setPage] = React.useState({ key: filterKey, count: PAGE_SIZE });
    if (page.key !== filterKey) setPage({ key: filterKey, count: PAGE_SIZE });
    // Reset during rendering rather than an effect, so a new search never
    // mounts hundreds of cards for one frame before being reduced again.
    const visibleCount = Math.min(total, page.key === filterKey ? page.count : PAGE_SIZE);
    const loadMore = React.useCallback(() => {
        setPage(previous => ({
            key: filterKey,
            count: Math.min(total, (previous.key === filterKey ? previous.count : PAGE_SIZE) + PAGE_SIZE)
        }));
    }, [total, filterKey]);

    React.useEffect(() => {
        if (!sentinelVisible || visibleCount >= total) return;
        const timer = setTimeout(loadMore, 100);
        return () => clearTimeout(timer);
    }, [sentinelVisible, visibleCount, total, filterKey, loadMore]);

    return { visibleCount, loadMore };
}
