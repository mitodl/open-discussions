/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { mount, shallow } from "enzyme"
import sinon from "sinon"
import { createMemoryHistory } from "history"
import configureTestStore from "redux-asserts"
import configureStore from "redux-mock-store"
import thunk from "redux-thunk"

import Router, { routes } from "../Router"

import * as api from "../lib/api/api"
import * as channelAPI from "../lib/api/channels"
import * as ckeditorAPI from "../lib/api/ckeditor"
import * as moderationAPI from "../lib/api/moderation"
import * as embedlyAPI from "../lib/api/embedly"
import * as frontpageAPI from "../lib/api/frontpage"
import * as postAPI from "../lib/api/posts"
import * as commentAPI from "../lib/api/comments"
import rootReducer from "../reducers"
import * as utilFuncs from "../lib/util"

import type { Sandbox } from "../flow/sinonTypes"

export default class IntegrationTestHelper {
  sandbox: Sandbox
  store: TestStore
  browserHistory: History

  constructor() {
    this.sandbox = sinon.createSandbox({})
    this.store = configureTestStore((...args) => {
      // uncomment to listen on dispatched actions
      // console.log(args)
      return rootReducer(...args)
    })

    this.listenForActions = this.store.createListenForActions()
    this.dispatchThen = this.store.createDispatchThen()

    // stub all the api functions
    // NOTE: due to a regression in sinon 2.x, if you use `callsFake` you must
    //       call `resetBehavior()` on the stub first or the error still raises
    ;[
      api,
      channelAPI,
      ckeditorAPI,
      moderationAPI,
      embedlyAPI,
      frontpageAPI,
      postAPI,
      commentAPI
    ].forEach(apiModule => {
      for (const methodName in apiModule) {
        if (typeof apiModule[methodName] === "function") {
          const stubName = `${methodName}Stub`
          this[stubName] = this.sandbox
            .stub(apiModule, methodName)
            .throws(() => new Error(`${stubName} not implemented`))
        }
      }
    })

    this.scrollIntoViewStub = this.sandbox.stub()
    window.HTMLDivElement.prototype.scrollIntoView = this.scrollIntoViewStub
    window.HTMLFieldSetElement.prototype.scrollIntoView = this.scrollIntoViewStub
    this.browserHistory = createMemoryHistory()
    this.currentLocation = null
    this.browserHistory.listen(url => {
      this.currentLocation = url
    })
    this.getViewportWidthStub = this.sandbox
      .stub(utilFuncs, "getViewportWidth")
      .returns(700)
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
  renderComponent(
    url: string = "/",
    typesToAssert: Array<string> | null = null
  ): Promise<*> {
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

  isLoadingComponentClass(cls) {
    return cls.name === "WithLoading" || cls.name === "WithPostLoading"
  }

  configureHOCRenderer(
    WrappedComponent: Class<React.Component<*, *>>,
    InnerComponent: Class<React.Component<*, *>>,
    defaultState: Object,
    defaultProps = {}
  ) {
    const mockStore = configureStore([thunk])
    const history = this.browserHistory
    return async (
      extraState = {},
      extraProps = {
        history
      }
    ) => {
      const initialState = R.mergeDeepRight(defaultState, extraState)
      const store = mockStore(initialState)
      const wrapper = await shallow(
        <WrappedComponent
          store={store}
          dispatch={store.dispatch}
          {...defaultProps}
          {...extraProps}
        />
      )

      // dive through layers of HOCs until we reach the desired inner component
      let inner = wrapper
      while (!inner.is(InnerComponent)) {
        // determine the type before we dive
        const cls = inner.type()
        if (
          this.isLoadingComponentClass(cls) &&
          InnerComponent === cls.WrappedComponent
        ) {
          // WithLoading is actually subclassing the component, not rendering it as an inner component so there's
          // no extra step to dive here.
          break
        }

        // shallow render this component
        inner = await inner.dive()

        // if it defines WrappedComponent, find() that so we skip over any intermediaries
        if (
          cls &&
          cls.hasOwnProperty("WrappedComponent") &&
          inner.find(cls.WrappedComponent).length
        ) {
          inner = inner.find(cls.WrappedComponent)
        }
      }
      // one more time to shallow render the InnerComponent
      inner = await inner.dive()

      return { wrapper, inner, store }
    }
  }
}
