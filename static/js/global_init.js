// Define globals we would usually get from Django
import ReactDOM from "react-dom"

const _createSettings = () => ({})

global.SETTINGS = _createSettings()

// polyfill for Object.entries
import entries from "object.entries"
if (!Object.entries) {
  entries.shim()
}

// cleanup after each test run
// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(function() {
  let node = document.querySelector("#integration_test_div")
  if (node) {
    ReactDOM.unmountComponentAtNode(node)
  }
  document.body.innerHTML = ""
  global.SETTINGS = _createSettings()
  window.location = "http://fake/"

  // Uncomment this to diagnose stray API calls
  // This adds a 200 ms delay between tests. Since fetchMock is still enabled at this point the next unmatched
  // fetch attempt which occurs within 200 ms after the test finishes will cause a warning.
  // return require('./lib/util').wait(200)
})

// enable chai-as-promised
import chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)
