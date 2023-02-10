import qs from "qs"

const alphabeticalSort = (a: string, b: string) => a.localeCompare(b)

/**
 * Convert an object into a querystring, sorting its parameters.
 *
 * Does NOT prepend a "?".
 */
const toQueryString = (
  params?: Record<string, number | string | boolean | undefined>
) => {
  return qs.stringify(params, { sort: alphabeticalSort })
}

export { toQueryString }
