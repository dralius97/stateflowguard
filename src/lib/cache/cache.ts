import crypto from 'crypto'
import { CachePayload, Context, TransitionResult } from '../../types'
import { Helpers } from '../core/helpers'

export class FSMCache {
    private cache: Map<string, CachePayload>
    private cacheLimit: number
    private readonly cacheSweeper: NodeJS.Timeout
    private duration: number
    private Helpers: Helpers
    constructor(limit: number, duration: number) {
        this.cache = new Map()
        this.cacheLimit = Math.min(limit, 100)
        this.cacheSweeper = setInterval(() => this.sweep(), 500);
        this.duration = Math.min(duration, 60000)
        this.Helpers = new Helpers()
    }
    private sweep() {
        const now = Date.now();
        for (const [k, v] of this.cache) {
            if (v.expired <= now) this.cache.delete(k);
        }
    }
    private deleteExpiredWhenFull() {
        if (this.cache.size > this.cacheLimit) {
            let isDeleted = false
            const now = Date.now()
            for (const [k, v] of this.cache) {
                if (v.expired <= now) {
                    isDeleted = true
                    this.cache.delete(k)
                    break;
                }
            }
            if (!isDeleted) this.cache.delete(this.cache.keys().next().value!)
        }
    }
    public set(ctx: { state: string } & Context, value: TransitionResult) {
        const key = this.Helpers.hash(`${ctx.state}:${ctx.event}:${JSON.stringify(ctx.eventContext)}:${JSON.stringify(ctx.stateContext)}`)
        this.cache.set(key, {
            ...value,
            expired: Date.now() + this.duration
        })
        this.deleteExpiredWhenFull()
    };

    public get(ctx: { state: string } & Context): TransitionResult | false {
        const key = this.Helpers.hash(`${ctx.state}:${ctx.event}:${JSON.stringify(ctx.eventContext)}:${JSON.stringify(ctx.stateContext)}`)
        const data = this.cache.get(key)
        return data && data.expired >= Date.now() ? {
            isValid: data.isValid,
            message: data.message,
            reason: data.reason,
            next: data.next,
            code: data.code
        } as TransitionResult : false
    };

    public count() {
        return this.cache.size
    };

    public dispose() {
        clearInterval(this.cacheSweeper);
    }
}