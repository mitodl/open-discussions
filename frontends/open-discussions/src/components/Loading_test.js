// @flow
import React from "react"
import { HelmetProvider } from "react-helmet-async"
import { assert } from "chai"
import { shallow, mount } from "enzyme"
import { waitFor } from "@testing-library/react"

import {
  withLoading,
  withSpinnerLoading,
  withPostLoading,
  PodcastLoading,
  PodcastEpisodeLoading
} from "./Loading"
import { NotFound, NotAuthorized } from "./ErrorPages"

const GenericLoader = () => <div className="loading">loading...</div>

class Content extends React.Component<*> {
  render() {
    return <div>CONTENT</div>
  }
}

const GenericLoadingContent = withLoading(GenericLoader, Content)
const SpinnerLoadingContent = withSpinnerLoading(Content)
const PostLoadingContent = withPostLoading(Content)

describe("Loading component", () => {
  let props

  beforeEach(() => {
    props = {
      loaded:        true,
      errored:       false,
      notFound:      false,
      notAuthorized: false
    }
  })

  const renderLoading = () => {
    return mount(
      <HelmetProvider>
        <GenericLoadingContent {...props} />
      </HelmetProvider>
    )
  }

  it("should render a loading indicator if not loaded and not errored", () => {
    props.loaded = false
    const wrapper = renderLoading()
    assert.isTrue(wrapper.find(".loading").exists())
  })

  //
  ;[true, false].forEach(loaded => {
    it(`should render errors correctly if loaded=${String(
      loaded
    )}`, async () => {
      props.loaded = loaded
      props.errored = true
      const wrapper = renderLoading()
      await waitFor(() => assert.equal(wrapper.text(), "Error loading page"))
    })
  })

  //
  ;[
    ["notFound", NotFound],
    ["notAuthorized", NotAuthorized]
  ].forEach(([errorPropName, expectedComponent]) => {
    it(`should render correct error if '${errorPropName}'=true`, () => {
      props[errorPropName] = true
      const wrapper = renderLoading()
      assert.ok(wrapper.find(expectedComponent).exists())
    })
  })

  it("should render the contents if loaded=true and there are no errors", () => {
    const wrapper = renderLoading()
    assert.equal(wrapper.text(), "CONTENT")
  })

  describe("(spinner-style)", () => {
    it("should show a spinner if not loaded and not errored", () => {
      props.loaded = false
      const wrapper = mount(<SpinnerLoadingContent {...props} />)
      assert.lengthOf(wrapper.find(".loading").find(".sk-three-bounce"), 1)
    })
  })

  describe("(empty post-style)", () => {
    it("should show an empty post loading animation if not loaded and not errored", () => {
      props.loaded = false
      const wrapper = mount(<PostLoadingContent {...props} />)
      assert.lengthOf(wrapper.find(".post-content-loader"), 5)
    })
  })

  describe("podcasts", () => {
    it("should show nine empty items for podcasts", () => {
      const wrapper = shallow(<PodcastLoading />)
      assert.equal(wrapper.find("Card.borderless").length, 9)
    })

    it("should show six empty items for podcast episodes", () => {
      const wrapper = shallow(<PodcastEpisodeLoading />)
      assert.equal(wrapper.find("Card").length, 6)
    })
  })
})
