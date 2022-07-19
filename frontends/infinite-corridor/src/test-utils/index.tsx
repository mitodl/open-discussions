import React from "react"
import App, { BASE_URL } from "../App"
import { render } from "@testing-library/react"
import { createMemoryHistory } from "history"
import { sample as lodashSample } from "lodash"
import { setMockResponse } from "./mockAxios"
import { assertNotNil } from "ol-util"
import { createQueryClient } from "../libs/react-query"

interface TestAppOptions {
  /** This will be prefixed with the baseUrl */
  url: string
}

const defaultTestAppOptions = {
  url: "/"
}

/**
 * Render the app for integration testing.
 */
const renderTestApp = (options: Partial<TestAppOptions> = {}) => {
  const { url } = { ...defaultTestAppOptions, ...options }
  const history = createMemoryHistory({ initialEntries: [`${BASE_URL}${url}`] })
  const queryClient = createQueryClient()
  render(<App queryClient={queryClient} history={history} />)
  return { history }
}


/**
 * Sample a random element of an array.
 */
const sample = <T,>(array: T[]): T => {
  const item = lodashSample(array)
  assertNotNil(item)
  return item
}

export { renderTestApp, sample }
// Conveniences
export { setMockResponse }
export { screen, prettyDOM, within } from "@testing-library/react"
export { default as user } from "@testing-library/user-event"
