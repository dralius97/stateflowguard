import { Helpers } from "../core/helpers"
import { Guard, StatelessSchema, StateTransitions } from "../../types"

export class Cannonizer {
    private guardMap: Map<string, Map<string, Set<string>>>
    private common: Helpers
    constructor() {
        this.guardMap = new Map()
        this.common = new Helpers()
    }
    public cannonize(schema: StatelessSchema) {
        for (const state in schema) {
            const stateNode = schema[state].transition as StateTransitions
            const stateGuard = schema[state].stateGuard
            const statePath: Map<string, Set<string>> = stateGuard ? this.guardCannonizer(stateGuard, `SG`) : new Map()

            for (const event in stateNode) {
                const eventGuard = stateNode[event].eventGuard
                const eventPath:Map<string, Set<string>> = eventGuard? new Map([...this.guardCannonizer(eventGuard, `EG`), ...statePath]) : statePath
                this.guardMap.set(`${state}|${event}`, eventPath)
            }

        }
        return this.guardMap
    }
    private guardCannonizer(guard: Guard, nodeIdentifier: string): Map<string, Set<string>> {
        const path: Map<string, Set<string>> = new Map();
        for (const GT in guard) {
            if (GT === 'allow' || GT === 'not') {
                const guardType = guard[GT];
                for (const key in guardType) {
                    const value = guardType[key].value
                    const mode = guardType[key].mode || 'equal'
                    const message = guardType[key].failMessage || ''
                    const identifier = `${nodeIdentifier}|${key}|${GT}|${mode}|${message}`
                    const set: Set<string> = new Set()
                    for (const el of value) {
                        if (this.common.isObject(el)) {
                            set.add(this.common.hash(JSON.stringify(this.common.cannonizeObject(el as Record<string, unknown>))))
                        } else {
                            set.add(this.common.hash(JSON.stringify(el)))
                        }
                    }
                    path.set(identifier, set)
                }
            }
        }
        return path
    }
}