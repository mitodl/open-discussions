// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import { Grid, Cell } from "./Grid"

describe("Grid components", () => {
  it("should render a grid with children", () => {
    const wrapper = shallow(
      <Grid>
        <div className="child" />
      </Grid>
    )
    assert.equal(wrapper.props().className, "mdc-layout-grid")
    assert.ok(wrapper.find(".mdc-layout-grid__inner").exists())
    assert.ok(wrapper.find(".child").exists())
  })

  //
  ;[1, 12].forEach(width => {
    it(`should create a cell with width ${width}`, () => {
      const wrapper = shallow(
        <Cell width={width}>
          <div className="child" />
        </Cell>
      )
      assert.equal(
        wrapper.props().className,
        `mdc-layout-grid__cell--span-${width}`
      )
      assert.ok(wrapper.find(".child").exists())
    })
  })
})
