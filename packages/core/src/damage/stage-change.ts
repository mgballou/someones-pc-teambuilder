import type { BoostableStat, BoostSpread } from '../stats'
import { ImpossibleState } from './errors'

const MIN_STAGE = -6
const MAX_STAGE = 6

/**
 * Where a stat stage change the calculator applies came from.
 *
 * The calculator changes a stage itself in two places: a defender's Intimidate,
 * which it assumes has triggered, and a charging move's own boost. The
 * abilities that rewrite a change have to tell those apart — Clear Body,
 * Defiant and Competitive answer only what the other side does, and Guard Dog
 * and Inner Focus answer only Intimidate — so the cause travels with the change.
 */
export type StageCause = 'own-move' | 'intimidate'

export type StageChange = {
  readonly stat: BoostableStat
  readonly stages: number
}

/**
 * How an ability rewrites a stage change aimed at its holder.
 *
 * Each ability carries one, and each member is one of the games' own event
 * hooks: `multiplies` is Showdown's `onChangeBoost`, the two `blocks-` members
 * and `raises-on-intimidate` are `onTryBoost`, and `answers-foe-drops` is
 * `onAfterEachBoost`. The registry entry for each ability cites its rule.
 */
export type StageResponse =
  /** Simple doubles every change and Contrary reverses it, whoever made it. */
  | { readonly kind: 'multiplies'; readonly factor: 2 | -1 }
  /** Clear Body: a drop the other side makes does not land. */
  | { readonly kind: 'blocks-foe-drops' }
  /** Inner Focus, Own Tempo and Oblivious: Intimidate does not land. */
  | { readonly kind: 'blocks-intimidate' }
  /** Guard Dog: Intimidate raises the stat it would have lowered. */
  | { readonly kind: 'raises-on-intimidate'; readonly stages: number }
  /** Defiant and Competitive: a drop the other side lands raises `stat`. */
  | { readonly kind: 'answers-foe-drops'; readonly stat: BoostableStat; readonly stages: number }

/** What the holder's ability did to the change, so the result can say so. */
export type StageRewrite =
  | { readonly kind: 'multiplied'; readonly factor: 2 | -1; readonly stages: number }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'raised-instead'; readonly stages: number }
  | { readonly kind: 'answered'; readonly stat: BoostableStat; readonly stages: number }

export type LandedStage = {
  readonly boosts: BoostSpread
  /** Null when the holder's ability left the change as it was made. */
  readonly rewrite: StageRewrite | null
}

export type LandStageInput = {
  readonly boosts: BoostSpread
  readonly change: StageChange
  readonly cause: StageCause
  readonly response: StageResponse | null
}

/**
 * One stage change, through the holder's ability, onto the holder's stages.
 *
 * The order is the games', as Showdown's `Battle.boost` runs it: the change is
 * multiplied first (Simple, Contrary), then held to what can land from the
 * current stage, then offered to the abilities that stop or replace it (Clear
 * Body, Guard Dog), and only a change that actually moved a stage is answered
 * afterwards (Defiant, Competitive).
 *
 * That order decides one corner. An attacker already at -6 Attack cannot be
 * lowered by Intimidate, so there is nothing for Defiant, Competitive or Guard
 * Dog to answer and the stage stays at -6. `@smogon/calc` answers it anyway
 * and reads -5; this follows the games.
 */
export function landStage({ boosts, change, cause, response }: LandStageInput): LandedStage {
  if (response === null) return { boosts: shift(boosts, change), rewrite: null }

  switch (response.kind) {
    case 'multiplies': {
      const stages = change.stages * response.factor
      return {
        boosts: shift(boosts, { stat: change.stat, stages }),
        rewrite: { kind: 'multiplied', factor: response.factor, stages },
      }
    }
    case 'blocks-foe-drops':
      if (cause === 'own-move' || landing(boosts, change) >= 0) {
        return { boosts: shift(boosts, change), rewrite: null }
      }
      return { boosts, rewrite: { kind: 'blocked' } }
    case 'blocks-intimidate':
      if (cause !== 'intimidate' || landing(boosts, change) === 0) {
        return { boosts: shift(boosts, change), rewrite: null }
      }
      return { boosts, rewrite: { kind: 'blocked' } }
    case 'raises-on-intimidate':
      if (cause !== 'intimidate' || landing(boosts, change) === 0) {
        return { boosts: shift(boosts, change), rewrite: null }
      }
      return {
        boosts: shift(boosts, { stat: change.stat, stages: response.stages }),
        rewrite: { kind: 'raised-instead', stages: response.stages },
      }
    case 'answers-foe-drops': {
      const landed = shift(boosts, change)
      if (cause === 'own-move' || landing(boosts, change) >= 0) {
        return { boosts: landed, rewrite: null }
      }
      return {
        boosts: shift(landed, { stat: response.stat, stages: response.stages }),
        rewrite: { kind: 'answered', stat: response.stat, stages: response.stages },
      }
    }
    default:
      throw ImpossibleState.unreachable(response)
  }
}

/** How far the change can actually move the stage from where it stands. */
function landing(boosts: BoostSpread, change: StageChange): number {
  return clampStage(boosts[change.stat] + change.stages) - boosts[change.stat]
}

function shift(boosts: BoostSpread, change: StageChange): BoostSpread {
  return { ...boosts, [change.stat]: clampStage(boosts[change.stat] + change.stages) }
}

function clampStage(stage: number): number {
  return Math.max(MIN_STAGE, Math.min(MAX_STAGE, stage))
}
