import { Helpers } from "../core/helpers";
import { FSMError } from "../../error";
import { Guard, StatefulSchema, StatelessSchema, StateNode } from "../../types";

export class Validator {
  private common: Helpers
  constructor(){
    this.common = new Helpers()
  }
  public schemaValidator(type: 'SL' | 'SF', schemas: StatelessSchema | StatefulSchema): void {
    if(type === 'SF' && !schemas.state) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `State is missing`);
    const schema = type === 'SF' ? schemas.state as StatelessSchema : schemas as StatelessSchema
    
    const definedState = new Set()
    //collecting all state
    for (const key in schema) {
      if (typeof key !== 'string') throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `invalid type : ${key}`);
      if (definedState.has(key)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `duplicate state : ${key}`);
      definedState.add(key)
    }
    
    if (type == 'SF') {
      if (!schemas.initial) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', 'Stateful schema must have initial');
      if (!definedState.has(schemas.initial)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `${schemas.initial} is not defined in states`);
    }
    // validate state
    for (const key in schema) {
      if(schema[key] === 'FINAL') continue;
      const schemaNode = schema[key] as StateNode
      const transition = schemaNode['transition']
      const stateGuard = schemaNode['stateGuard']
      const stateFailMessage = schemaNode['failMessage']
      if (!this.common.isObject(transition)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `transition on parent ${key} must be an object`);
      if (stateFailMessage && typeof stateFailMessage !== 'string') throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `failMessage must be a string`);
      if (stateGuard) this.validateGuardSchema(stateGuard)
      for (const event in transition) {
        if (!this.common.isObject(transition[event])) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `event ${event} on parent ${key} must be an object`);
        const to = transition[event].to
        const eventGuard: Guard | undefined = transition[event].eventGuard
        if (!definedState.has(to)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `Transition target "${to}" from event "${event}" in state "${key}" is not defined in schema`);
        if (eventGuard) {
          this.validateGuardSchema(eventGuard)
        }
      }
    }

  }
  private validateGuardSchema(guard: Guard) {
    for (const GT in guard) {
      if (GT === 'allow' || GT === 'not') {
        const guardType = guard[GT];
        for (const key in guardType) {
            if(!guardType || !Array.isArray(guardType[key].value)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `Guard on ${key} must have an array value `);
            if (guardType[key].mode && !['equal', 'intersect', 'subset'].includes(guardType[key].mode)) throw new FSMError('Schema Invalid', 'SCHEMA_ERROR', `mode must one of 'equal' | 'intersect' | 'subset'. default : 'equal'`);
        }
      }
    }
  }

} 