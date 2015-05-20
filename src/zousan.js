(function(global){

		"use strict";

		// See http://www.bluejava.com/4NS/Speed-up-your-Websites-with-a-Faster-setTimeout-using-soon
		// This is a very fast "asynchronous" flow control - i.e. it yields the thread and executes later,
		// but not much later. It is far faster and lighter than using setTimeout(fn,0) for yielding threads.
		// Its also faster than other setImmediate shims, as it uses Mutation Observer and "mainlines" successive
		// calls internally.
		// WARNING: This does not yield to the browser UI loop, so by using this repeatedly
		// 		you can starve the UI and be unresponsive to the user.
		// This is an even FASTER version of https://gist.github.com/bluejava/9b9542d1da2a164d0456 that gives up
		// passing context and arguments, in exchange for a 25x speed increase. (Use anon function to pass context/args)
		var soon = (function() {

				var	fq = [], // function queue;
					fqStart = 0; // avoid using shift() by maintaining a start pointer - and remove items in chunks of 1024

				function callQueue()
				{
					while(fq.length - fqStart) // this approach allows new yields to pile on during the execution of these
					{
						fq[fqStart](); // no context or args..
						fqStart++;
						if(fqStart > 1024)
						{
							fq.splice(0,fqStart);
							fqStart = 0;
						}
						//fq.shift(); // remove element just processed... do this after processing so we don't go 0 and trigger soon again
					}
				}

				// run the callQueue function asyncrhonously, as fast as possible
				var cqYield = (function() {

						// This is the fastest way browsers have to yield processing
						if(typeof MutationObserver !== "undefined")
						{
							// first, create a div not attached to DOM to "observe"
							var dd = document.createElement("div");
							var mo = new MutationObserver(callQueue);
							mo.observe(dd, { attributes: true });

							return function() { dd.setAttribute("a",0); } // trigger callback to
						}

						// if No MutationObserver - this is the next best thing - handles Node and MSIE
						if(typeof setImmediate !== "undefined")
							return function() { setImmediate(callQueue) }

						// final fallback - shouldn't be used for much except very old browsers
						return function() { setTimeout(callQueue,0) }
					})();

				// this is the function that will be assigned to soon
				// it takes the function to call and examines all arguments
				return function(fn) {

						// push the function and any remaining arguments along with context
						fq.push(fn);

						if((fq.length - fqStart) == 1) // upon adding our first entry, kick off the callback
							cqYield();
					};

			})();

		var
			STATE_PENDING = "pending",			// These are the three possible states
			STATE_FULFILLED = "fulfilled",		// a promise can be in.  The state is stored
			STATE_REJECTED = "rejected";		// in this.state as read-only

		// -------- BEGIN our main "class" definition here -------------

		function Zousan(func)
		{
			this.state = STATE_PENDING;	// Inital state
			this.clients = [];			// clients added while pending

			// If a function was specified, call it back with the resolve/reject functions bound to this context
			if(func)
			{
				var me = this;
				func(
					function(arg) { me.resolve(arg) },	// the resolve function bound to this context.
					function(arg) { me.reject(arg) })	// the reject function bound to this context
			}
		}

		Zousan.prototype = {	// Add 4 functions to our prototype: "resolve", "reject", "then" and "catch".

				resolve: function(x)
				{
					if(this.state !== STATE_PENDING)
						return;

					if(x === this)
						return this.reject(new TypeError("Attempt to resolve promise with self"));

					if(x && (typeof x === "function" || typeof x === "object"))
					{
						try
						{
							var first = true; // first time through?
							var then = x.then;
							if(typeof then === "function")
							{
								var me = this; // preserve this

								// and call the x.then (which is now in "then") with x as the context and the resolve/reject functions per thenable spec
								then.call(x,
									function(ra) { if(first) { first=false; me.resolve(ra);}  },
									function(rr) { if(first) { first=false; me.reject(rr); } });
								return;
							}
						}
						catch(e)
						{
							if(first)
								this.reject(e);
							return;
						}
					}

					this.state = STATE_FULFILLED;
					this.argReason = x;

					var cc = this.clients;
					soon(function() {
							for(var n=0, l=cc.length;n<l;n++)
								resolveClient(cc[n],x);
						});
				},

				reject: function(reason)
				{
					if(this.state !== STATE_PENDING)
						return;

					this.state = STATE_REJECTED;
					this.argReason = reason;
					var cc = this.clients;

					soon(function() {

							if(cc.length === 0 && !Zousan.suppressUncaughtRejectionError)
								console.log("You upset Zousan. Please catch rejections: ",reason);

							cc.forEach(function(c) {
									rejectClient(c,reason);
								});
						});
				},

				then: function(onF,onR)
				{
					var p = new Zousan();
					var client = {y:onF,n:onR,p:p};

					if(this.state === STATE_PENDING)
						this.clients.push(client); // we are pending, so client must wait
					else
					{
						var s = this.state, a = this.argReason;
						soon(function() { // we are not pending, so yield script and resolve/reject as needed
								if(s === STATE_FULFILLED)
									resolveClient(client,a);
								else
									rejectClient(client,a);
							});
					}

					return p;
				},

				"catch": function(cfn) { this.then(null,cfn); }

			}; // END of prototype function list

		Zousan.all = function(pa)
		{
			var results = [ ], rc = 0, retP = new Zousan(); // results and resolved count

			function rp(p,i)
			{
				p.then(
						function(yv) { results[i] = yv; rc++; if(rc == pa.length) retP.resolve(results); },
						function(nv) { retP.reject(nv); }
					);
			}

			for(var x=0;x<pa.length;x++)
				rp(pa[x],x);

			return retP;
		}

		function resolveClient(c,arg)
		{
			if(typeof c.y === "function")
			{
				try {
						var yret = c.y.call(undefined,arg);
						c.p.resolve(yret);
					}
				catch(err) { c.p.reject(err) }
			}
			else
				c.p.resolve(arg); // pass this along...
		}

		function rejectClient(c,reason)
		{
			if(typeof c.n === "function")
			{
				try
				{
					var yret = c.n.call(undefined,reason);
					c.p.resolve(yret);
				}
				catch(err) { c.p.reject(err) }
			}
			else
				c.p.reject(reason); // pass this along...
		}

		if(typeof module != "undefined" && module.exports) // commonJS signature
			module.exports = Zousan; // this is our module export.  It will also be global, along with soon

		// here are our global variables..
		global.Zousan = Zousan;
		global.soon = soon;

	})(typeof global != "undefined" ? global : this);
