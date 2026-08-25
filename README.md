<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png"
         align="right" alt="Promises/A+ logo" />
</a>

# Zousan 🐘
A fast, small Promises/A+ implementation

---

Native promises are standard today, but Zousan remains useful when size, speed, or support for older environments matters. I originally wrote it with five goals:

1. **Exceedingly fast.** It should be cheap enough to use throughout a codebase, including performance-sensitive applications such as games.
2. **Extremely small.** Less code means smaller bundles and fewer places for bugs to hide.
3. **Clearly written and documented.** The implementation should be understandable enough to inspect, trust, and maintain.
4. **Usable everywhere.** It should work in browsers, Node, mobile devices, and older or unusual JavaScript environments.
5. **Simple to build.** Few files, few dependencies, dog-bone simple. Is that a phrase?

Check out [A Promising Start: Embracing Speed and Elegance with Zousan Promises](https://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises) for more about why and how I created the implementation.

Zousan also includes optional utilities for asynchronous workflows. Each utility has a separate entrypoint, so importing one does not add methods to `Zousan` or include the others in your application bundle.

Since version 3.0.0, Zousan does not define a global by default. Loading the UMD build directly with a `script` element still creates a global when AMD is unavailable.

## Installation and usage

Zousan is distributed with an ES Module source entry for modern bundlers and a minified UMD/CommonJS bundle for CommonJS consumers.

```shell
npm install zousan
```

```javascript
import Zousan from "zousan"
```

```javascript
const Zousan = require("zousan")
```

## Promise API

Zousan passes the [Promises/A+ 1.1](https://promisesaplus.com/) conformance suite. Promises/A+ specifies the behavior of `then()` and the promise resolution procedure. The broader [`Promise` API is defined by ECMAScript](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects).

Zousan implements the standard Promise methods documented below. It deliberately implements only this subset; methods such as `Promise.race()` are not included.

### Constructor

The constructor receives an executor function. The executor gets functions that resolve or reject the new promise.

```javascript
const promise = new Zousan(function(resolve,reject) {
	loadValue(function(error,value) {
		if(error)
			reject(error)
		else
			resolve(value)
	})
})
```

### then(onFulfilled, onRejected)

`then()` registers fulfillment and rejection handlers and returns a new Zousan, so calls can be chained.

```javascript
promise.then(
	value => display(value),
	error => reportError(error)
)
```

### catch(onRejected)

`catch(onRejected)` is the standard shorthand for `then(undefined,onRejected)`.

```javascript
getJSON("data.json")
	.then(lookupItems)
	.then(updateCount)
	.then(displayResults)
	.catch(reportError)
```

### finally(onFinally)

`finally()` runs its handler after the promise settles. The original fulfillment value or rejection reason passes through unless the handler throws or returns a rejected promise.

```javascript
getJSON("data.json")
	.then(displayResults)
	.catch(reportError)
	.finally(cleanup)
```

### Zousan.resolve(value) and Zousan.reject(reason)

These standard static methods create a Zousan resolved with a value or rejected with a reason.

```javascript
const valuePromise = Zousan.resolve(100)
const failedPromise = Zousan.reject(Error("Unable to load value"))
```

### Zousan.all(values)

`Zousan.all()` accepts an array containing promises, thenables, or direct values. It preserves their order and resolves after every item resolves. If an item rejects, the returned Zousan rejects with the same reason.

Native `Promise.all()` accepts any iterable. To keep the implementation small, `Zousan.all()` accepts arrays.

```javascript
const sources = ["data1.json", "data2.json", "data3.json"]
const dataPromises = sources.map(getJSON)

Zousan.all(dataPromises).then(processData,reportError)
```

## Zousan-specific API

These additions are not part of the standard Promise API. Code that uses them depends specifically on Zousan.

### timeout(ms[, message])

`timeout()` returns a new Zousan that rejects if the original promise has not settled within the specified number of milliseconds. The default error is `Error("Timeout")`; pass a message to replace it.

```javascript
getData(url)
	.timeout(2000,"Data request timed out")
	.then(processData,reportError)
```

The timeout does not cancel or modify the original promise. It may still settle later. If several parts of an application need different timeouts for the same operation, create separate chains from the original promise.

```javascript
const data = getData(url)

data.timeout(1000).catch(displayProgressBar)
data.timeout(3000).catch(displayCancelButton)

data.timeout(10000).then(processData,reportError)
```

### Instance resolve(value) and reject(reason)

Native promises can only be settled through the functions passed to their executor. Zousan also lets you create an unsettled instance and resolve or reject it later.

```javascript
const promise = new Zousan()

if(success)
	promise.resolve(value)
else
	promise.reject(Error("Unable to load value"))
```

### Rejection warnings

Zousan warns through `Zousan.warn` when a rejection has no handler. It uses `console.warn` by default.

```javascript
Zousan.warn = function(...args) {
	logger.warn(...args)
}
```

Set `Zousan.suppressUncaughtRejectionError` to suppress these warnings globally, or set an individual promise's `handled` property to `true`.

```javascript
Zousan.suppressUncaughtRejectionError = true

const promise = new Zousan()
promise.handled = true
```

### Zousan.soon(fn)

`Zousan.soon()` queues a callback to run asynchronously with as little delay as the environment permits. Errors thrown by queued callbacks are passed to `Zousan.error`, which uses `console.error` by default.

```javascript
Zousan.soon(runAfterCurrentCode)
```

Repeated `soon()` calls can starve a browser's rendering and input loop, so it is best suited to short pieces of promise-related work.

## Async workflow utilities

The workflow utilities are independent modules. Import only what the application uses:

| Entry point | Exports |
| --- | --- |
| `zousan/evaluate` | `evaluate`, `evaluateResults` |
| `zousan/series` | `series` |

These entrypoints replace the corresponding `zousan-plus` utilities in new code. They do not add methods to the `Zousan` class.

### evaluate(...workflow)

`evaluate()` describes an asynchronous workflow as named values and dependencies. Independent work starts together. A dependent function runs after its dependencies resolve and receives their values as arguments. Pass the workflow as separate arguments or as one array.

```javascript
import { evaluate } from "zousan/evaluate"

const orderTotal = await evaluate(
	{ name: "customer", value: loadCustomer, deps: [customerId] },
	{ name: "cart", value: loadCart, deps: [cartId] },
	{
		name: "discount",
		value: findApplicableDiscount,
		deps: ["customer", "cart"]
	},
	{
		value: calculateOrderTotal,
		deps: ["cart", "discount"]
	}
)

displayTotal(orderTotal)
```

`customerId` and `cartId` pass directly to their functions. The strings `"customer"` and `"cart"` refer to earlier named results. The unnamed final item receives the cart and resolved discount, then returns the order total.

Each workflow item has these properties:

- `name` identifies a value so later items can depend on it. Every item except the final one must have a name; the final name is optional.
- `value` can be a direct value, a promise, or a function.
- `deps` lists values for the function. A string matching an earlier item's name refers to that result. Other values pass through unchanged.

Names must be unique, and items must appear before other items that depend on them. `evaluate()` waits for the entire workflow, then resolves with the final item's value. An empty workflow resolves with `undefined`.

### evaluateResults(...workflow)

`evaluateResults()` runs the same kind of workflow but resolves with every named value. Because each value becomes a property in the returned object, every item must have a unique name. An empty workflow resolves with an empty object.

```javascript
import { evaluateResults } from "zousan/evaluate"

const results = await evaluateResults(
	{ name: "user", value: loadUser, deps: [42] },
	{ name: "settings", value: loadSettings, deps: [42] },
	{
		name: "viewModel",
		value: buildViewModel,
		deps: ["user", "settings"]
	}
)

display(results.viewModel)
```

### series(...items)

`series()` processes values, promises, and functions in order. Each function receives the preceding result. It resolves with the last value, or `undefined` when called without items.

```javascript
import { series } from "zousan/series"

const savedOrder = await series(draftOrder,validateOrder,saveOrder)
```

## FAQ

**Q: What does "Zousan" mean?**

Well, if you had a 3-year-old Japanese child, you would know, now wouldn't you!? "Zou" is the Japanese word for "elephant." "San" is an honorific suffix placed after someone's name or title to show respect. Children, and other kawaii people, often put "san" after animal names as a sign of respect for the animals, and just to be kawaii.

[Here is a video that might help](https://www.youtube.com/watch?v=rEsNUJp9dcM)

[And if you need more guidance (or just enjoy these as much as I do) here is another](https://www.youtube.com/watch?v=b4KYDBBB6UQ) - **Zousan Da-ta!!**

**Q: Ok, cute - but why name it after an Elephant?**

Because elephants never forget. So you can depend on them to keep their promises!

**Q: Why did you write another Promise implementation?**

I briefly explained why at the top of this README. For the longer version, see my [blog post on the subject](https://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises).

**Q: How did you make it run so fast?**

I discuss that in my [Zousan blog post](https://www.bluejava.com/4Nc/A-Promising-Start---Embracing-Speed-and-Elegance-with-Zousan-Promises).

**Q: Just how fast is it?**

The [original jsperf comparison](https://jsperf.app/promise-speed-comparison/7) measured Zousan against Bluebird, When, PinkySwear, Covenant, and native promises. It is a historical benchmark from the project's early years. JavaScript engines and the compared libraries have changed considerably, so rerun it in the environments that matter to your application before drawing current performance conclusions.

## License

See the LICENSE file for license rights and limitations (MIT).
