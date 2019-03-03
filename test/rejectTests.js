/*
	This module tests the uncaught rejection warning feature, ensuring that
	developers are properly warned when a rejected promise is not caught.
*/

const Zousan = require("../src/zousan.js")
const assert = require('assert')

let warningCount = 0, resCount = 0, rejCount = 0
Zousan.warn = () => warningCount++
const res = () => resCount++
const rej = () => rejCount++

function singlePreResolve()
{
	return new Zousan((resolve, reject) => { resolve(42) })
		.then(res, rej)
}

function singlePostResolve()
{
	const z = new Zousan()
	setTimeout(() => z.resolve(1), 50)
	return z.then(res, rej)
}

function singlePreReject()
{
	return new Zousan((resolve, reject) => { reject(99) })
		.then(res, rej)
}

function singlePostReject()
{
	const z = new Zousan()
	setTimeout(() => z.reject(99), 10)
	return z.then(res, rej)
}

function singlePreRejectNoCatch()
{
	return new Zousan((resolve, reject) => { reject(99) })
}

function singlePreRejectResNoCatch()
{
	return new Zousan((resolve, reject) => { reject(99) })
		.then(res)
}

function singlePreRejectResWithCatch()
{
	return new Zousan((resolve, reject) => { reject(99) })
		.then(res)
		.catch(rej)
}

function resolveWithErrorInThen() // 1, 1, 0
{
	return new Zousan((resolve, reject) => { resolve(1) })
		.then(res) // one resolve
		.then(val => { throw Error("error within then")})
		.then(res) // this should be skipped
		.catch(rej) // one reject
}

function resolveWithErrorInThenNoCatch() // 1, 0, 1
{
	return new Zousan((resolve, reject) => { resolve(1) })
		.then(res) // one resolve
		.then(val => { throw Error("error within then")})
		.then(res) // skipped
		// a reject without catch = 1 warn
}

function doubleThensResolve()
{
	const z = new Zousan()
	z.then(res)
	z.then(res)
	z.resolve(1)
}

// In this case, we have 2 independent resolved case handlers - and each does not catch
// the rejection, so we get two warnings. Perhaps ideally we would only get one... oh well, its "best effort" :-}
function doubleThensReject() // 0 0 2
{
	const z = new Zousan()
	z.then(res)
	z.then(res)
	z.reject(99)
}
const delay = ms => new Zousan(y => setTimeout(y, ms))

/**
 * Run a set of tests and count the number of resolves, rejects and warnings and compare
 * them with a set of target counts for resolves, rejects and warnings.
 * @param  {} tfn The test function to run
 * @param  {} tResCount the Target resolution count
 * @param  {} tRejCount the Target rejection count
 * @param  {} tWarningCount The Target warning count
 */
function runTest(tfn, tResCount, tRejCount, tWarningCount)
{
	warningCount = 0, resCount = 0, rejCount = 0
	tfn()
	// perform checks in a delayed asynchronous function rather than the expected
	// .then on tfn above out of respect for Schrödinger's cat
	return delay(100)
		.then(() => {
			assert.equal(resCount, tResCount)
			assert.equal(rejCount, tRejCount)
			assert.equal(warningCount, tWarningCount)
		})
}

async function runTests()
{
	await runTest(singlePreResolve, 1, 0, 0)
	await runTest(singlePostResolve, 1, 0, 0)
	await runTest(singlePreReject, 0, 1, 0)
	await runTest(singlePostReject, 0, 1, 0)
	await runTest(singlePreRejectNoCatch, 0, 0, 1)
	await runTest(singlePreRejectResNoCatch, 0, 0, 1)
	await runTest(singlePreRejectResWithCatch, 0, 1, 0)
	await runTest(resolveWithErrorInThen, 1, 1, 0)
	await runTest(resolveWithErrorInThenNoCatch, 1, 0, 1)
	await runTest(doubleThensResolve, 2, 0, 0)
	await runTest(doubleThensReject, 0, 0, 2)
}

describe("Zousan rejection warning testing", function() {

	it("works pretty well in most cases", function(done) {
			runTests()
				.then(done)
		})

})