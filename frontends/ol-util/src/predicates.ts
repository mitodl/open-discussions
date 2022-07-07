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
