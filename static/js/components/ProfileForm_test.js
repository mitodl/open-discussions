// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import ProfileForm from "./ProfileForm"
import { makeProfile } from "../factories/profiles"
import ProfileImage from "../containers/ProfileImage"
import { Provider } from "react-redux"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("ProfileForm", () => {
  let helper, onUpdateStub, onSubmitStub, profile

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    profile = makeProfile()
    onUpdateStub = helper.sandbox.stub()
    onSubmitStub = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderForm = (
    props = {},
    form = {
      name:     profile.name,
      bio:      profile.bio,
      headline: profile.headline
    },
    validation = { reason: "" }
  ) =>
    mount(
      <Provider store={helper.store}>
        <ProfileForm
          profile={profile}
          form={form}
          validation={validation}
          onUpdate={onUpdateStub}
          onSubmit={onSubmitStub}
          {...props}
        />
      </Provider>
    )

  it("displays the name, headline and bio", () => {
    const wrapper = renderForm()
    assert.equal(
      wrapper
        .find(".profile-name")
        .find(".name")
        .props().value,
      profile.name
    )
    assert.equal(
      wrapper
        .find(".profile-name")
        .find("label")
        .text(),
      "Full Name"
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("textarea")
        .props().value,
      profile.bio
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("label")
        .text(),
      "Biography"
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("input")
        .props().value,
      profile.headline
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("label")
        .text(),
      "Headline"
    )
  })

  it("includes a ProfileImage container", () => {
    const wrapper = renderForm()
    assert.isTrue(wrapper.find(ProfileImage).exists())
  })

  it("calls onUpdate", () => {
    const wrapper = renderForm()
    const event = {
      target: {
        name:  "name",
        value: "Test User"
      }
    }
    wrapper
      .find("input")
      .at(0)
      .simulate("change", event)
    assert.ok(onUpdateStub.called)
  })

  it("calls onSubmit", () => {
    const wrapper = renderForm({ processing: false })
    wrapper
      .find(".save-profile")
      .at(0)
      .simulate("submit")
    assert.ok(onSubmitStub.called)
  })

  it("submit Button disabled when processing", () => {
    const wrapper = renderForm({ processing: true })
    const submitBtn = wrapper.find(".save-profile").at(0)
    assert.isTrue(submitBtn.props().disabled)
    submitBtn.simulate("click")
    assert.isNotOk(onSubmitStub.called)
  })
})
