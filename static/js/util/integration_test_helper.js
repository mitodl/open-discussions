/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import sinon from "sinon"
import { createMemoryHistory } from "history"
import configureTestStore from "redux-asserts"

import Router, { routes } from "../Router"
import * as api from "../lib/api"
import rootReducer from "../reducers"
import type { Sandbox } from "../flow/sinonTypes"

export default class IntegrationTestHelper {
  sandbox: Sandbox
  store: TestStore
  browserHistory: History

  constructor() {
    this.sandbox = sinon.sandbox.create()
    this.store = configureTestStore((...args) => {
      // uncomment to listen on dispatched actions
      // console.log(args);
      return rootReducer(...args)
    })

    // we need this to deal with the 'endpoint' objects, it's now necessary
    // to directly mock out the fetch call because at module load time the
    // endpoint object already holds a reference to the unmocked API function
    // (e.g. getCoupons) which Sinon doesn't seem to be able to deal with.
    this.fetchJSONWithCSRFStub = this.sandbox.stub(api, "fetchJSONWithCSRF")

    this.listenForActions = this.store.createListenForActions()
    this.dispatchThen = this.store.createDispatchThen()

    // stub all the api functions
    // NOTE: due to a regression in sinon 2.x, if you use `callsFake` you must
    //       call `resetBehavior()` on the stub first or the error still raises
    for (let methodName in api) {
      if (typeof api[methodName] === "function") {
        let stubName = `${methodName}Stub`
        this[stubName] = this.sandbox.stub(api, methodName).throws(new Error(`${stubName} not implemented`))
      }
    }

    this.scrollIntoViewStub = this.sandbox.stub()
    window.HTMLDivElement.prototype.scrollIntoView = this.scrollIntoViewStub
    window.HTMLFieldSetElement.prototype.scrollIntoView = this.scrollIntoViewStub
    this.browserHistory = createMemoryHistory()
    this.currentLocation = null
    this.browserHistory.listen(url => {
      this.currentLocation = url
    })
  }

  cleanup() {
    this.sandbox.restore()
  }

  /**
   * Renders the components using the given URL.
   * @param url {String} The react-router URL
   * @param typesToAssert {Array<String>|null} A list of redux actions to listen for.
   * If null, actions types for the success case is assumed.
   * @returns {Promise<*>} A promise which provides [wrapper, div] on success
   */
  renderComponent(url: string = "/", typesToAssert: Array<string> | null = null): Promise<*> {
    let expectedTypes = []
    if (typesToAssert === null) {
      expectedTypes = []
    } else {
      expectedTypes = typesToAssert
    }

    let wrapper, div

    return this.listenForActions(expectedTypes, () => {
      this.browserHistory.push(url)
      div = document.createElement("div")
      div.setAttribute("id", "integration_test_div")
      document.body.appendChild(div)
      wrapper = mount(
        <div>
          <Router history={this.browserHistory} store={this.store}>
            {routes}
          </Router>
        </div>,
        {
          attachTo: div
        }
      )
    }).then(() => {
      return Promise.resolve([wrapper, div])
    })
  }
}
