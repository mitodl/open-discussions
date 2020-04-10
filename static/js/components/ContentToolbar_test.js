// @flow
/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import ContentToolbar from "./ContentToolbar"

import { COURSE_URL, PODCAST_URL, userListIndexURL } from "../lib/url"
import { makeProfile } from "../factories/profiles"
import * as util from "../lib/util"

describe("ContentToolbar", () => {
  let sandbox

  const renderToolbar = () =>
    shallow(
      <ContentToolbar
        toggleShowUserMenu={sandbox.stub()}
        showUserMenu={false}
        profile={makeProfile()}
      />,
      { disableLifecycleMethods: true }
    )

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should include UserMenu", () => {
    assert.isTrue(
      renderToolbar()
        .find("UserMenu")
        .exists()
    )
  })

  it("should include a link to courses", () => {
    assert.equal(
      renderToolbar()
        .find("Link")
        .at(1)
        .prop("to"),
      COURSE_URL
    )
  })

  it("should include a link to podcasts", () => {
    assert.equal(
      renderToolbar()
        .find("Link")
        .at(2)
        .prop("to"),
      PODCAST_URL
    )
  })

  it("should include a link to the my lists page", () => {
    const link = renderToolbar().find(".user-list-link")
    assert.equal(link.prop("children")[1], "My Lists")
    assert.equal(link.prop("to"), userListIndexURL)
  })

  it("should hide the my lists link when you're anonymous", () => {
    sandbox.stub(util, "userIsAnonymous").returns(true)
    assert.isNotOk(
      renderToolbar()
        .find(".user-list-link")
        .exists()
    )
  })
})
