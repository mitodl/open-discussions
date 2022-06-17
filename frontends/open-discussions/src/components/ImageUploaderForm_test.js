import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import ImageUploaderForm from "./ImageUploaderForm"

describe("ImageUploaderForm", () => {
  const render = (props = {}) =>
    shallow(
      <ImageUploaderForm
        form={{ image: null }}
        validation={{ image: null }}
        {...props}
      />
    )

  it("shows a spinner when processing is true", () => {
    const wrapper = render({ processing: true })
    assert.equal(wrapper.find(".sk-fading-circle").length, 1)
  })
})
