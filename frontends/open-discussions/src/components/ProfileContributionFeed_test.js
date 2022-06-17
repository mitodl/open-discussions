// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import Router from "../Router"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeProfile } from "../factories/profiles"
import { makeChannelPostList } from "../factories/posts"
import { makeCommentsList } from "../factories/comments"
import { actions } from "../actions"
import { POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE } from "../lib/constants"

import ProfileContributionFeed from "./ProfileContributionFeed"

describe("ProfileContributionFeed", function() {
  const contributionFetchActions = [
    actions.userContributions.get.requestType,
    actions.userContributions.get.successType
  ]

  let helper, listenForActions, profile, postsResult, commentsResult

  beforeEach(() => {
    profile = makeProfile()
    postsResult = makeChannelPostList()
    commentsResult = makeCommentsList()
    helper = new IntegrationTestHelper()
    helper.getUserPostsStub.returns(
      Promise.resolve({ [POSTS_OBJECT_TYPE]: postsResult, pagination: {} })
    )
    helper.getUserCommentsStub.returns(
      Promise.resolve({
        [COMMENTS_OBJECT_TYPE]: commentsResult,
        pagination:             {}
      })
    )

    listenForActions = helper.listenForActions.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderFeed = async (props = {}) => {
    let wrapper

    const renderedWrapper = await listenForActions(
      contributionFetchActions,
      () => {
        wrapper = mount(
          <Router history={helper.browserHistory} store={helper.store}>
            <ProfileContributionFeed
              userName={profile.username}
              selectedTab={POSTS_OBJECT_TYPE}
              {...props}
            />
          </Router>
        )
      }
    ).then(() => {
      return Promise.resolve(wrapper)
    })

    return renderedWrapper.update()
  }

  it("should render user post feed by default", async () => {
    const wrapper = await renderFeed()
    sinon.assert.calledOnce(helper.getUserPostsStub)
    assert.equal(wrapper.find("CompactPostDisplay").length, postsResult.length)
  })

  it("has correct tab links", async () => {
    const wrapper = await renderFeed()
    const tabLinks = wrapper.find("NavLink")
    const postsTabProps = tabLinks.at(0).props()
    assert.equal(postsTabProps.to, `/profile/${profile.username}/posts`)
    assert.isTrue(postsTabProps.isActive())
    const commentsTabProps = tabLinks.at(1).props()
    assert.equal(commentsTabProps.to, `/profile/${profile.username}/comments`)
    assert.isFalse(commentsTabProps.isActive())
  })

  //
  ;[
    [POSTS_OBJECT_TYPE, "getUserPostsStub", "CompactPostDisplay"],
    [COMMENTS_OBJECT_TYPE, "getUserCommentsStub", "Comment"]
  ].forEach(([tabName, expStubCalled, expFeedComponent]) => {
    it(`should render proper object feed depending on the selected tab`, async () => {
      const wrapper = await renderFeed({ selectedTab: tabName })
      sinon.assert.calledOnce(helper[expStubCalled])
      assert.isTrue(wrapper.find(expFeedComponent).exists())
    })
  })

  //
  ;[
    [POSTS_OBJECT_TYPE, "no posts to display"],
    [COMMENTS_OBJECT_TYPE, "no comments to display"]
  ].forEach(([tabName, expMessageFragment]) => {
    it(`should show a message when feed is empty in the ${tabName} tab`, async () => {
      helper.getUserPostsStub.returns(
        Promise.resolve({ [POSTS_OBJECT_TYPE]: [], pagination: {} })
      )
      helper.getUserCommentsStub.returns(
        Promise.resolve({
          [COMMENTS_OBJECT_TYPE]: [],
          pagination:             {}
        })
      )

      const wrapper = await renderFeed({ selectedTab: tabName })

      assert.include(wrapper.find(".empty-list-msg").html(), expMessageFragment)
    })
  })
})
