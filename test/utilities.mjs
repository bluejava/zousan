import assert from "node:assert/strict"
import Zousan from "../src/zousan.js"
import { evaluate, evaluateResults } from "../src/evaluate.js"
import { series } from "../src/series.js"

Zousan.suppressUncaughtRejectionError = true

function delayedValue(value)
{
	return new Zousan(function(resolve) {
		setTimeout(resolve,5,value)
		})
}

function deferred()
{
	let resolve
	const promise = new Zousan(function(resolvePromise) {
			resolve = resolvePromise
		})

	return { promise, resolve }
}

describe("series", function() {
	it("runs values, promises, and functions in order", async function() {
		const result = await series(
				2,
				value => value + 3,
				delayedValue,
				value => value * 2
			)

		assert.equal(result,10)
	})

	it("accepts an array and handles falsy first values", async function() {
		assert.equal(await series([ 0, value => value + 2 ]),2)
	})

	it("resolves an empty series with undefined", async function() {
		assert.equal(await series(),undefined)
	})

	it("rejects without running later functions after a failure", async function() {
		let ranLaterStep = false
		const result = series(
				1,
				function() { throw Error("series failed") },
				function() { ranLaterStep = true }
			)

		await assert.rejects(Promise.resolve(result),/series failed/)
		assert.equal(ranLaterStep,false)
	})
})

describe("evaluate", function() {
	it("resolves an empty workflow with undefined", async function() {
		assert.equal(await evaluate(),undefined)
	})

	it("resolves with the final workflow value", async function() {
		const result = await evaluate(
				{ name: "a", value: 10 },
				{ name: "b", value: delayedValue(22) },
				{ name: "sum", value: (a,b) => a + b, deps: [ "a", "b" ] },
				{ value: value => delayedValue(value * 2), deps: [ "sum" ] }
			)

		assert.equal(result,64)
	})

	it("accepts an array and permits an unnamed final item", async function() {
		const result = await evaluate([
				{ name: "first", value: 3 },
				{ value: value => value + 4, deps: [ "first" ] }
			])

		assert.equal(result,7)
	})

	it("starts independent work before waiting for dependencies", async function() {
		const first = deferred(),
			second = deferred(),
			started = [],
			workflow = evaluate(
					{ name: "first", value: function() {
							started.push("first")
							return first.promise
						} },
					{ name: "second", value: function() {
							started.push("second")
							return second.promise
						} },
					{ value: (a,b) => a + b, deps: [ "first", "second" ] }
				)

		await new Promise(resolve => setImmediate(resolve))
		assert.deepEqual(started,[ "first", "second" ])

		first.resolve(2)
		second.resolve(3)
		assert.equal(await workflow,5)
	})

	it("waits for independent items before resolving with the final value", async function() {
		const pending = deferred()
		let settled = false
		const workflow = evaluate(
				{ name: "pending", value: pending.promise },
				{ value: 5 }
			)

		workflow.then(function() { settled = true })
		await new Promise(resolve => setImmediate(resolve))
		assert.equal(settled,false)

		pending.resolve(2)
		assert.equal(await workflow,5)
	})

	it("passes unmatched string dependencies as literal values", async function() {
		const result = await evaluate({
				value: value => value + " world",
				deps: [ "hello" ]
			})

		assert.equal(result,"hello world")
	})

	it("rejects invalid workflow definitions", async function() {
		await assert.rejects(
				Promise.resolve(evaluate({ value: 1 },{ value: 2 })),
				/except the final item/
			)
		await assert.rejects(
				Promise.resolve(evaluate({ name: "same", value: 1 },{ name: "same", value: 2 })),
				/Duplicate workflow item name/
			)
	})

	it("rejects when an evaluation function throws", async function() {
		const workflow = evaluate({
				value: function() { throw Error("evaluation failed") }
			})

		await assert.rejects(Promise.resolve(workflow),/evaluation failed/)
	})
})

describe("evaluateResults", function() {
	it("resolves an empty workflow with an empty object", async function() {
		assert.deepEqual(await evaluateResults(),{})
	})

	it("resolves with every named workflow value", async function() {
		const result = await evaluateResults(
				{ name: "a", value: 10 },
				{ name: "b", value: delayedValue(22) },
				{ name: "sum", value: (a,b) => a + b, deps: [ "a", "b" ] }
			)

		assert.deepEqual(result,{ a: 10, b: 22, sum: 32 })
	})

	it("requires every item to have a unique name", async function() {
		await assert.rejects(
				Promise.resolve(evaluateResults({ value: 1 })),
				/requires every workflow item to have a name/
			)
		await assert.rejects(
				Promise.resolve(evaluateResults(
						{ name: "same", value: 1 },
						{ name: "same", value: 2 }
					)),
				/Duplicate workflow item name/
			)
	})
})
