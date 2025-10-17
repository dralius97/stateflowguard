import { Context, EventOfStateless, Guard, GuardMode, GuardRecord, StatelessSchema, TransitionResult } from "../../types";
import { FSMError } from "../../error";
import { Helpers } from "./helpers";
export class FSMCore<T extends StatelessSchema> {
  public transition: T
  private guardMap: Map<string, Map<string, Set<string>>> | undefined
  private common: Helpers
  private useHash: boolean
  constructor(transition: T, guardMap: Map<string, Map<string, Set<string>>> | undefined, useHash: boolean) {
    this.transition = transition
    this.guardMap = guardMap
    this.useHash = useHash
    this.common = new Helpers()
  }
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every(k => this.deepEqual((a as any)[k], (b as any)[k]));
  }
  private deepValidation(schemaCtx: unknown[], eventCtx: unknown | unknown[], mode: GuardMode = 'equal'): boolean {
    if (!Array.isArray(eventCtx)) {
      return schemaCtx.some(v => this.deepEqual(v, eventCtx));
    }

    switch (mode) {
      case 'equal':
        return (
          schemaCtx.length === eventCtx.length &&
          schemaCtx.every(v => eventCtx.some(v2 => this.deepEqual(v, v2))) &&
          eventCtx.every(v => schemaCtx.some(v2 => this.deepEqual(v, v2)))
        );

      case 'subset':
        return eventCtx.every(t => schemaCtx.some(v2 => this.deepEqual(t, v2)));

      case 'intersect':
        return eventCtx.some(t => schemaCtx.some(v2 => this.deepEqual(t, v2)));

      default:
        return false;
    }
  }
  private evaluateGuard(guard: Guard | undefined, ctx: Record<string, unknown>): TransitionResult {
    if (!guard) return { isValid: true, message: 'guard not implemented' }

    if (guard.allow) {
      for (const [key, val] of Object.entries(guard.allow)) {
        const ctxVal = ctx[key];
        if (typeof ctxVal === 'undefined') return { isValid: false, message: `missing key : ${key}`, code: 'VALIDATION_ERROR' }
        if (Array.isArray(val.value)) {
          if (!this.deepValidation(val.value, ctxVal, val.mode ?? 'equal')) {
            const message = val.failMessage ? val.failMessage : `Guard /allow failed: ${key}`
            return { isValid: false, message: message, reason: `${ctxVal} not in ${val.value}`, code: 'VALIDATION_ERROR' };
          }
        }
        else if (ctxVal !== val.value) {
          const message = val.failMessage ? val.failMessage : `Guard /allow failed: ${key}`
          return { isValid: false, message: message, reason: `${JSON.stringify(ctxVal)} == ${val.value}`, code: 'VALIDATION_ERROR' };
        }
      }
    }

    if (guard.not) {
      for (const [key, val] of Object.entries(guard.not)) {
        const ctxVal = ctx[key];
        if (typeof ctxVal === 'undefined') return { isValid: false, message: `missing key : ${key}`, code: 'VALIDATION_ERROR' }
        if (Array.isArray(val.value)) {
          if (this.deepValidation(val.value, ctxVal, val.mode ?? 'equal')) {
            const message = val.failMessage ? val.failMessage : `Guard /not failed: ${key}`
            return { isValid: false, message: message, reason: `${ctxVal} == ${val.value}`, code: 'VALIDATION_ERROR' };
          }
        }
        else if (ctxVal === val.value) {
          const message = val.failMessage ? val.failMessage : `Guard /not failed: ${key}`
          return { isValid: false, message: message, reason: JSON.stringify(`${ctxVal} == ${val.value}`), code: 'VALIDATION_ERROR' };
        }
      }
    }
    return { isValid: true, message: 'guard passed' };
  }
  private evaluateRequest(currState: keyof T, event: string, stateGuard?: Record<string, unknown>, eventGuard?: Record<string, unknown>): TransitionResult {
    const curr = this.transition[currState]
    if( curr === 'FINAL' ) return { isValid: false, message: 'Current state is FINAL', reason: `event '${event}' is FINAL state cannot be changed`, code: 'FINAL_STATE' }
    if (!curr) return { isValid: false, message: 'state invalid', reason: `state '${String(currState)}' not found`, code: 'VALIDATION_ERROR' }
    const evt = curr.transition[event]
    let validEvent = event
    if (!evt) {
      const wildCard = curr.transition['*']
      if (!wildCard) return { isValid: false, message: 'event invalid', reason: `event '${event}' not found in state '${String(currState)}'`, code: 'VALIDATION_ERROR' }
      else validEvent = '*'
    }
    const stateGuardResult = this.evaluateGuard(curr.stateGuard, stateGuard || {})
    if (!stateGuardResult.isValid) return stateGuardResult
    const eventGuardResult = this.evaluateGuard(curr.transition[validEvent].eventGuard, eventGuard || {})
    if (!eventGuardResult.isValid) return eventGuardResult
    const nextValue = curr.transition[validEvent].to
    return { isValid: true, message: 'Transition_Allowed', next: nextValue }
  }

  public start(currState: string, ctx: Context)
    : TransitionResult {
    const result = this.useHash ?
      this.hashBasedEvaluateRequest(currState, ctx.event, ctx.stateContext, ctx.eventContext) :
      this.evaluateRequest(currState, ctx.event, ctx.stateContext, ctx.eventContext)
    if (!result.isValid && result.code !== 'VALIDATION_ERROR') throw new FSMError(result.message, 'UNEXPECTED_ERROR', ctx)
    return result
  }






  private hashBasedEvaluateRequest(currState: keyof T, event: string, stateGuard?: Record<string, unknown>, eventGuard?: Record<string, unknown>): TransitionResult {
    const curr = this.transition[currState]
    if( curr === 'FINAL' ) return { isValid: false, message: 'Current state is FINAL', reason: `event '${event}' is FINAL state cannot be changed`, code: 'FINAL_STATE' }
    if (!curr) return { isValid: false, message: 'state invalid', reason: `state '${String(currState)}' not found`, code: 'VALIDATION_ERROR' }

    const evt = curr.transition[event]
    let validEvent = event
    if (!evt) {
      const wildCard = curr.transition['*']
      if (!wildCard) return { isValid: false, message: 'event invalid', reason: `event '${event}' not found in state '${String(currState)}'`, code: 'VALIDATION_ERROR' }
      else validEvent = '*'
    }
    const ctxMap: Map<string, Map<string, unknown>> = new Map()
    if (eventGuard) {
      const baseName: string = 'EG'
      ctxMap.set(baseName, this.collectRequestGuard(eventGuard, baseName))
    }
    if (stateGuard) {
      const baseName: string = 'SG'
      ctxMap.set(baseName, this.collectRequestGuard(stateGuard, baseName))
    }
    const guardValidationResult = this.hashBasedEvaluateGuard(ctxMap, currState as string, validEvent)
    if (!guardValidationResult.isValid) return guardValidationResult
    const nextValue = curr.transition[validEvent].to
    return { isValid: true, message: 'Transition_Allowed', next: nextValue }
  }

  private hashBasedEvaluateGuard(ctxGuard: Map<string, Map<string, unknown>>, currState: string, event: string,): TransitionResult {
    const parrentPath = `${currState}|${event}`
    const validationMap = this.guardMap!.get(parrentPath)
    if (validationMap) {
      for (const keys of validationMap.keys()) {
        const splitedPath = keys.split('|')
        const type = splitedPath[0]
        const message = splitedPath.pop()
        const mode = splitedPath.pop() as GuardMode
        const rules = splitedPath.pop()
        const rawPath = splitedPath.join('|')

        if (ctxGuard.get(type)) {
          const typeMap = ctxGuard.get(type);
          if (!typeMap || !typeMap.get(rawPath)) return { isValid: false, message: `missing key : ${keys}`, code: 'VALIDATION_ERROR' }
          const ctxValue = typeMap.get(rawPath) as string | string[]
          const schemaGuard = validationMap.get(keys)
          if (schemaGuard) {
            if (rules === 'allow') {
              const result = this.hashBasedDeepValidation(Array.from(schemaGuard), ctxValue, mode)
              if (!result) return { isValid: false, message: message ? message : `Guard /allow failed: ${keys}`, reason: `do not pass validation allow ${rawPath}`, code: 'VALIDATION_ERROR' };
            }
          }
          if (rules === 'not') {
            if (schemaGuard) {
              const result = this.hashBasedDeepValidation(Array.from(schemaGuard), ctxValue, mode)
              if (result) return { isValid: false, message: message ? message : `Guard /not failed: ${keys}`, reason: `do not pass validation not ${rawPath}`, code: 'VALIDATION_ERROR' };
            }
          }
        }

      }
    }
    return { isValid: true, message: 'guard passed' };
  }

  private hashBasedDeepValidation(schemaSet: string[], contextSet: string | string[], mode: GuardMode = 'intersect') {
    if (!Array.isArray(contextSet)) {
      return schemaSet.some(v => v === contextSet);
    }

    switch (mode) {
      case 'equal':
        return (
          schemaSet.length === contextSet.length &&
          schemaSet.every(v => contextSet.includes(v))
        );

      case 'subset':
        return contextSet.every(t => schemaSet.some(v2 => t.includes(v2)));

      case 'intersect':
        return contextSet.some(t => schemaSet.some(v2 => t.includes(v2)));

      default:
        return false;
    }

  }
  private collectRequestGuard(guard: Record<string, unknown>, baseName: string): Map<string, unknown> {
    const setOfRequestContextName = new Map()
    for (const keys in guard) {
      const identifier = `${baseName}|${keys}`
      if (Array.isArray(guard[keys])) {
        setOfRequestContextName.set(identifier, guard[keys].map(v => {
          if (this.common.isObject(v)) {
            return this.common.hash(JSON.stringify(this.common.cannonizeObject(v)))
          } else {
            return this.common.hash(JSON.stringify(v))
          }
        }))
      } else if (this.common.isObject(guard[keys])) {
        setOfRequestContextName.set(identifier, this.common.hash(JSON.stringify(this.common.cannonizeObject(guard[keys] as Record<string, unknown>))))
      } else {
        setOfRequestContextName.set(identifier, this.common.hash(JSON.stringify(guard[keys] as Record<string, unknown>)))
      }
    }
    return setOfRequestContextName
  }

}
