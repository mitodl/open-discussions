/**
 * Type assertion that asserts value is not null or undefined.
 *
 * Unlike jest assertions, this will refine the type.
 * See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179
 */
export const assertInstanceOf: <
  C extends {
    new (...args: unknown[]): unknown
  }
>(
  value: unknown,
  Class: C
) => asserts value is InstanceType<C> = (value, Class) => {
  if (value instanceof Class) return
  throw new Error(`Expected value to be instanceof ${Class}`)
}

/**
 * Returns `true` if and only if the value is not `null` or `undefined`.
 */
export const isNotNil = <T>(x: T): x is NonNullable<T> => {
  if (x === null || x === undefined) return false
  return true
}

type MaybeHasKeys<K extends string> = Partial<Record<K, unknown>>
/**
 * A curried predicate `propNames => obj => boolean`. Primarily useful because
 * the returned function `obj => boolean` is a Typescript Predicate that can
 * be used to filter arrays. For example:
 *
 * ```ts
 * type A = { a: number }
 * const maybes = [{ a: 1 }, {}, { a: undefined }]
 * const definitelies: A[] = maybes.filter(propsNotNil(["a"]))
 * ```
 */
export const propsNotNil = <P extends string>(propNames: P[]) => {
  return <T extends MaybeHasKeys<P>>(
    obj: NonNullable<T>
  ): obj is T & { [k in P]: NonNullable<T[k]> } => {
    return propNames.every(prop => isNotNil(obj[prop]))
  }
}

/**
 * Assert value is not `null` or `undefined`. Optionally, provide an error message.
 */
export const assertNotNil: <T>(
  value: T,
  msg?: string
) => asserts value is NonNullable<T> = (value, msg) => {
  if (isNotNil(value)) return
  if (msg) {
    throw new Error(msg)
  }
  throw new Error(`Value ${value} should not be nil.`)
}
