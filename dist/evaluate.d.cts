import Zousan = require("../zousan-min.cjs")

export interface Evaluation<T = unknown>
{
	name?: string
	value: T | PromiseLike<T> | ((...dependencies: unknown[]) => T | PromiseLike<T>)
	deps?: readonly unknown[]
}

export interface NamedEvaluation<T = unknown> extends Evaluation<T>
{
	name: string
}

type ResolvedEvaluationValue<T> = T extends { value: infer V }
	? V extends (...args: any[]) => infer R
		? Awaited<R>
		: Awaited<V>
	: never

export type LastEvaluationValue<T extends readonly Evaluation[]> =
	T extends readonly [...unknown[], infer Last]
		? Last extends Evaluation
			? ResolvedEvaluationValue<Last>
			: never
		: undefined

export type EvaluationResults<T extends readonly NamedEvaluation[]> = {
	[Item in T[number] as Item["name"]]: ResolvedEvaluationValue<Item>
}

export function evaluate<const T extends readonly Evaluation[]>(
	evaluations: T
): Zousan<LastEvaluationValue<T>>

export function evaluate<const T extends readonly Evaluation[]>(
	...evaluations: T
): Zousan<LastEvaluationValue<T>>

export function evaluateResults<const T extends readonly NamedEvaluation[]>(
	evaluations: T
): Zousan<EvaluationResults<T>>

export function evaluateResults<const T extends readonly NamedEvaluation[]>(
	...evaluations: T
): Zousan<EvaluationResults<T>>
