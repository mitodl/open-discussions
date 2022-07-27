import Enzyme from "enzyme"
import Adapter from "enzyme-adapter-react-16"

Enzyme.configure({ adapter: new Adapter() })

const _createSettings = () => ({
  embedlyKey:        "fake",
  ocw_next_base_url: "fake-ocw.com",
  search_page_size:  20
})

global.SETTINGS = _createSettings()

// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(function() {
  const node = document.querySelector("#integration_test_div")
  if (node) {
    // @ts-expect-error we need to set SETTINGS for all tests
    ReactDOM.unmountComponentAtNode(node)
  }
  document.body.innerHTML = ""

  global.SETTINGS = _createSettings()
})
