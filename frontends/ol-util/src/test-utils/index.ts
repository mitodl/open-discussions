import { buildQueries, within } from "@testing-library/react"
import type { GetErrorFunction } from "@testing-library/react"
import mediaQuery from "css-mediaquery"
import { assertInstanceOf } from "../predicates"

/**
 * Create a mock mediaQuery functiton. Matches are determined by comparison with
 * the provided values.
 *
 * For example:
 * ```
 * const mediaQuery = createMatchMediaForJsDom({ width: "100px" })
 * // Will return false; width is "100px", which is below minimum
 * mediaQuery("(min-width: 120px)").match
 * ```
 *
 * See
 *  - https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
 *  - https://mui.com/material-ui/react-use-media-query/#testing
 */
const createMatchMediaForJsDom = (
  values: Partial<mediaQuery.MediaValues>
): ((query: string) => MediaQueryList) => {
  return (query: string) => ({
    matches:             mediaQuery.match(query, values),
    media:               query,
    addListener:         jest.fn(),
    removeListener:      jest.fn(),
    addEventListener:    jest.fn(),
    removeEventListener: jest.fn(),
    onchange:            null,
    dispatchEvent:       jest.fn()
  })
}

/**
 * Get all <dd> elements whose corresponding <dt> element matches the given term.
 */
const queryAllByTerm = (
  c: HTMLElement,
  term: string,
  { exact = true } = {}
): HTMLElement[] => {
  const matches = within(c)
    .queryAllByRole("term")
    .filter(el =>
      exact ? el.textContent === term : el.textContent?.includes(term)
    )
    .map(n => {
      // eslint-disable-next-line testing-library/no-node-access
      const dd = n.nextSibling
      if (dd instanceof HTMLElement && dd.tagName === "DD") return dd
      throw new Error("Expected node to be an <dd> HTMLElement.")
    })
  return matches
}
const getMultipleError: GetErrorFunction = (_c, term: string) =>
  `Found multiple <dd> elements with preceding term: ${term}`
const getMissingError: GetErrorFunction = (_c, term: string) =>
  `Unable to find a <dd> element with preceding term: ${term}`
const byTerm = buildQueries(queryAllByTerm, getMultipleError, getMissingError)

/**
 * Get a unique <dd> elements whose corresponding <dt> element matches the
 * given term, or return null if none exists.
 */
const queryByTerm = byTerm[0]
const getAllByTerm = byTerm[1]
/**
 * Get a unique <dd> elements whose corresponding <dt> element matches the
 * given term. Throws an error if no such element exists.
 */
const getByTerm = byTerm[2]
const findAllByTerm = byTerm[3]
const findByTerm = byTerm[4]

const getDescriptionFor = (el: HTMLElement) => {
  const errId = el.getAttribute("aria-describedby")
  if (errId === null) {
    throw new Error(
      "The specified element does not have an associated ariia-describedby."
    )
  }
  // eslint-disable-next-line testing-library/no-node-access
  const errEl = document.getElementById(errId)
  assertInstanceOf(errEl, HTMLElement)
  return errEl
}

export {
  queryAllByTerm,
  queryByTerm,
  getAllByTerm,
  getByTerm,
  findAllByTerm,
  findByTerm,
  getDescriptionFor,
  createMatchMediaForJsDom
}
