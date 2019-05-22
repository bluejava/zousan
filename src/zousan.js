// zousan - A Lightning Fast, Yet Very Small Promise A+ Compliant Implementation
// https://github.com/bluejava/zousan
// Author: Glenn Crownover <glenn@bluejava.com> (http://www.bluejava.com)
// License: MIT

const _undefined = undefined,						// let the obfiscator compress these down
	STATE_PENDING = _undefined,					// These are the three possible states (PENDING remains undefined - as intended)
	STATE_FULFILLED = "fulfilled",		// a promise can be in.  The state is stored
	STATE_REJECTED = "rejected",		// in this.state as read-only

	_undefinedString = "undefined"		// by assigning them to variables (debatable "optimization")

// See http://www.bluejava.com/4NS/Speed-up-your-Websites-with-a-Faster-setTimeout-using-soon
// This is a very fast "asynchronous" flow control - i.e. it yields the thread and executes later,
// but not much later. It is far faster and lighter than using setTimeout(fn,0) for yielding threads.
// Its also faster than other setImmediate shims, as it uses Mutation Observer and "mainlines" successive
// calls internally.
// WARNING: This does not yield to the browser UI loop, so by using this repeatedly
// 		you can starve the UI and be unresponsive to the user.
// This is an even FASTER version of https://gist.github.com/bluejava/9b9542d1da2a164d0456 that gives up
// passing context and arguments, in exchange for a 25x speed increase. (Use anon function to pass context/args)
const soon = (() => {

		const fq = [],  // function queue
			bufferSize = 1024
		let fqStart = 0 // avoid using shift() by maintaining a start pointer - and remove items in chunks of 1024 (bufferSize)

		function callQueue()
		{
			while(fq.length - fqStart) // this approach allows new yields to pile on during the execution of these
			{
				try { fq[fqStart]() } // no context or args..
				catch(err) { Zousan.error(err) }
				fq[fqStart++] = _undefined	// increase start pointer and dereference function just called
				if(fqStart == bufferSize)
				{
					fq.splice(0,bufferSize)
					fqStart = 0
				}
			}
		}

		// run the callQueue function asyncrhonously, as fast as possible
		const cqYield = (() => {

				// This is the fastest way browsers have to yield processing
				if(typeof MutationObserver !== _undefinedString)
				{
					// first, create a div not attached to DOM to "observe"
					const dd = document.createElement("div")
					const mo = new MutationObserver(callQueue)
					mo.observe(dd, { attributes: true })

					return function() { dd.setAttribute("a",0) } // trigger callback to
				}

				// if No MutationObserver - this is the next best thing for Node
				if(typeof process !== _undefinedString && typeof process.nextTick === "function")
					return function() { process.nextTick(callQueue) }

				// if No MutationObserver - this is the next best thing for MSIE
				if(typeof setImmediate !== _undefinedString)
					return function() { setImmediate(callQueue) }

				// final fallback - shouldn't be used for much except very old browsers
				return function() { setTimeout(callQueue,0) }
			})()

		// this is the function that will be assigned to soon
		// it takes the function to call and examines all arguments
		return fn => {

				// push the function and any remaining arguments along with context
				fq.push(fn)

				if((fq.length - fqStart) == 1) // upon adding our first entry, kick off the callback
					cqYield()
			}

	})()

// -------- BEGIN our main "class" definition here -------------

function Zousan(func)
{
	//  this.state = STATE_PENDING;	// Inital state (PENDING is undefined, so no need to actually have this assignment)
	//this.c = []			// clients added while pending.   <Since 1.0.2 this is lazy instantiation>

	// If Zousan is called without "new", throw an error
	if (!(this instanceof Zousan)) throw new TypeError("Zousan must be created with the new keyword")

	// If a function was specified, call it back with the resolve/reject functions bound to this context
	if(typeof func === "function")
	{
		const me = this
		try
		{
			func(
				arg => me.resolve(arg), // the resolve function bound to this context. (actually using bind() is slower)
				arg => me.reject(arg))  // the reject function bound to this context
		}
		catch(e)
		{
			me.reject(e)
		}
	}
	else if(arguments.length > 0) // If an argument was specified and it is NOT a function, throw an error
	{
		throw new TypeError("Zousan resolver " + func + " is not a function")
	}
}

