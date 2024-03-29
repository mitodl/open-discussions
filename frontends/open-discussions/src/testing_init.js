import ReactDOM from "react-dom"

// setup adaptor for enzyme
// see http://airbnb.io/enzyme/docs/installation/index.html
import { configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"

import moment from "moment"
moment.locale("en")

import { enableMapSet } from "immer"
enableMapSet()

configure({ adapter: new Adapter() })

window.NODE_ENV = process.env.NODE_ENV

// Define globals we would usually get from Django
const _createSettings = () => ({
  max_comment_depth:  6,
  authenticated_site: {
    title:    "MicroMasters",
    base_url: "http://fake.micromasters.url/",
    tos_url:  "http://fake.tos.url/"
  },
  allow_saml_auth:        false,
  allow_related_posts_ui: false,
  is_authenticated:       true,
  is_admin:               false,
  is_public_list_editor:  false,
  is_staff_list_editor:   false,
  username:               "greatusername",
  user_full_name:         "Great User",
  user_id:                0,
  profile_ui_enabled:     false,
  course_ui_enabled:      false,
  file_search_enabled:    false,
  support_email:          "support@fake.url",
  reactGaDebug:           true,
  gaTrackingID:           "fake",
  embedlyKey:             "fake",
  public_path:            "http://fake.open.url/",
  site_url:               "http://fake.open.url/",
  recaptchaKey:           "",
  search_page_size:       5,
  search_min_length:      2,
  accepted_social_sites:  [],
  livestream_ui_enabled:  true,
  ckeditor_upload_url:    "/upload/token",
  FEATURES:               { ["KEYCLOAK_ENABLED"]: false }
})

global.SETTINGS = _createSettings()
global._testing = true

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

// This method is purposefully defined here in order to
// avoid importing test_utils which will cause issues.
const mockHTMLElHeight = (scrollHeight: number, offsetHeight: number) => {
  // $FlowFixMe
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get:          function() {
      return scrollHeight || 0
    }
  })

  // $FlowFixMe
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get:          function() {
      return offsetHeight || 0
    }
  })
}
mockHTMLElHeight(100, 100)
