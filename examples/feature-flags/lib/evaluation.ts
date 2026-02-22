// Feature Flag Evaluation Engine

import type {
  Flag,
  Segment,
  EvaluationContext,
  EvaluationResult,
  TargetingRule,
  Condition,
  Operator,
} from './types'
import { hashToPercentage } from './hash'

/**
 * Evaluate a feature flag for a given context
 */
export function evaluateFlag(
  flag: Flag,
  context: EvaluationContext,
  segments: Map<string, Segment> = new Map()
): EvaluationResult {
  // If flag is disabled, return default value
  if (!flag.enabled) {
    return {
      key: flag.key,
      value: flag.defaultValue,
      reason: 'FLAG_DISABLED',
      flagType: flag.type,
    }
  }

  // Evaluate each targeting rule in order
  for (const rule of flag.rules) {
    const matches = matchesRule(rule, context, segments)

    if (matches) {
      // If rule has percentage, check if user falls within it
      if (rule.percentage !== undefined && rule.percentage < 100) {
        const userId = context.userId ?? context.email ?? ''
        if (!userId) {
          // No user identifier, skip percentage rules
          continue
        }

        const bucket = hashToPercentage(userId, flag.key, rule.id)
        if (bucket >= rule.percentage) {
          // User not in percentage bucket, continue to next rule
          continue
        }

        return {
          key: flag.key,
          value: rule.value,
          reason: 'PERCENTAGE_ROLLOUT',
          ruleId: rule.id,
          flagType: flag.type,
        }
      }

      return {
        key: flag.key,
        value: rule.value,
        reason: 'TARGETING_MATCH',
        ruleId: rule.id,
        flagType: flag.type,
      }
    }
  }

  // No rules matched, return default value
  return {
    key: flag.key,
    value: flag.defaultValue,
    reason: 'DEFAULT_VALUE',
    flagType: flag.type,
  }
}

/**
 * Check if a context matches a targeting rule
 * All conditions must match (AND logic)
 */
export function matchesRule(
  rule: TargetingRule,
  context: EvaluationContext,
  segments: Map<string, Segment>
): boolean {
  if (rule.conditions.length === 0) {
    return true
  }

  return rule.conditions.every((condition) =>
    matchesCondition(condition, context, segments)
  )
}

/**
 * Check if a context matches a single condition
 */
export function matchesCondition(
  condition: Condition,
  context: EvaluationContext,
  segments: Map<string, Segment>
): boolean {
  // Handle segment references
  if (condition.attribute === '$segment') {
    const segmentKey = String(condition.value)
    const segment = segments.get(segmentKey)
    if (!segment) {
      return false
    }

    // Evaluate segment conditions
    const inSegment = segment.conditions.every((c) =>
      matchesCondition(c, context, segments)
    )

    return condition.operator === 'in' ? inSegment : !inSegment
  }

  const attributeValue = context[condition.attribute]
  return evaluateOperator(condition.operator, attributeValue, condition.value)
}

/**
 * Evaluate an operator against a value
 */
export function evaluateOperator(
  operator: Operator,
  attributeValue: unknown,
  conditionValue: unknown
): boolean {
  // Handle undefined/null attribute values
  if (attributeValue === undefined || attributeValue === null) {
    if (operator === 'neq' || operator === 'not_in' || operator === 'not_contains') {
      return true
    }
    return false
  }

  switch (operator) {
    case 'eq':
      return attributeValue === conditionValue

    case 'neq':
      return attributeValue !== conditionValue

    case 'gt':
      return Number(attributeValue) > Number(conditionValue)

    case 'gte':
      return Number(attributeValue) >= Number(conditionValue)

    case 'lt':
      return Number(attributeValue) < Number(conditionValue)

    case 'lte':
      return Number(attributeValue) <= Number(conditionValue)

    case 'contains':
      return String(attributeValue).includes(String(conditionValue))

    case 'not_contains':
      return !String(attributeValue).includes(String(conditionValue))

    case 'starts_with':
      return String(attributeValue).startsWith(String(conditionValue))

    case 'ends_with':
      return String(attributeValue).endsWith(String(conditionValue))

    case 'in':
      if (Array.isArray(conditionValue)) {
        return conditionValue.includes(attributeValue)
      }
      return false

    case 'not_in':
      if (Array.isArray(conditionValue)) {
        return !conditionValue.includes(attributeValue)
      }
      return true

    case 'matches':
      try {
        const regex = new RegExp(String(conditionValue))
        return regex.test(String(attributeValue))
      } catch {
        return false
      }

    case 'semver_eq':
      return compareSemver(String(attributeValue), String(conditionValue)) === 0

    case 'semver_gt':
      return compareSemver(String(attributeValue), String(conditionValue)) > 0

    case 'semver_gte':
      return compareSemver(String(attributeValue), String(conditionValue)) >= 0

    case 'semver_lt':
      return compareSemver(String(attributeValue), String(conditionValue)) < 0

    case 'semver_lte':
      return compareSemver(String(attributeValue), String(conditionValue)) <= 0

    default:
      return false
  }
}

/**
 * Compare two semver strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareSemver(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const match = v.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
    if (!match) return [0, 0, 0]
    return [
      parseInt(match[1] ?? '0', 10),
      parseInt(match[2] ?? '0', 10),
      parseInt(match[3] ?? '0', 10),
    ]
  }

  const [aMajor, aMinor, aPatch] = parseVersion(a)
  const [bMajor, bMinor, bPatch] = parseVersion(b)

  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1
  return 0
}

/**
 * Bulk evaluate multiple flags for a context
 */
export function evaluateFlags(
  flags: Flag[],
  context: EvaluationContext,
  segments: Map<string, Segment> = new Map()
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>()

  for (const flag of flags) {
    results.set(flag.key, evaluateFlag(flag, context, segments))
  }

  return results
}
