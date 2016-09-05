<a href="http://promises-aplus.github.com/promises-spec">
    <img src="https://promisesaplus.com/assets/logo-small.png"
         align="right" alt="Promises/A+ logo" />
</a>

# Zousan 🐘
A Lightning Fast, Yet Very Small Promise A+ Compliant Implementation

---

There are already several Promise implementations out there, and modern browsers even have built-in Promises, but none met my goals, which are:

1. **Exceedingly Fast** - it had to be the fastest possible implementation, so it could be used excessively throughout a codebase with impunity. (Even games!)
2. **Extremely Small** - I will be using this in all my future projects, including mobile, and so fast and efficient code is essential. Also, the less code there is, the less can go wrong.
3. **Clearly written and Documented** - I want to clearly see (and clearly demonstrate to others) how the code works, both to build confidence in its correctness, and to make it easier to fix/maintain if/when necessary.
4. **Usable Everywhere** - I required compatibility with browsers (both new and old), mobile devices, Node and even make a best effort to work in unknown environments.
5. **Simple Build** - No dependencies, few files, dog bone simple. (is that a phrase?)

Check out this blog post called [A Promising Start - Embracing Speed and Elegance with Zousan Promises](http://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises) where I describe why and how I created this implementation.

**Update:** There is now an extension library with some handy functions for dealing with Promises (from Zousan or otherwise): [Zousan-plus](https://github.com/bluejava/zousan-plus) 🐘➕

## Usage

Zousan is defined as a UMD (Universal Module Definition), compliant with AMD and CommonJS module styles, as well as simple browser script includes which define `Zousan` globally.

Zousan is [Promise A+ 1.1](http://promises-aplus.github.com/promises-spec) compliant, so  any documentation for spec-compliant promises applies to Zousan. There are a couple small additions though - see below.  Briefly, the spec-compliant API is:

###Constructor

Create a new Promise (often, this promise is returned from a function that provides some asynchronous resource)

```javascript
	var promise = new Zousan(function(resolve, reject) {
		// ... perform some asynchronous operation ...
		//  load the value to return into "value"
		if(success)
			resolve(value);
		else
			reject(Error("error message goes here"));
	});
```

----------

###then()

To use this promise to obtain the value:

```javascript
	promise.then(function(value) { // this function is called when promise is resolved
			// do something with your value, you deserve it!

		}, function(err) { // this function is called when promise is rejected
		// bummer...

	});
```

--------

## Extensions

Zousan does have a couple additional features which are not required by the spec, but are very useful when working with promises. Be aware that if you use this "extension" API, your code may not be compatible with other Promise implementations:

###catch(onRejected)

```catch(onRejected)``` is equivalent to ```then(undefined, onRejected)``` and is just easier to identify - allowing you to adopt the pattern of always ending *then chains* with a catch, like so:

```javascript
	getJSON("data.json") 		// hypothetical function which returns a promise
		.then(lookupItems) 		//   takes the data and obtains extra data about items
		.then(updateCount)		//   update item count using host service
		.then(displayResults)	//   update user view of results
		.catch(reportErr)		// Catch any errors occurring in any steps above.
```

This pattern helps you to remember to always catch any errors produced within your promise chains. Although this isn't part of the Promise A+, it is a very common addition and is present in the [ECMAScript 2015 Language Specification](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.catch).

-------------

###finally(fn)

```finally(fn)``` is equivalent to ```then(fn, fn)``` and is a convenience method for handling both resolved and rejected promises with a single handler. More important than being "convenient" is it is clear in intent - that this function will be run regardless. It is useful in promise chains that require some kind of clean-up operation such as releasing resources:

```javascript
	getJSON("data.json") 		// hypothetical function which returns a promise
		.then(lookupItems) 		//   takes the data and obtains extra data about items
		.then(updateCount)		//   update item count using host service
		.then(displayResults)	//   update user view of results
		.catch(reportErr)		// Catch any errors occurring in any steps above
		.finally(cleanup)		// Release resources, stop spinner, etc.
```

This method is not part of the Promise A+ spec nor included in [ECMAScript2015 spec](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-constructor)

-------------

###all(promiseArray)

The other addition is a utility function called ```all()``` which takes an array of promises and returns a single promise that will resolve when all promises in the array resolve. The value passed to you is an array with the values from each promise respectively. If any promise within the passed array rejects, this will reject with the same error as the original rejection.

**Note:** The array can contain non-promises as well. They will be passed through to the resolved array as-is.

It is available by calling ```Zousan.all()``` (i.e. does not require a promise instance).

For example, to obtain data from a list of sources:

```javascript
	// define an array with our data locations
	var sources = ["data1.json", "data2.json", "data3.json"];

	// Next, obtain an array of promises using hypothetical getJSON function
	var dataProm = sources.map(getJSON);

	// When all promises resolve, we call processData with array of results
	Zousan.all(dataProm).then(processData, reportError);
```

This function is also present in the [ECMAScript 2015 spec](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.all).

-------------

###timeout(ms[,msg])

This method returns a new promise based on the original that times out (rejects with `Error("Timeout")` or if specified `Error(msg)`) if the original promise does not resolve or reject before the time specified (in milliseconds).

```javascript
	// Create a new promise that times out after 3 seconds
	var prom = new Zousan().timeout(3000);
	prom.then(doit,problem);
```

**Note:** This has no effect on the original promise - which may still resolve/reject at a later time. This pattern allows you to create a timeout promise against any existing promise, such as one returned from an API, without disturbing the original promise:

```javascript
	// Use the getData() function but only wait for a maximum of 2 seconds
	getData(url).timeout(2000).then(process, error)
```

**Note 2:** Be careful of promise chains containing multiple timeouts. To trigger handlers at multiple timeout points, use separate statements, like this:

```javascript
	var data = getData(url)
		.timeout(10000)	// wait a maximum of 10 seconds for the data to return
		.then(process, error)

	data.timeout(1000)	// after one second, display a progress bar
		.catch(displayProgressBar)

	data.timeout(3000)	// after 3 seconds, display a cancel button
		.catch(displayCancelButton)

```

---------

###Convenience resolve() / reject() as Instance Methods

The spec-compliant manner of resolving/rejecting a promise is to call the methods handed back to the constructor function argument, as shown in the constructor example above. Often it is more convenient (or cleaner) to resolve/reject a promise outside the constructor. For this purpose, Zousan provides resolve and reject methods right on the promise instance. So this pattern is available:

```javascript
	var promise = new Zousan();
	if(success)
		promise.resolve(value);
	else
		promise.reject(Error("error message goes here"));
```

-----------

###Convenience utility method to create Resolved or Rejected Promises

These functions create new promises and resolve or reject them with values or errors all in one convenient step.

**Note:** This differs from the above resolve/reject instance methods in that these are functions which create *new* promises in a resolved or rejected state, whereas the instance methods of the same names above resolve or reject a previously existing promise (hence, those are instance methods while these are not)

To create a promise and *resolve* or *reject* it immediately:

```javascript
	// Create a promise and resolve it immediately with the value 100
	var resolvedPromise = Zousan.resolve(100);

	// --- Note: The above is equivalent to the following: ---
	var resolvedPromise2 = new Zousan();
	resolvedPromise2.resolve(100);

	// --- or, the following ---
	var resolvedPromise3 = new Zousan(function(res,rej) {
			res(100);
		});

	// Create a promise and reject it immediately with the stated error
	var rejectedPromise = Zousan.reject(Error("Security Error"));
```

-----------

###suppressUncaughtRejectionError flag

By default, Zousan will log a message to the console if a promise is rejected and that rejection is not "caught". Generally, it is best to use the ```catch()``` pattern shown above, which will ensure all rejections are handled. If you forget, you will upset Zousan, and he will remind you.

If you wish to suppress this warning, you can turn it off globally via:

```javascript
	Zousan.suppressUncaughtRejectionError = true;
```

## FAQ

**Q: What does "Zousan" mean?**

Well, if you had a 3-year-old Japanese child, you would know, now wouldn't you!?  "Zou" is the Japanese word for "Elephant". "San" is an honorific suffix placed after someone's name or title to show respect. Children (and other kawaii people) often put "san" after animal names as a sign of respect to the animals.. and just to be kawaii.

[Here is a video that might help](https://www.youtube.com/watch?v=rEsNUJp9dcM)

[And if you need more guidance (or just enjoy these as much as I do) here is another](https://www.youtube.com/watch?v=b4KYDBBB6UQ) - **Zousan Da-ta!!**

**Q: Ok, cute - but why name it after an Elephant?**

Because elephants never forget. So you can depend on them to keep their promises!

**Q: Why did you write another Promise implementation?**

I briefly explained why at the top of this README - but for a more detailed explanation, check out my [blog post on the subject.](http://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises)

**Q: How did you make it run so fast?**

I discuss that a bit on my [Zousan blog post](http://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises) as well.

**Q: Just how fast is it?**

I set up a [jsperf comparison](http://jsperf.com/promise-speed-comparison/7) between:

* [Zousan](https://github.com/bluejava/zousan) (2,160 bytes minified)
* [Bluebird](https://github.com/petkaantonov/bluebird) (72,282 bytes minified) - Considered the king of high-performance Promises
* [When](https://github.com/cujojs/when) (12,474 bytes minified) - Long established and high performance Promise shim
* [PinkySwear](https://github.com/timjansen/PinkySwear.js) (842 bytes minified) - The smallest compliant Promise implementation I've come across
* [covenant](https://github.com/wizardwerdna/covenant) (3,335 bytes) - A Promise implementation written in CoffeeScript
* Native Promises - Built into all recent browsers *except IE*.

**Note: Graph illustrates *operations per second*, so longer bars are better.**

![](http://www.bluejava.com/int/images/Zousan-Performance-20150617.png)

### License

See the LICENSE file for license rights and limitations (MIT).