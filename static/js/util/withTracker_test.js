/* global SETTINGS: false */
// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import ReactGA from "react-ga"
import _ from "lodash"

import withTracker from "./withTracker"
import { shouldIf } from "../lib/test_utils"

type PageProps = {
  extraProps: Object
}

class Page extends React.Component<*, *> {
  props: PageProps

  render() {
    return <div />
  }
}

describe("withTracker", () => {
  let sandbox, gaInitStub, gaPageViewStub, gaGaStub, WrappedPage

  const renderPage = ({ ...props }) => shallow(<WrappedPage {...props} />)

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    gaInitStub = sandbox.stub(ReactGA, "initialize")
    gaPageViewStub = sandbox.stub(ReactGA, "pageview")
    gaGaStub = sandbox.stub(ReactGA, "ga")
  })

  afterEach(() => {
    sandbox.restore()
  })
  //
  ;[
    [
      {
        channel01: "UA-fake01-1",
        channel02: "UA-fake02-1",
        channel03: "UA-fake01-1"
      },
      "channel02",
      "UA_fake02_1.send"
    ],
    [
      {
        channel01: "UA-fake01-1",
        channel02: "UA-fake02-1",
        channel03: "UA-fake01-1"
      },
      "channel01",
      "UA_fake01_1.send"
    ],
    [
      { channel01: "UA-fake01-1" },
      "channel01/w4/comment/b2",
      "UA_fake01_1.send"
    ],
    [
      { channel01: "UA-fake01-1", channel02: "UA-fake02-1" },
      "channel03/w4/comment/b2",
      null
    ],
    [{}, "channel01", null]
  ].forEach(([trackers, path, sender]) => {
    it(`${shouldIf(
      sender !== null
    )} make a pageview call with sender ${sender ||
      "null"} for url /c/${path} from trackers [${_
      .keys(trackers)
      .toString()}]`, () => {
      SETTINGS.gaChannelTrackers = trackers
      SETTINGS.gaTrackingID = "UA-default-1"
      window.location = `http://fake/c/${path}`
      WrappedPage = withTracker(Page)
      renderPage({ location: window.location })
      assert.ok(gaInitStub.calledOnce)
      assert.ok(gaPageViewStub.calledWith(window.location.pathname))
      if (sender) {
        assert.ok(
          gaGaStub.calledWith(sender, "pageview", window.location.pathname)
        )
      } else {
        assert.ok(gaGaStub.notCalled)
      }
    })
  })
})
