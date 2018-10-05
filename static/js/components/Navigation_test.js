// @flow
import { assert } from "chai"
import sinon from "sinon"

import Navigation from "./Navigation"
import SubscriptionsList from "./SubscriptionsList"

import * as channels from "../lib/channels"
import * as util from "../lib/util"
import { channelURL } from "../lib/url"
import { configureShallowRenderer, shouldIf } from "../lib/test_utils"
import { makeChannelList } from "../factories/channels"

describe("Navigation", () => {
  let sandbox,
    userIsAnonymousStub,
    defaultProps: Object,
    userCanPostStub,
    renderComponent

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    userIsAnonymousStub = sandbox.stub(util, "userIsAnonymous")
    userIsAnonymousStub.returns(false)
    userCanPostStub = sandbox.stub(channels, "userCanPost")
    userCanPostStub.returns(true)
    const subscribedChannels = makeChannelList(10)
    defaultProps = {
      pathname:           "/",
      subscribedChannels: subscribedChannels
    }
    renderComponent = configureShallowRenderer(Navigation, defaultProps)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("compose link", () => {
    const postLinkSel = ".new-post-link"

    it("should not be shown if the showComposeLink=false", () => {
      const wrapper = renderComponent({
        showComposeLink: false
      })
      assert.isFalse(wrapper.find(postLinkSel).exists())
    })

    it("should show a tooltip when clicked if useLoginPopup=true", async () => {
      userIsAnonymousStub.returns(true)
      const wrapper = renderComponent({
        showComposeLink: true,
        useLoginPopup:   true
      })
      const newPostLink = wrapper.find(postLinkSel)
      assert.equal(newPostLink.prop("href"), "#")
      assert.isFalse(wrapper.state("popupVisible"))
      await newPostLink.simulate("click", null)
      assert.isTrue(wrapper.state("popupVisible"))
    })

    it("should link to a page indicated by the composeHref prop", () => {
      const composeHref = "/path/to/compose"
      const wrapper = renderComponent({
        showComposeLink: true,
        useLoginPopup:   false,
        composeHref:     composeHref
      })
      const newPostLink = wrapper.find(postLinkSel)
      assert.equal(newPostLink.prop("to"), composeHref)
    })
  })

  //
  ;[[null, true], ["/not/home", false]].forEach(
    ([pathnameProp, expHighlighted]) => {
      it(`${shouldIf(expHighlighted)} highlight the home link if path=${String(
        pathnameProp
      )}`, () => {
        const wrapper = renderComponent(
          pathnameProp ? { pathname: pathnameProp } : {}
        )
        assert.equal(
          wrapper
            .find(".location.current-location")
            .find(".home-link")
            .exists(),
          expHighlighted
        )
      })
    }
  )

  it("should show a SubscriptionsList", () => {
    const channels = makeChannelList(10)
    const wrapper = renderComponent({
      subscribedChannels: channels
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().subscribedChannels,
      channels
    )
  })

  it("should pass the current channel down to the SubscriptionsList", () => {
    const wrapper = renderComponent({
      pathname: channelURL("foobar")
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().currentChannel,
      "foobar"
    )
  })
})
