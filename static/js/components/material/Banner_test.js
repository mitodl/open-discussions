// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import _ from "lodash"

import { shouldIf } from "../../lib/test_utils"
import Banner from "./Banner"

describe("Banner", () => {
  let banner, hide

  const renderBanner = () => shallow(<Banner banner={banner} hide={hide} />)

  beforeEach(() => {
    banner = {
      message: "",
      visible: false
    }
    hide = sinon.stub()
  })

  it("should render banner", () => {
    const message = "Banner text"
    banner.message = message
    const wrapper = renderBanner()
    assert.include(wrapper.text(), message)
    assert.equal(wrapper.find("a").prop("onClick"), hide)
  })

  //
  ;[[false, false], [true, true]].forEach(([visible, expActive]) => {
    it(`${shouldIf(
      expActive
    )} set an active class on the banner when visible=${String(
      visible
    )}`, () => {
      banner.visible = visible
      const wrapper = renderBanner()
      assert.equal(
        _.includes(wrapper.find(".banner").prop("className"), "banner--active"),
        expActive
      )
    })
  })
})
