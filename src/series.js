import Zousan from "./zousan.js"

/**
 * @param {Array<unknown>} items
 * @returns {Array<unknown>}
 */
function normalizeItems(items)
{
	return items.length === 1 && Array.isArray(items[0]) ? items[0] : items
}

/**
 * @param {Array<unknown>} items
 * @param {number} index
 * @param {unknown} value
 * @returns {unknown}
 */
function processResult(items,index,value)
{
	index++

	return index < items.length
		? processItem(items,index,value)
		: value
}

/**
 * @param {Array<unknown>} items
 * @param {number} index
 * @param {unknown} previousValue
 * @returns {unknown}
 */
function processItem(items,index,previousValue)
{
	let nextValue = items[index]

	if(typeof nextValue === "function")
		nextValue = nextValue(previousValue)

	if(nextValue && typeof nextValue.then === "function")
		return nextValue.then(function(value) {
				return processResult(items,index,value)
			})

	return processResult(items,index,nextValue)
}

/**
 * Run values, promises, and functions in order and resolve with the last value.
 * Each function receives the preceding result.
 *
 * @param {...unknown} seriesItems
 * @returns {Zousan<unknown>}
 */
function series(...seriesItems)
{
	const items = normalizeItems(seriesItems),
		promise = new Zousan()

	Zousan.soon(function() {
		if(!items.length)
		{
			promise.resolve(undefined)
			return
		}

		try { promise.resolve(processItem(items,0,undefined)) }
		catch(err) { promise.reject(err) }
		})

	return promise
}

export { series }
