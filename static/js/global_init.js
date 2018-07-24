// Define globals we would usually get from Django
import ReactDOM from "react-dom"

// setup adaptor for enzyme
// see http://airbnb.io/enzyme/docs/installation/index.html
import { configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"

configure({ adapter: new Adapter() })

const _createSettings = () => ({
  max_comment_depth:  6,
  authenticated_site: {
    title:       "MicroMasters",
    login_url:   "http://fake.micromasters.url/discussions",
    base_url:    "http://fake.micromasters.url/",
    session_url: "http://fake.session.url",
    tos_url:     "http://fake.tos.url/"
  },
  allow_anonymous:    false,
  allow_saml_auth:    false,
  allow_email_auth:   false,
  is_authenticated:   true,
  username:           "greatusername",
  user_full_name:     "Great User",
  profile_ui_enabled: false,
  support_email:      "support@fake.url",
  reactGaDebug:       true,
  gaTrackingID:       "fake",
  embedlyKey:         "fake"
})

global.SETTINGS = _createSettings()

window.scrollTo = () => "scroll!"

// polyfill for Object.entries
import entries from "object.entries"
if (!Object.entries) {
  entries.shim()
}

// cleanup after each test run
// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(function() {
  const node = document.querySelector("#integration_test_div")
  if (node) {
    ReactDOM.unmountComponentAtNode(node)
  }
  document.body.innerHTML = ""
  global.SETTINGS = _createSettings()
  window.location = "http://fake/"

  // Uncomment this to diagnose stray API calls
  // This adds a 200 ms delay between tests. This helps diagnose errors where
  // we undo the mock for an API function before the test completes.
  // return require('./lib/util').wait(200)
})

// rethrow all unhandled promise errors
//process.on("unhandledRejection", reason => {
//   throw reason // uncomment to show promise-related errors
//})

// enable chai-as-promised
import chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)
