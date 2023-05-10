import invariant from "tiny-invariant"

/**
 * A [thennable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables)
 * that can be resolved or rejected from outside its constructor.
 *
 * Useful for testing UI behavior during an async operation, e.g., between an
 * API request and its response.
 *
 * Example usage:
 * ```ts
 * const controlled = new ControlledPromise()
 * // test behavior well promise is pending
 * controlled.resolve()
 * await controlled
 * // test behavior after resolution
 * ```
 *
 */
export default class ControlledPromise<R> implements Promise<R> {
  resolve: (value: R) => void = () => invariant(false, "Not yet assigned")
  reject: (reason?: unknown) => void = () =>
    invariant(false, "Not yet assigned")

  private readonly promise = new Promise<R>((resolve, reject) => {
    this.resolve = resolve
    this.reject = reject
  })

  then = this.promise.then.bind(this.promise)
  catch = this.promise.catch.bind(this.promise)
  finally = this.promise.finally.bind(this.promise)

  get [Symbol.toStringTag]() {
    return "ControlledPromise"
  }
}
