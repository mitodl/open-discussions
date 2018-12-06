import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"

import Loader from "./Loader"

describe("<Loader />", () => {
  it("renders a default-loader component", () => {
    const wrap = mount(<Loader />)

    expect(wrap.exists(".default-loader")).to.equal(true)
  })
})
