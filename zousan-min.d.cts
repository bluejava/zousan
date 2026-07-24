/**
 * A small Promise/A+ implementation with a few convenience extensions.
 */
declare class Zousan<T = unknown> implements PromiseLike<T>
{
	constructor(executor?: (
		resolve: (value: T | PromiseLike<T>) => void,
		reject: (reason?: any) => void
	) => void)

	/**
	 * Prevent the uncaught-rejection warning for this promise.
	 */
	handled?: boolean

	/**
	 * Resolve this promise with a value or thenable.
	 */
	resolve(value: T | PromiseLike<T>): void

	/**
	 * Reject this promise with the supplied reason.
	 */
	reject(reason?: any): void

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
	): Zousan<TResult1 | TResult2>

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
	): Zousan<T | TResult>

	finally(onfinally?: (() => void) | null): Zousan<T>

	/**
	 * Return a new promise that rejects if this promise has not settled in time.
	 */
	timeout(ms: number, timeoutMsg?: string): Zousan<T>

	static resolve(): Zousan<void>
	static resolve<T>(value: T): Zousan<Awaited<T>>
	static reject<T = never>(reason?: any): Zousan<T>

	static all<T extends readonly unknown[] | []>(
		values: T
	): Zousan<{ -readonly [P in keyof T]: Awaited<T[P]> }>

	/**
	 * Override the handler used for uncaught-rejection warnings.
	 */
	static warn: (...data: any[]) => void

	/**
	 * Override the handler used for errors thrown by queued callbacks.
	 */
	static error: (...data: any[]) => void

	/**
	 * Queue a callback to run asynchronously as soon as possible.
	 */
	static soon: (fn: () => void) => void

	/**
	 * Suppress uncaught-rejection warnings globally.
	 */
	static suppressUncaughtRejectionError?: boolean
}

export = Zousan
