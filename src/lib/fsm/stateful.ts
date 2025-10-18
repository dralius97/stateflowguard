import EventEmitter from "node:events";
import { AllEventsOf, Context, ExecutionMode, Mode, StatefulOption, StatefulSchema, StateHistory, TransitionResult } from "../../types"
import { FSMCore } from "../core/fsmcore"
import { FSMError } from "../../error"
import { FSMCache } from "../cache/cache";
import { Validator, Cannonizer } from "../bootstrap";
import { Helpers } from "../core/helpers";

export class StatefulFSM<T extends StatefulSchema['state']> extends EventEmitter {
    private mode: Mode
    private historyMaxLength: number
    private currentState: string
    private stateHistory: StateHistory[]
    private FSMCore: FSMCore<T>
    private cache: FSMCache | null
    private common: Helpers
    private validator: Validator | null
    private cannonizer: Cannonizer | null
    private executionMode: ExecutionMode
    constructor(schema: { initial: string, state: T }, option?: StatefulOption) {
        super()
        this.mode = option?.mode || 'loose'
        this.historyMaxLength = Math.min(option?.historyLength || 10, 100)
        this.currentState = schema.initial
        this.stateHistory = [{ state: schema.initial, fromEvent: 'initial' }]
        this.cannonizer = new Cannonizer()
        this.cache = option?.useCache ? new FSMCache(option?.cacheLimit || 10, option.cacheDuration || 10000) : null
        this.common = new Helpers()
        this.validator = option?.mode == 'strict' ? new Validator() : null
        this.executionMode = option?.executionMode || 'deep'
        this.FSMCore = this.init(schema)
    }

    private requestValidator(ctx: Context) {
        if (!ctx.event || typeof ctx.event !== 'string') throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `Event must be string`);
        if (ctx.eventContext && !this.common.isObject(ctx.eventContext)) throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `EventContext must be an object`);
        if (ctx.stateContext && !this.common.isObject(ctx.stateContext)) throw new FSMError('Schema Invalid', 'REQUEST_ERROR', `StateContext must be an object`);
    }
    private init(schema: { initial: string, state: T }) {
        if (this.mode === 'strict' && this.validator) {
            try {
                this.validator.schemaValidator('SF', schema);
            } catch (error) {
                if (error instanceof FSMError) throw error
                throw new FSMError('Unexpected_Error', 'UNEXPECTED_ERROR', error)
            }
            this.validator = null
        }

        let useHash = false
        let guardMap = undefined
        if (this.executionMode != 'deep') {
            if (!this.cannonizer) throw new FSMError('UNEXPECTED_ERROR', 'UNEXPECTED_ERROR', 'cannonizer is missing');
            guardMap = this.cannonizer.cannonize(schema.state);
            useHash = true
        }
        this.cannonizer = null
        return new FSMCore(schema.state, guardMap, useHash);
    }
    public validate<K extends T>(ctx: Context & { event: AllEventsOf<T> })
        : TransitionResult {
        try {
            if (this.mode === 'strict') this.requestValidator(ctx);
            this.emit('onEnter', { currentState: this.currentState, ctx })
            let setCache = false
            if (this.cache) {
                const cacheResult = this.cache.get({ state: this.currentState, ...ctx })
                if (cacheResult) {
                    const sanitizedCache = Object.fromEntries(
                        Object.entries(cacheResult).filter(([_, val]) => val !== undefined)) as TransitionResult

                    this.emit(sanitizedCache.isValid ? 'success' : 'invalid', {
                        ...ctx,
                        ...sanitizedCache,
                        currentState: this.currentState
                    })

                    return sanitizedCache
                };
                setCache = true
            }
            let result = this.FSMCore.start(this.currentState, ctx);
            if (result.isValid && result.next) {
                this.currentState = result.next;
                this.insertHistory(result, ctx)
            }
            const transitionDef = this.FSMCore.transition[this.currentState]
            const doFallback = typeof transitionDef !== 'string'  && !result.isValid && ('FALLBACK' in transitionDef.transition)
            if (doFallback) {
                this.emit('onFallback', {
                    ...ctx,
                    ...result,
                    currentState: this.currentState
                })
                const fallbackReason = result.reason

                result = this.FSMCore.start(this.currentState, { event: 'FALLBACK', eventContext: ctx.eventContext, stateContext: ctx.stateContext })
                if (result.isValid && result.next) {
                    this.currentState = result.next;
                    this.insertHistory(result, ctx, fallbackReason)
                }
            }


            this.emit(result.isValid ? 'success' : 'invalid', {
                ...ctx,
                ...result,
                currentState: this.currentState
            })
            if (this.cache && setCache) {
                this.cache.set({ state: this.currentState, ...ctx }, result)
            }
            this.emit('onExit', { currentState: this.currentState, ctx })
            return result
        } catch (error) {
            this.emit('error', error)
            if (error instanceof FSMError) throw error
            throw new FSMError('Unexpected_Error', 'UNEXPECTED_ERROR', error)
        }
    }
    private insertHistory(result: TransitionResult, ctx: Context, fallbackReason?: string) {
        this.stateHistory.push({ state: result.next!, fromEvent: ctx.event, fallbackReason })
        if (this.stateHistory.length > this.historyMaxLength) this.stateHistory.shift()
    }

    public getSchema() {
        return this.FSMCore.transition
    }
    public history() {
        return this.stateHistory
    }
    public state() {
        return this.currentState
    }
}