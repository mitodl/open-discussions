// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import { editProfileURL } from "../lib/url"
import { makeProfile } from "../factories/profiles"
import { actions } from "../actions"
import { makeChannelPostList } from "../factories/posts"
import { makeEvent, mockCourseAPIMethods } from "../lib/test_utils"

import type { ProfilePayload } from "../flow/discussionTypes"

describe("ProfileEditPage", function() {
  let helper, listenForActions, renderComponent, profile

  const setName = (wrapper, name) =>
    wrapper
      .find(".profile-name input")
      .simulate("change", makeEvent("name", name))

  const setBio = (wrapper, text) =>
    wrapper.find(".bio textarea").simulate("change", makeEvent("bio", text))

  const setHeadline = (wrapper, text) =>
    wrapper
      .find(".headline input")
      .simulate("change", makeEvent("headline", text))

  const submitProfile = wrapper =>
    wrapper.find(".save-profile").simulate("click")

  beforeEach(() => {
    profile = makeProfile()
    SETTINGS.username = profile.username
    helper = new IntegrationTestHelper()
    helper.getProfileStub.returns(Promise.resolve(profile))
    helper.getChannelsStub.returns(Promise.resolve([]))
    helper.getChannelStub.returns(Promise.resolve([]))
    helper.getUserPostsStub.returns(Promise.resolve([]))
    helper.getUserCommentsStub.returns(Promise.resolve([]))
    helper.getLivestreamEventsStub.returns(Promise.resolve({ data: [] }))
    helper.getFrontpageStub.returns(
      Promise.resolve({ posts: makeChannelPostList() })
    )
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    mockCourseAPIMethods(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const basicProfileEditPageActions = [
    actions.forms.FORM_BEGIN_EDIT,
    actions.profiles.get.requestType,
    actions.profiles.get.successType,
    actions.subscribedChannels.get.requestType,
    actions.subscribedChannels.get.successType
  ]

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      editProfileURL(profile.username),
      basicProfileEditPageActions
    )
    return wrapper.update()
  }

  it("should render a ProfileForm", async () => {
    SETTINGS.username = profile.username
    const wrapper = await renderPage()
    assert.equal(
      wrapper
        .find(".profile-name")
        .find(".name")
        .props().value,
      profile.name
    )
  })

  it("should update values and successfully pass them to api on submit", async () => {
    const name = "Test User"
    const bio = "Test bio"
    const headline = "Test headline"
    const wrapper = await renderPage()

    await listenForActions(
      [
        actions.forms.FORM_UPDATE,
        actions.forms.FORM_UPDATE,
        actions.forms.FORM_UPDATE
      ],
      () => {
        setName(wrapper, name)
        setBio(wrapper, bio)
        setHeadline(wrapper, headline)
      }
    )

    helper.updateProfileStub.returns(
      Promise.resolve({ ...profile, name, bio, headline })
    )

    await listenForActions(
      [actions.profiles.patch.requestType, actions.profiles.patch.successType],
      () => {
        submitProfile(wrapper)
      }
    )
    const payload: ProfilePayload = { name, bio, headline }
    sinon.assert.calledWith(helper.updateProfileStub, profile.username, payload)
  })

  it("should show validation errors when the name is empty", async () => {
    helper.updateProfileStub.returns(Promise.resolve(profile))
    const wrapper = await renderPage()
    setName(wrapper, "")
    submitProfile(wrapper)
    assert.equal(
      wrapper.find('.profile-name div[role="alert"]').text(),
      "Name is required"
    )
    sinon.assert.notCalled(helper.updateProfileStub)
  })

  it("goes back when cancel is clicked", async () => {
    const wrapper = await renderPage()
    assert.equal(
      helper.currentLocation.pathname,
      editProfileURL(profile.username)
    )
    wrapper.find(".row.actions .cancel").simulate("click")
    assert.equal(helper.currentLocation.pathname, "/")
  })
})
