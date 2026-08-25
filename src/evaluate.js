import Zousan from "./zousan.js"

/**
 * @typedef {Object} Evaluation
 * @property {string} [name]
 * @property {unknown | ((...dependencies: Array<unknown>) => unknown)} value
 * @property {Array<unknown>} [deps]
 */

/**
 * @param {Array<unknown>} items
 * @returns {Array<Evaluation>}
 */
function normalizeEvaluations(items)
{
	return items.length === 1 && Array.isArray(items[0]) ? items[0] : items
}

/**
 * Evaluate a declarative asynchronous workflow.
 *
 * @param {Array<Evaluation>} evaluations
 * @param {boolean} returnAllResults
 * @returns {Zousan<unknown>}
 */
function runEvaluations(evaluations,returnAllResults)
{
	const items = Object.create(null),
		promises = [],
		namedIndexes = []

	try
	{
		evaluations.forEach(function(evaluation,index) {
				if(!evaluation || typeof evaluation !== "object")
					throw TypeError("Workflow items must be evaluation objects")

				const hasName = typeof evaluation.name === "string" && evaluation.name.length > 0,
					isFinal = index === evaluations.length - 1

				if(evaluation.name !== undefined && !hasName)
					throw TypeError("Workflow item names must be non-empty strings")

				if(returnAllResults && !hasName)
					throw TypeError("evaluateResults() requires every workflow item to have a name")

				if(!returnAllResults && !isFinal && !hasName)
					throw TypeError("evaluate() requires every workflow item except the final item to have a name")

				if(hasName && Object.prototype.hasOwnProperty.call(items,evaluation.name))
					throw TypeError("Duplicate workflow item name: " + evaluation.name)

				if(evaluation.deps !== undefined && !Array.isArray(evaluation.deps))
					throw TypeError("Workflow item dependencies must be an array")

				const dependencies = (evaluation.deps || []).map(function(dependency) {
						return typeof dependency === "string"
							&& Object.prototype.hasOwnProperty.call(items,dependency)
							? items[dependency]
							: dependency
						}),
					promise = Zousan.all(dependencies)
						.then(function(resolvedDependencies) {
								return typeof evaluation.value === "function"
									? evaluation.value(...resolvedDependencies)
									: evaluation.value
							})

				promises.push(promise)

				if(hasName)
				{
					items[evaluation.name] = promise
					namedIndexes.push({ name: evaluation.name, index })
				}
			})
	}
	catch(err)
	{
		return Zousan.reject(err)
	}

	return Zousan.all(promises).then(function(resolvedValues) {
			if(!returnAllResults)
				return resolvedValues[resolvedValues.length - 1]

			const results = {}

			namedIndexes.forEach(function(item) {
					results[item.name] = resolvedValues[item.index]
				})

			return results
		})
}

/**
 * Evaluate an entire workflow and resolve with its final value. A string
 * dependency that matches an earlier named item receives that item's value.
 *
 * @param {...Evaluation | Array<Evaluation>} evaluations
 * @returns {Zousan<unknown>}
 */
function evaluate(...evaluations)
{
	return runEvaluations(normalizeEvaluations(evaluations),false)
}

/**
 * Evaluate an entire workflow and resolve with every named value.
 *
 * @param {...Evaluation | Array<Evaluation>} evaluations
 * @returns {Zousan<Object<string, unknown>>}
 */
function evaluateResults(...evaluations)
{
	return runEvaluations(normalizeEvaluations(evaluations),true)
}

export { evaluate, evaluateResults }
