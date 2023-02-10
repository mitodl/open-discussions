import React from "react"
import App, { AppProviders, BASE_URL } from "../App"
import { render } from "@testing-library/react"
import { createMemoryHistory } from "history"
import { setMockResponse } from "./mockAxios"
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
 * Render a component with the same providers app uses.
 *
 * Good for more isolated testing.
 */
const renderWithProviders = (
  component: React.ReactNode,
  options: Partial<TestAppOptions> = {}
) => {
  const { url } = { ...defaultTestAppOptions, ...options }
  const history = createMemoryHistory({ initialEntries: [`${BASE_URL}${url}`] })
  const queryClient = createQueryClient()
  render(
    <AppProviders queryClient={queryClient} history={history}>
      {component}
    </AppProviders>
  )
  return { history }
}

/**
 * Assert that a functional component was called with the given props.
 * @param fc the mock or spied upon functional component
 * @param partialProps an object of props
 * @param call The call count. Defaults to -1 (the last call). Especially when
 *  rendering a list of items, other values may be useful.
 */
const expectProps = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fc: jest.Mock<any, any>,
  partialProps: unknown,
  call?: number
) => {
  if (call !== undefined) {
    const callArgs = fc.mock.calls.at(call)
    expect(callArgs).toEqual([
      expect.objectContaining(partialProps),
      expect.anything()
    ])
  } else {
    expect(fc).toHaveBeenCalledWith(
      expect.objectContaining(partialProps),
      expect.anything()
    )
  }
}

export { renderTestApp, renderWithProviders, expectProps }
// Conveniences
export { setMockResponse }
export {
  screen,
  prettyDOM,
  within,
  fireEvent,
  waitFor
} from "@testing-library/react"
export { default as user } from "@testing-library/user-event"
