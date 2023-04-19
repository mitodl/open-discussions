import React from "react"
import App, { AppProviders, BASE_URL } from "../App"
import { render } from "@testing-library/react"
import { createMemoryHistory } from "history"
import { setMockResponse } from "./mockAxios"
import { createQueryClient } from "../libs/react-query"
import type { User } from "../types/settings"
import { makeUserSettings } from "./factories"

interface TestAppOptions {
  /** This will be prefixed with the baseUrl */
  url: string
  user: Partial<User>
}

const defaultTestAppOptions = {
  url: "/"
}

/**
 * Render the app for integration testing.
 */
const renderTestApp = (options: Partial<TestAppOptions> = {}) => {
  const { url } = { ...defaultTestAppOptions, ...options }

  // window.SETTINGS is reset during tests via afterEach hook.
  window.SETTINGS.user = makeUserSettings(options.user)

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

  // window.SETTINGS is reset during tests via afterEach hook.
  window.SETTINGS.user = makeUserSettings(options.user)

  const history = createMemoryHistory({ initialEntries: [`${BASE_URL}${url}`] })
  const queryClient = createQueryClient()
  const view = render(
    <AppProviders queryClient={queryClient} history={history}>
      {component}
    </AppProviders>
  )
  return { history, view }
}

/**
 * Assert that a functional component was called at some point with the given
 * props. Optionally, specify a call index.
 * Optionally, specify that a particular function number occured with given props.
 * @param fc the mock or spied upon functional component
 * @param partialProps an object of props
 * @param nthCall Optional index. If specified, then asserts that particular
 *  call occurred with given props.
 */
const expectProps = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fc: jest.Mock<any, any>,
  partialProps: unknown,
  nthCall?: number
) => {
  if (nthCall !== undefined) {
    const callArgs = fc.mock.calls.at(nthCall)
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
  act,
  screen,
  prettyDOM,
  within,
  fireEvent,
  waitFor
} from "@testing-library/react"
export { default as user } from "@testing-library/user-event"

export type { TestAppOptions }
