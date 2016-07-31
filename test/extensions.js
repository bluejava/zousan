/* jshint asi: true */
/* global describe, it, assert, require, setTimeout */

// Tests extensions specified in API but not tested in A+

var assert = require('assert');	// jshint ignore: line
var Zousan = require("../src/zousan.js");

// Uncaught rejections occur within these tests as part of testing, so no need to report the error
Zousan.suppressUncaughtRejectionError = true;

describe("Zousan extension testing", function() {

		describe("Zousan.all", function() {

				it("resolves with array containing each value when all promises resolve", function(done) {
						var p1 = new Zousan(),
						    	p2 = new Zousan();

						var promiseArray = [p1,p2];

						Zousan.all(promiseArray).then(function(values) {
								assert.equal(values.length,2);
								assert.equal(values[0],3);
								assert.equal(values[1],5);
								done();
							}).catch(done);

						p1.resolve(3);
						p2.resolve(5);
					});

				it("rejects when any promises rejects with the reason of the rejection", function(done) {
						var p1 = new Zousan(),
						    	p2 = new Zousan();

						var promiseArray = [p1,p2];

						Zousan.all(promiseArray).then(function(values) {
								done(Error("Should not resolve in this case"));
							}).catch(function(reason) {
								assert.equal(reason.name,"Error");
								assert.equal(reason.message,"Test Rejection");
								done();
							});

						p1.resolve(3);
						p2.reject(Error("Test Rejection"));
					});

				it("handles a mix of promises and non-promises, passing the non-promises through as is", function(done) {
						var p1 = new Zousan(),
						    	p2 = new Zousan();

						var promiseArray = [p1,123,"test",p2];

						Zousan.all(promiseArray).then(function(values) {
								assert.strictEqual(values.length,4);
								assert.strictEqual(values[0],3);
								assert.strictEqual(values[1],123);
								assert.strictEqual(values[2],"test");
								assert.strictEqual(values[3],5);
								done();
							}).catch(done);

						p1.resolve(3);
						p2.resolve(5);
					});

				it("handles null, undefined and other special values", function(done) {
						var p1 = new Zousan(), error = Error("test error")

						var promiseArray = [p1,0,false,true,undefined,null,NaN,Infinity,error];

						Zousan.all(promiseArray).then(function(values) {
								assert.strictEqual(values.length,9);
								assert.strictEqual(values[0],3);
								assert.strictEqual(values[1],0);
								assert.strictEqual(values[2],false);
								assert.strictEqual(values[3],true);
								assert.strictEqual(values[4],undefined);
								assert.strictEqual(values[5],null);
								assert.ok(isNaN(values[6]));
								assert.strictEqual(values[7],Infinity);
								assert.strictEqual(values[8],error);
								done();
							}).catch(done);

						p1.resolve(3);
					});

			});


		describe("timeout()", function() {

				it("passes the resolution through to the timeout promise transparently if resolved before timeout", function(done) {

						var p1 = new Zousan();		// Create a promise
						var p2 = p1.timeout(500); 	// Create another promise against p1 that times out in 500ms

						p2.then(function(value) {
								assert.equal(value,3);
								done();
							}).catch(done);

						p1.resolve(3);
					});

				it("passes the rejection through to the timeout promise transparently if rejected before timeout", function(done) {

						var p1 = new Zousan();		// Create a promise
						var p2 = p1.timeout(500); 	// Create another promise against p1 that times out in 500ms

						p2.then(function(value) {
								done(Error("Should not resolve in this case"));
							}).catch(function(reason) {
								assert.equal(reason.name,"Error");
								assert.equal(reason.message,"Test Rejection");
								done();
							});

						p1.reject(Error("Test Rejection"));
					});

				it("rejects the derived promise if the timeout expires before resolution", function(done) {

						var p1 = new Zousan();		// Create a promise
						var p2 = p1.timeout(100); 	// Create another promise against p1 that times out in 100ms

						p2.then(function(value) {
								done(Error("Should not resolve in this case"));
							}).catch(function(reason) {
								try
								{
									assert.equal(reason.name,"Error");
									assert.equal(reason.message,"Timeout");
								}
								catch(err) { return done(err) }

								done();
							});

						// Resolve the original promise in 200ms (enough time to allow p2 to time out)
						setTimeout(function() {
								p1.resolve(5);
							}, 200);
					});

				it("allows for custom timeout messages", function(done) {

						var p1 = new Zousan();		// Create a promise
						var customTimeoutMsg = "Test Timeout Message 100";
						var p2 = p1.timeout(100,customTimeoutMsg); 	// Create another promise against p1 that times out in 100ms

						p2.then(function(value) {
								done(Error("Should not resolve in this case"));
							}).catch(function(reason) {
								try
								{
									assert.equal(reason.name,"Error");
									assert.equal(reason.message,customTimeoutMsg);
								}
								catch(err) { return done(err) }

								done();
							});

						// Resolve the original promise in 200ms (enough time to allow p2 to time out)
						setTimeout(function() {
								p1.resolve(5);
							}, 200);
					});

			});

		describe("Immediate creation of resolved or rejected promises via convenience functions", function() {

			it("allows the creation of a resolved promise", function(done) {

					var p1 = Zousan.resolve(100);
					p1.then(function(value) {
							assert.equal(value,100);
							done();
						}).catch(done);

				});

			it("allows the creation of a rejected promise", function(done) {

					var p1 = Zousan.reject(Error("Test Rejection"));

					p1.then(function(value) {
							done(Error("Should not resolve in this case"));
						}).catch(function(reason) {
							assert.equal(reason.name,"Error");
							assert.equal(reason.message,"Test Rejection");
							done();
						});

				});
			})

		describe("finally() for handling both resolved and rejected promises", function() {

			it("executes the finally handler for resolved promises", function(done) {
					Zousan.resolve(true).finally(function() {
							done()
						})
				})

			it("executes the finally handler for rejected promises", function(done) {
					Zousan.reject(Error("rejected")).finally(function() {
							done()
						})
				})

			})

	})