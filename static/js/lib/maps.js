// @flow
import R from "ramda"

// utilities for working with Map objects

export const safeBulkGet = <T>(keys: Array<string>, data: Map<string, T>): Array<T> =>
  R.reject(R.isNil, keys.map(key => data.get(key)))
