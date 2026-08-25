import Zousan = require("../zousan-min.cjs")

export type SeriesItem<T = unknown> = T
	| PromiseLike<T>
	| ((previousValue: T) => T | PromiseLike<T>)

export function series<T = unknown>(items: readonly SeriesItem<T>[]): Zousan<T>
export function series<T = unknown>(...items: SeriesItem<T>[]): Zousan<T>
