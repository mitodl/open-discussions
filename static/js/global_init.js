// Define globals we would usually get from Django
import ReactDOM from 'react-dom';

const _createSettings = () => ({});

global.SETTINGS = _createSettings();

// polyfill for Object.entries
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

// cleanup after each test run
afterEach(function () { // eslint-disable-line mocha/no-top-level-hooks
  let node = document.querySelector("#integration_test_div");
  if (node) {
    ReactDOM.unmountComponentAtNode(node);
  }
  document.body.innerHTML = '';
  global.SETTINGS = _createSettings();
  window.location = 'http://fake/';
});

// enable chai-as-promised
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
