import React from "react"
import App, { BASE_URL } from "../App"
import { render } from "@testing-library/react"
import { createMemoryHistory} from "history"
import { setMockResponse } from "./mockNetworkInterface"

interface TestAppOptions {
  /** This will be prefixed with the baseUrl */
  url: string
}

const defaultTestAppOptions = {
  url: '/'
}

/**
 * Render the app for integration testing.
 */
const renderTestApp = (options: Partial<TestAppOptions> = {}) => {
  const { url } = { ...defaultTestAppOptions, ...options }
  const history = createMemoryHistory({ initialEntries: [`${BASE_URL}${url}`] })
  render(<App history={history} />) 
}


export { renderTestApp }

// Conveniences
export { setMockResponse }
export { screen, prettyDOM } from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"