import { setupMockMarkdownEditor } from "./test-utils"

setupMockMarkdownEditor()

afterEach(() => {
  /**
   * Clear all mock call counts between tests.
   * This does NOT clear mock implementations.
   * Mock implementations are always cleared between test files.
   */
  jest.clearAllMocks()
})

window.SETTINGS = { embedlyKey: "fake-embedly-key" }
