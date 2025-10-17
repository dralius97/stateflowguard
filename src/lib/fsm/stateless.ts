import EventEmitter from "node:events";
import { FSMError } from "../../error"
import { Context, EventOfStateless, ExecutionMode, Mode, Option, StatelessSchema, TransitionResult } from "../../types"
import { FSMCore } from "../core/fsmcore"
import { FSMCache } from "../cache/cache";
import { Helpers } from "../core/helpers";
import { Cannonizer, Validator } from "../bootstrap";

export class StatelessFSM<T extends StatelessSchema> extends EventEmitter {
    private mode: Mode
    private FSMCore: FSMCore<T>
    private cache: FSMCache | null
    private common: Helpers
    private validator: Validator | null
    private cannonizer: Cannonizer | null
    private executionMode: ExecutionMode
    constructor(schema: T, option?: Option) {
        super(schema)
        this.mode = option?.mode || 'loose'
        this.cache = option?.useCache ? new FSMCache(option.cacheLimit || 10, option.cacheDuration || 10000) : null
        this.cannonizer = new Cannonizer()
        this.common = new Helpers()
        this.validator = option?.mode == 'strict' ? new Validator() : null
        this.executionMode = option?.executionMode || 'deep'
        this.FSMCore = this.init(schema)
    }
    private init(schema: T): FSMCore<T> {
        if (this.mode === 'strict' && this.validator) {
            this.validator.schemaValidator('SL', schema)
            this.validator = null
        }

        let useHash = false
        let guardMap = undefined
        if (this.executionMode != 'deep') {
            if (!this.cannonizer) throw new FSMError('UNEXPECTED_ERROR', 'UNEXPECTED_ERROR', 'cannonizer is missing');
            guardMap = this.cannonizer.cannonize(schema);
            useHash = true
        }
        this.cannonizer = null
        return new FSMCore(schema, guardMap, useHash);
    }
    private requestValidator(ctx: Context) {
        if (!ctx.event || typeof ctx.event !== 'string') throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `Event must be string`);
        if (ctx.eventContext && !this.common.isObject(ctx.eventContext)) throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `EventContext must be an object`);
        if (ctx.stateContext && !this.common.isObject(ctx.stateContext)) throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `StateContext must be an object`);
    }
    public validate<K extends keyof T>(currState: K, ctx: Context & { event: EventOfStateless<T, K> })
        : TransitionResult {
        try {
            if (this.mode === 'strict') this.requestValidator(ctx);
            this.emit('onEnter', { currentState: currState, ctx })
            let setCache = false
            if (this.cache) {
                const cacheResult = this.cache.get({ state: currState as string, ...ctx })
                if (cacheResult) {
                    const sanitizedCache = Object.fromEntries(
                        Object.entries(cacheResult).filter(([_, val]) => val !== undefined)) as TransitionResult

                    this.emit(sanitizedCache.isValid ? 'success' : 'invalid', {
                        ...ctx,
                        ...sanitizedCache,
                        currentState: currState
                    })
                    return sanitizedCache

                };
                setCache = true
            }
            let result = this.FSMCore.start(currState as string, ctx)
            const transitionDef = this.FSMCore.transition[currState]
            const doFallback = typeof transitionDef !== 'string'  && !result.isValid && ('FALLBACK' in transitionDef.transition)
            if (doFallback) {
                this.emit('onFallback', {
                    ...ctx,
                    ...result,
                    currentState: currState
                })
                result = this.FSMCore.start(currState as string, { event: 'FALLBACK', eventContext: ctx.eventContext, stateContext: ctx.stateContext })
            }
            this.emit(result.isValid ? 'success' : 'invalid', {
                ...ctx,
                ...result,
                currentState: currState
            })
            if (this.cache && setCache) {
                this.cache.set({ state: currState as string, ...ctx }, result)
            }
            this.emit('onExit', { currentState: currState, ctx })
            return result
        } catch (error) {
            this.emit('error', error)
            throw new FSMError('Unexpected_Error', 'UNEXPECTED_ERROR', error)
        }
    }
}