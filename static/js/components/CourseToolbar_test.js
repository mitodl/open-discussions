// @flow
/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import CourseToolbar from "./CourseToolbar"

import { COURSE_URL } from "../lib/url"
import { makeProfile } from "../factories/profiles"

describe("CourseToolbar", () => {
  let sandbox

  const renderToolbar = () =>
    shallow(
      <CourseToolbar
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
})
