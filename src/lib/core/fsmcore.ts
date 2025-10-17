import { Context, StatelessSchema, TransitionResult } from "../../types";
import { FSMError } from "../../error";
import { TransitionEvaluator } from "./transitionevaluator";
export class FSMCore<T extends StatelessSchema> extends TransitionEvaluator<T> {
  private useHash: boolean
  constructor(transition: T, guardMap: Map<string, Map<string, Set<string>>> | undefined, useHash: boolean) {
    super(transition, guardMap)
    this.transition = transition
    this.useHash = useHash
  }

  public start(currState: string, ctx: Context)
    : TransitionResult {
    const result = this.useHash ?
      this.hashBasedEvaluateRequest(currState, ctx.event, ctx.stateContext, ctx.eventContext) :
      this.evaluateRequest(currState, ctx.event, ctx.stateContext, ctx.eventContext)
    if (!result.isValid && (result.code !== 'VALIDATION_ERROR' && result.code !== 'FINAL_STATE')) throw new FSMError(result.message, 'UNEXPECTED_ERROR', ctx)
    return result
  }
}