Zousan.prototype = {	// Add 6 functions to our prototype: "resolve", "reject", "then", "catch", "finally" and "timeout"

		resolve: function(value)
		{
			if(this.state !== STATE_PENDING)
				return

			if(value === this)
				return this.reject(new TypeError("Attempt to resolve promise with self"))

			const me = this // preserve this

			if(value && (typeof value === "function" || typeof value === "object"))
			{
				let first = true // first time through?
				try
				{
					const then = value.then
					if(typeof then === "function")
					{
						// and call the value.then (which is now in "then") with value as the context and the resolve/reject functions per thenable spec
						then.call(value,
							function(ra) { if(first) { first=false; me.resolve(ra)}  },
							function(rr) { if(first) { first=false; me.reject(rr) } })
						return
					}
				}
				catch(e)
				{
					if(first)
						this.reject(e)
					return
				}
			}

			this.state = STATE_FULFILLED
			this.v = value

			if(me.c)
				soon(function() {
						for(let n=0, l=me.c.length;n<l;n++)
							resolveClient(me.c[n],value)
					})
		},

		reject: function(reason)
		{
			if(this.state !== STATE_PENDING)
				return

			const me = this // preserve this

			this.state = STATE_REJECTED
			this.v = reason

			const clients = this.c
			if(clients)
				soon(function() {
						for(let n=0, l=clients.length;n<l;n++)
							rejectClient(clients[n],reason)
					})
			else
				soon(function() {
					if(!me.handled) {
						if(!Zousan.suppressUncaughtRejectionError)
							Zousan.warn("You upset Zousan. Please catch rejections: ", reason,reason ? reason.stack : null)
					}
				})
		},

		then: function(onF,onR)
		{
			const p = new Zousan()
			const client = {y:onF,n:onR,p:p}

			if(this.state === STATE_PENDING)
			{
					// we are pending, so client must wait - so push client to end of this.c array (create if necessary for efficiency)
				if(this.c)
					this.c.push(client)
				else
					this.c = [client]
			}
			else // if state was NOT pending, then we can just immediately (soon) call the resolve/reject handler
			{
				const s = this.state, a = this.v

				// In the case that the original promise is already fulfilled, any uncaught rejection should already have been warned about
				this.handled = true // set promise as "handled" to suppress warning for unhandled rejections

				soon(function() { // we are not pending, so yield script and resolve/reject as needed
						if(s === STATE_FULFILLED)
							resolveClient(client,a)
						else
							rejectClient(client,a)
					})
			}

			return p
		},

		"catch": function(cfn) { return this.then(null,cfn) }, // convenience method
		"finally": function(cfn) { return this.then(cfn,cfn) }, // convenience method

		// new for 1.2  - this returns a new promise that times out if original promise does not resolve/reject before the time specified.
		// Note: this has no effect on the original promise - which may still resolve/reject at a later time.
		"timeout" : function(ms,timeoutMsg)
		{
			timeoutMsg = timeoutMsg || "Timeout"
			const me = this
			return new Zousan(function(resolve,reject) {

					setTimeout(function() {
							reject(Error(timeoutMsg))	// This will fail silently if promise already resolved or rejected
						}, ms)

					me.then(function(v) { resolve(v) },		// This will fail silently if promise already timed out
							function(er) { reject(er) })		// This will fail silently if promise already timed out

				})
		}

	} // END of prototype function list

function resolveClient(c,arg)
{
	if(typeof c.y === "function")
	{
		try {
				const yret = c.y.call(_undefined,arg)
				c.p.resolve(yret)
			}
		catch(err) { c.p.reject(err) }
	}
	else
		c.p.resolve(arg) // pass this along...
}

function rejectClient(c,reason)
{
	if(typeof c.n === "function")
	{
		try
		{
			const yret = c.n.call(_undefined,reason)
			c.p.resolve(yret)
		}
		catch(err) { c.p.reject(err) }
	}
	else
		c.p.reject(reason) // pass this along...
}

// "Class" functions follow (utility functions that live on the Zousan function object itself)

Zousan.resolve = val => new Zousan(resolve => resolve(val))

Zousan.reject = function(err) {
		const z = new Zousan()
		z.c=[] // see https://github.com/bluejava/zousan/issues/7#issuecomment-415394963
		z.reject(err)
		return z
	}

Zousan.all = function(pa)
{
	const results = [ ], retP = new Zousan() // results and final return promise
	let rc = 0 // resolved count

	function rp(p,i)
	{
		if(!p || typeof p.then !== "function")
			p = Zousan.resolve(p)
		p.then(
				function(yv) { results[i] = yv; rc++; if(rc == pa.length) retP.resolve(results) },
				function(nv) { retP.reject(nv) }
			)
	}

	for(let x=0;x<pa.length;x++)
		rp(pa[x],x)

	// For zero length arrays, resolve immediately
	if(!pa.length)
		retP.resolve(results)

	return retP
}

// If we have a console, use it for our errors and warnings, else do nothing (either/both can be overwritten)
const nop = () => { }
Zousan.warn = typeof console !== _undefinedString ? console.warn : nop
Zousan.error = typeof console !== _undefinedString ? console.error : nop

// make soon accessable from Zousan
Zousan.soon = soon

export default Zousan