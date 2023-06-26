import { setupMockEditors } from "ol-ckeditor/test_utils"

setupMockEditors()

afterEach(() => {
  /**
   * Clear all mock call counts between tests.
   * This does NOT clear mock implementations.
   * Mock implementations are always cleared between test files.
   */
  jest.clearAllMocks()
})

window.SETTINGS = {
  embedlyKey:        "fake-embedly-key",
  search_page_size:  4,
  ocw_next_base_url: "fake-ocw-next-base-url"
}
