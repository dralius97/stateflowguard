export type GuardMode = 'equal' | 'intersect' | 'subset'
export type EventOfStateless<S extends StatelessSchema, K extends keyof S> = S[K] extends StateNode? S[K]['transition'] : never  
export type AllEventsOf<T extends Record<string, any>> = { [K in keyof T]: keyof T[K]['transition'] }[keyof T];
export type StateTransitions = Record<string, { to: string; eventGuard?: Guard; }>
export type ErrorType = 'VALIDATION_ERROR' | 'SCHEMA_ERROR' | 'UNEXPECTED_ERROR' | 'REQUEST_ERROR' | 'PLACEHOLDER' | 'FINAL_STATE'
export type StateNode = {
    transition: StateTransitions
    stateGuard?: Guard,
    failMessage?: string
}
export type StatelessSchema = Record<string, StateNode | 'FINAL' >
export type StatefulSchema = { initial: string, state: StatelessSchema }
export type GuardRecord = {
    value: unknown[],
    mode?: GuardMode,
    failMessage?: string
}
export type Guard = {
    allow?: Record<string, GuardRecord>,
    not?: Record<string, GuardRecord>
}
export type TransitionResult = {
    isValid: true,
    message: string,
    reason?: string,
    next?: string,
    code?: ErrorType
} | {
    isValid: false,
    message: string,
    reason?: string,
    next?: string,
    code: ErrorType,
}
export type Context = {
    event: string,
    stateContext?: Record<string, unknown>,
    eventContext?: Record<string, unknown>
}
export type Mode = 'strict' | 'loose'
export type Option = {
    mode?: Mode,
    useCache?: boolean,
    cacheDuration?: number,
    cacheLimit?: number
    executionMode?: ExecutionMode
}

export type StatefulOption = { historyLength?: number } & Option
export type StateHistory = {
    state: string,
    fromEvent: string,
    fallbackReason?: string
}

export type CachePayload = {
    isValid: true,
    message: string,
    reason?: string,
    next?: string,
    code?: ErrorType,
    expired: number

} | {
    isValid: false,
    message: string,
    reason?: string,
    next?: string,
    code: ErrorType,
    expired: number
}

export type PathMap = Map<string, Map<string,Set<string>>>

export type ExecutionMode = 'hash' | 'deep'