import React from "react"
import { mount } from "enzyme/build"
import { expect } from "chai"

import Renderer from "./Renderer"

describe("<Renderer />", () => {
  const dummyTitle = "dummyTitle"
  const expectedWidgetText = (
    <div className="widget-text card-text text-truncate">
      <p>dummyHTML</p>
    </div>
  )
  const dummyProps = {
    title: dummyTitle,
    html:  "<p>dummyHTML</p>"
  }

  it("sets title and html elements on render", () => {
    const wrap = mount(<Renderer {...dummyProps} />)
    const htmlWrap = mount(expectedWidgetText)

    expect(wrap.find(".widget-title").text()).to.equal(dummyTitle)
    expect(wrap.find(".widget-text").html()).to.equal(htmlWrap.html())
  })
})
