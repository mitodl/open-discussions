import failOnConsole from "jest-fail-on-console"
import '@testing-library/jest-dom'
import { configure } from "@testing-library/dom"

failOnConsole({
  /**
   * This warning is removed from newer versions of React because it is
   * misleading (not usually a memory leak).
   *
   * See https://github.com/reactwg/react-18/discussions/82
   */
  silenceMessage: msg => /Can't perform a React state update on an unmounted component/.test(msg),
})

configure({
  /**
   * Adapted from https://github.com/testing-library/dom-testing-library/issues/773
   * to make the error messages a bit more succinct.
   *
   * By default, testing-library prints much too much of the DOM.
   *
   * This does change the stacktrace a bit: The line causing the error is still
   * there, but the line where the error is generated (below) is most visible.
   */
  getElementError(message, _container) {
    const error = new Error(message ?? "")
    error.name = "TestingLibraryElementError"
    return error
  },
})
