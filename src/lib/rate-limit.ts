import { LRUCache } from 'lru-cache';

type Options = {
    uniqueTokenPerInterval?: number;
    interval?: number;
};

export default function rateLimit(options?: Options) {
    const tokenCache = new LRUCache<string, number>({
        max: options?.uniqueTokenPerInterval || 500,
        ttl: options?.interval || 60000,
    });

    return {
        check: (limit: number, token: string) =>
            new Promise<void>((resolve, reject) => {
                const tokenCount = tokenCache.get(token) || 0;
                const newCount = tokenCount + 1;

                tokenCache.set(token, newCount);

                const isRateLimited = newCount > limit;
                if (isRateLimited) {
                    // Calculate retry-after time
                    const ttl = options?.interval || 60000;
                    const retryAfter = Math.ceil(ttl / 1000);
                    reject(new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`));
                } else {
                    resolve();
                }
            }),
    };
}
