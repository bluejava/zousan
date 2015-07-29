/**
	Promises/A+ Compliance Test for Zousan.

	To run the tests:  (from the directory of this file)

		node install
		node zousanTest.js

*/

var promisesAplusTests = require("promises-aplus-tests");
var Zousan = require("../src/zousan.js");

// By default, Zousan alerts you to uncaught rejections - a friendly heads-up
// But this compliance test it is purposeful, and not something to be "corrected" - so lets suppress the error
Zousan.suppressUncaughtRejectionError = true;

var adapter = {
		deferred : function() {
			var p = new Zousan();
			return {
				promise: p,
				resolve: function(value) { return p.resolve(value); },
				reject: function(reason) { return p.reject(reason); }
			}
		}
	};

promisesAplusTests(adapter, function (err) {
		if(err)
			console.log("Test FAILED: " + err);
		else
			console.log("Test Complete. All tests PASSED");
	});