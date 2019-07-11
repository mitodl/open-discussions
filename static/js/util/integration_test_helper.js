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
import * as livestreamAPI from "../lib/api/livestream"
import * as courseAPI from "../lib/queries/courses"
import * as bootcampAPI from "../lib/queries/bootcamps"
import * as widgetAPI from "../lib/api/widgets"
import rootReducer from "../reducers"
import * as utilFuncs from "../lib/util"
import * as networkInterfaceFuncs from "../store/network_interface"
import * as embedUtil from "../lib/embed"

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
      commentAPI,
      livestreamAPI,
      courseAPI,
      bootcampAPI,
      widgetAPI
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
    this.embedlyPlatformStub = this.sandbox.stub(
      embedUtil,
      "loadEmbedlyPlatform"
    )
    this.getCKEditorJWTStub.returns(Promise.resolve())

    const defaultResponse = {
      body:   {},
      status: 200
    }
    this.handleRequestStub = this.sandbox.stub().returns(defaultResponse)
    this.sandbox
      .stub(networkInterfaceFuncs, "makeRequest")
      .callsFake((url, method, options) => ({
        execute: callback => {
          const response = this.handleRequestStub(url, method, options)
          const err = null
          const resStatus = (response && response.status) || 0
          const resBody = (response && response.body) || undefined
          const resText = (response && response.text) || undefined
          const resHeaders = (response && response.header) || undefined

          callback(err, resStatus, resBody, resText, resHeaders)
        },
        abort: () => {
          throw new Error("Aborts currently unhandled")
        }
      }))
  }

  cleanup(unmount = true) {
    this.sandbox.restore()

    // the unmount call helps keep memory usage under control
    // sometimes we don't want to though b/c it can cause some issues
    // with redux-query
    if (this.wrapper && unmount) {
      this.wrapper.unmount()
      delete this.wrapper
    }
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

    let div

    return this.listenForActions(expectedTypes, () => {
      this.browserHistory.push(url)
      div = document.createElement("div")
      div.setAttribute("id", "integration_test_div")
      document.body.appendChild(div)
      this.wrapper = mount(
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
      return Promise.resolve([this.wrapper, div])
    })
  }

  isLoadingComponentClass(cls) {
    return cls.name === "WithLoading" || cls.name === "WithPostLoading"
  }

  stubComponent(module, displayName, name = "default") {
    const Stubber = props => <div />
    Stubber.displayName = displayName
    this[`${displayName}Stub`] = this.sandbox
      .stub(module, name)
      .callsFake(props => <Stubber {...props} />)
  }

  createMockStore(initialState) {
    const mockStore = configureStore([thunk])
    const store = mockStore(initialState)
    store.getLastAction = function() {
      const actions = this.getActions()
      return actions[actions.length - 1]
    }
    return store
  }

  configureHOCRenderer(
    WrappedComponent: Class<React.Component<*, *>>,
    InnerComponent: Class<React.Component<*, *>>,
    defaultState: Object,
    defaultProps = {}
  ) {
    const history = this.browserHistory
    return async (
      extraState = {},
      extraProps = {
        history
      }
    ) => {
      const initialState = R.mergeDeepRight(defaultState, extraState)
      const store = this.createMockStore(initialState)
      const wrapper = await mount(
        <Router history={this.browserHistory} store={this.store}>
          <WrappedComponent
            store={store}
            dispatch={store.dispatch}
            {...defaultProps}
            {...extraProps}
          />
        </Router>
      )

      this.wrapper = wrapper

      const inner = wrapper.find(InnerComponent).exists()
        ? wrapper.find(InnerComponent)
        : wrapper
          .findWhere(
            component =>
              component.type() &&
                component.type().WrappedComponent === InnerComponent
          )
          .last()

      return { wrapper, inner, store }
    }
  }
}
