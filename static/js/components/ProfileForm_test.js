// @flow
/* global SETTINGS: false */
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
    validation = { reason: "", name: "" }
  ) =>
    mount(
      <Provider store={helper.store}>
        <ProfileForm
          profile={profile}
          form={form}
          validation={validation}
          onUpdate={onUpdateStub}
          onSubmit={onSubmitStub}
          history={{}}
          processing={false}
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
        .find(".name")
        .props().placeholder,
      "Full name"
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
        .find("textarea")
        .props().placeholder,
      "Description"
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("label")
        .text(),
      "Add a short description about yourself, max 1000 characters"
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
        .find("input")
        .props().placeholder,
      "Headline"
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("label")
        .text(),
      "For example: 'Post Doc, Photonics MIT', max 60 characters"
    )
  })

  //
  ;[true, false].forEach(sameUser => {
    it(`ProfileImage should ${
      sameUser ? "" : "not"
    } include an edit profile button`, async () => {
      SETTINGS.username = sameUser ? profile.username : "other_user"
      const wrapper = renderForm()
      const profileImage = wrapper.find(ProfileImage)
      assert.isTrue(profileImage.exists())
      assert.equal(profileImage.props().editable, sameUser)
    })
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
      .simulate("click")
    assert.ok(onSubmitStub.called)
  })

  it("submit Button disabled when processing", () => {
    const wrapper = renderForm({ processing: true })
    const submitBtn = wrapper.find(".save-profile").at(0)
    assert.isTrue(submitBtn.props().disabled)
    submitBtn.simulate("click")
    assert.isNotOk(onSubmitStub.called)
  })

  it("renders an empty form", () => {
    ["name", "bio", "headline"].forEach(field => {
      // $FlowFixMe
      profile[field] = null
      const wrapper = renderForm()
      assert.equal(wrapper.find(`[name="${field}"]`).props().value, "")
    })
  })
})
