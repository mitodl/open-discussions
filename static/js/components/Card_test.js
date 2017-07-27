// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import Card from "./Card"

describe("Card component", () => {
  let mountCard = children =>
    shallow(
      <Card>
        {children}
      </Card>
    )

  it("should render children", () => {
    let wrapper = mountCard(<div className="child">HEY</div>)
    assert.lengthOf(wrapper.find(".child"), 1)
    assert.equal(wrapper.text(), "HEY")
  })
})
