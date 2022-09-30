// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import ProfileImage from "../components/ProfileImage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { profileURL } from "../lib/url"
import { makeProfile } from "../factories/profiles"
import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE } from "../lib/constants"
import { waitFor } from "@testing-library/react"

describe("ProfilePage", function() {
  let helper, renderComponent, profile

  beforeEach(() => {
    profile = makeProfile()
    helper = new IntegrationTestHelper()
    helper.getProfileStub.returns(Promise.resolve(profile))
    helper.getChannelsStub.returns(Promise.resolve([]))
    helper.getUserPostsStub.returns(Promise.resolve([]))
    helper.getUserCommentsStub.returns(Promise.resolve([]))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const basicProfilePageActions = [
    actions.profiles.get.requestType,
    actions.profiles.get.successType,
    actions.subscribedChannels.get.requestType,
    actions.subscribedChannels.get.successType,
    actions.userContributions.get.requestType
  ]

  const renderPage = async (url: ?string) => {
    url = url || profileURL(profile.username)
    const [wrapper] = await renderComponent(url, basicProfilePageActions)
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    // const helmet = Helmet.peek()
    // assert.equal(helmet.title, formatTitle(`Profile for ${profile.name}`))
    await waitFor(() =>
      assert.equal(document.title, formatTitle(`Profile for ${profile.name}`))
    )
  })

  it("should display profile name, bio, and headline", async () => {
    const wrapper = await renderPage()
    assert.deepEqual(
      wrapper.find(".name-headline-location .name").at(0).text(),
      profile.name
    )
    assert.deepEqual(
      wrapper.find(".name-headline-location .headline").at(0).text(),
      profile.headline
    )
    assert.deepEqual(wrapper.find(".row.bio").at(0).text(), profile.bio)
  })

  it("should include a ProfileImage equal to profile.profile_image_medium", async () => {
    const wrapper = await renderPage()
    assert.equal(
      wrapper.find(ProfileImage).find("img").at(1).props().src,
      profile.profile_image_medium
    )
  })

  it("should include the user's post/comment feeds", async () => {
    const wrapper = await renderPage()
    const feedComponent = wrapper.find("ProfileContributionFeed")
    assert.isTrue(feedComponent.exists())
    const { userName, selectedTab } = feedComponent.props()
    assert.equal(userName, profile.username)
    assert.equal(selectedTab, POSTS_OBJECT_TYPE)
  })

  it("should pass the right selected tab value to the post/comment feed component", async () => {
    const wrapper = await renderPage(
      profileURL(profile.username, COMMENTS_OBJECT_TYPE)
    )
    const feedComponent = wrapper.find("ProfileContributionFeed")
    assert.equal(feedComponent.prop("selectedTab"), COMMENTS_OBJECT_TYPE)
  })
  ;[true, false].forEach(sameUser => {
    it(`should not include an edit profile button on this page when profile is ${
      sameUser ? "" : "not"
    } for the logged in user`, async () => {
      SETTINGS.username = sameUser ? profile.username : "other_user"
      const wrapper = await renderPage()
      assert.isNotOk(wrapper.find("ProfileImage").at(1).props().editable)
    })
  })
})
