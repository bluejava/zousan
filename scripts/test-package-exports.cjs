const assert = require("node:assert/strict")

async function testPackageExports()
{
	const Zousan = require("zousan"),
		{ series } = require("zousan/series"),
		{ evaluate, evaluateResults } = require("zousan/evaluate")

	assert.equal(typeof series,"function")
	assert.equal(typeof evaluate,"function")
	assert.equal(typeof evaluateResults,"function")
	assert(series(1,2) instanceof Zousan)
	assert(evaluate({ value: 1 }) instanceof Zousan)
	assert.equal(await evaluate(
			{ name: "a", value: 2 },
			{ value: value => value * 3, deps: [ "a" ] }
		),6)
	assert.deepEqual(await evaluateResults(
			{ name: "a", value: 2 },
			{ name: "b", value: value => value * 3, deps: [ "a" ] }
		),{ a: 2, b: 6 })
	assert.equal(Zousan.series,undefined)
	assert.equal(Zousan.evaluate,undefined)

	const ESMZousan = (await import("zousan")).default,
		esmSeries = (await import("zousan/series")).series,
		esmEvaluateModule = await import("zousan/evaluate")

	assert(esmSeries(1,2) instanceof ESMZousan)
	assert.equal(typeof esmEvaluateModule.evaluate,"function")
	assert.equal(typeof esmEvaluateModule.evaluateResults,"function")
	assert.equal(ESMZousan.series,undefined)
	assert.equal(ESMZousan.evaluate,undefined)
}

testPackageExports().catch(err => {
	console.error(err)
	process.exitCode = 1
	})
