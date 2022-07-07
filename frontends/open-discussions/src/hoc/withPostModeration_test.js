// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import {
  withPostModeration,
  postModerationSelector,
  REPORT_POST_DIALOG
} from "./withPostModeration"

import {
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_POST,
  DIALOG_DELETE_POST
} from "../actions/ui"
import { setFocusedPost, clearFocusedPost } from "../actions/focus"
import * as utils from "../lib/util"
import * as selectors from "../lib/redux_selectors"
import * as restUtils from "../util/rest"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"
import { makePostReport } from "../factories/reports"
import { makePost } from "../factories/posts"
import { shouldIf } from "../lib/test_utils"

class Page extends React.Component<*> {
  render() {
    return <div className="hey-im-a-div" />
  }
}

const WrappedComponent = withPostModeration(Page)

describe("withPostModeration", () => {
  let helper,
    render,
    post,
    getChannelNameStub,
    mockStoreState,
    channel,
    channelName,
    mockStore,
    subscribedChannelsStub,
    anyErrorExcept404Stub

  const getPostModerationSelector = (ownProps = {}) => {
    const mockStore = helper.createMockStore(mockStoreState)
    return postModerationSelector(mockStore.getState(), ownProps)
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()

    channelName = "justachannel"
    channel = makeChannel()
    post = makePost()

    getChannelNameStub = helper.sandbox
      .stub(utils, "getChannelName")
      .returns(channelName)
    subscribedChannelsStub = helper.sandbox
      .stub(selectors, "getSubscribedChannels")
      .returns([])
    anyErrorExcept404Stub = helper.sandbox
      .stub(restUtils, "anyErrorExcept404")
      .returns(false)
    helper.deletePostStub.returns(Promise.resolve())

    mockStoreState = {
      channels: {
        data:   new Map([[channelName, channel]]),
        loaded: true,
        error:  undefined
      },
      reports: {
        data: {
          reports: [makePostReport()]
        },
        loaded: true,
        error:  undefined
      },
      forms: {},
      ui:    { dialogs: new Set() },
      focus: {}
    }
    mockStore = helper.createMockStore(mockStoreState)

    render = () =>
      shallow(
        <WrappedComponent
          dispatch={mockStore.dispatch}
          {...getPostModerationSelector()}
        />
      )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should include a post deletion dialog", async () => {
    const wrapper = await render()
    const dialog = wrapper.find("#delete-post-dialog")
    assert.ok(dialog.exists())
    const { open, onAccept, hideDialog, submitText, title } = dialog.props()
    assert.equal(open, false)
    assert.equal(onAccept, wrapper.instance().deletePost)
    assert.equal(hideDialog, wrapper.instance().hideDeleteDialog)
    assert.equal(submitText, "Yes, delete")
    assert.equal(title, "Delete Post")
  })

  it("should have a function for opening the delete dialog", async () => {
    const wrapper = await render()
    wrapper.instance().openDeletePostDialog(post)
    const [focusPostAction, showDialogAction] = mockStore.getActions()
    assert.deepEqual(focusPostAction, setFocusedPost(post))
    assert.deepEqual(showDialogAction, showDialog(DIALOG_DELETE_POST))
  })

  it("should have a function for hiding delete dialog", async () => {
    const wrapper = await render()
    wrapper.instance().hideDeleteDialog()
    const [clearFocusAction, hideDialogAction] = mockStore.getActions()
    assert.deepEqual(clearFocusAction, clearFocusedPost())
    assert.deepEqual(hideDialogAction, hideDialog(DIALOG_DELETE_POST))
  })

  it("should delete a post and refresh the post list", async () => {
    mockStoreState.focus.post = post
    const wrapper = await render()
    const refreshStub = helper.sandbox.stub(
      wrapper.instance(),
      "refreshPostList"
    )
    const hideDeleteStub = helper.sandbox.stub(
      wrapper.instance(),
      "hideDeleteDialog"
    )
    const preventDefaultStub = helper.sandbox.stub()
    await wrapper.instance().deletePost({ preventDefault: preventDefaultStub })
    sinon.assert.calledWith(helper.deletePostStub, post.id)
    sinon.assert.called(refreshStub)
    sinon.assert.called(hideDeleteStub)
    sinon.assert.called(preventDefaultStub)
    assert.deepEqual(
      mockStore.getLastAction(),
      setSnackbarMessage({
        message: "Post has been deleted"
      })
    )
  })

  describe("postModerationSelector", () => {
    it("should get channel name from ownProps", () => {
      const { channelName } = getPostModerationSelector({
        channelName: "foobarbaz"
      })
      assert.equal(channelName, "foobarbaz")
    })

    it("should get channel name from location if not in props", () => {
      assert.equal(channelName, getPostModerationSelector().channelName)
      sinon.assert.called(getChannelNameStub)
    })

    it("should include forms", () => {
      const { forms } = getPostModerationSelector()
      assert.deepEqual(forms, mockStoreState.forms)
    })

    it("should include the channel", () => {
      assert.deepEqual(channel, getPostModerationSelector().channel)
    })

    it("should include shouldGetReports", () => {
      assert.isFalse(getPostModerationSelector().shouldGetReports)
    })

    it("should include the reports", () => {
      assert.deepEqual(
        mockStoreState.reports.data.reports,
        getPostModerationSelector().reports
      )
    })

    //
    ;[
      [404, undefined, true, true, true, true, false],
      [403, undefined, true, true, true, false, true],
      [undefined, 500, false, false, true, false, false],
      [404, 500, true, false, true, true, false],
      [403, 500, false, true, true, false, true],
      [undefined, undefined, true, true, true, false, false],
      [undefined, undefined, false, true, false, false, false],
      [undefined, undefined, true, false, false, false, false]
    ].forEach(
      ([
        channelError,
        reportsError,
        channelsLoaded,
        reportsLoaded,
        shouldBeLoaded,
        shouldBeNotFound,
        shouldBeNotAuthorized
      ]) => {
        it(`${shouldIf(
          shouldBeLoaded
        )} be loaded when we want it that way :)`, () => {
          if (channelError) {
            mockStoreState.channels.error = {
              error:           "ERROR!",
              errorStatusCode: channelError
            }
          }
          if (reportsError) {
            mockStoreState.reports.error = {
              error:           "ERROR!",
              errorStatusCode: reportsError
            }
          }
          mockStoreState.channels.loaded = channelsLoaded
          mockStoreState.reports.loaded = reportsLoaded

          const { loaded, notAuthorized, notFound } =
            getPostModerationSelector()
          assert.equal(shouldBeLoaded, loaded)
          assert.equal(shouldBeNotFound, !!notFound)
          assert.equal(shouldBeNotAuthorized, !!notAuthorized)
        })
      }
    )

    //
    ;[true, false].forEach(userIsModerator => {
      it(`${shouldIf(userIsModerator)} indicate user is moderator if ${
        userIsModerator ? "is" : "is not"
      } moderator`, () => {
        channel.user_is_moderator = userIsModerator
        const { isModerator } = getPostModerationSelector()
        assert.equal(isModerator, userIsModerator)
      })
    })

    it("should include subscribed channels", () => {
      const fakeSubscriptions = [{ channel: "wow!" }]
      subscribedChannelsStub.returns(fakeSubscriptions)
      const { subscribedChannels } = getPostModerationSelector()
      assert.deepEqual(subscribedChannels, fakeSubscriptions)
    })

    //
    ;[
      ["showRemovePostDialog", DIALOG_REMOVE_POST],
      ["showDeletePostDialog", DIALOG_DELETE_POST],
      ["reportPostDialogVisible", REPORT_POST_DIALOG]
    ].forEach(([propName, dialogConstant]) => {
      [true, false].forEach(dialogOpen => {
        it(`should include ${propName}=${String(
          dialogOpen
        )} if ${dialogConstant} is ${dialogOpen ? "open" : "closed"}`, () => {
          if (dialogOpen) {
            mockStoreState.ui.dialogs.add(dialogConstant)
          }
          assert.equal(dialogOpen, getPostModerationSelector()[propName])
        })
      })
    })

    it("should include a focused post, if present", () => {
      assert.isUndefined(getPostModerationSelector().focusedPost)
      const post = makePost()
      mockStoreState.focus.post = post
      assert.deepEqual(post, getPostModerationSelector().focusedPost)
    })

    //
    ;[true, false].forEach(hasError => {
      it(`should have errored=${String(hasError)} when there ${
        hasError ? "is" : "is not"
      } an error`, () => {
        anyErrorExcept404Stub.returns(hasError)
        assert.equal(hasError, getPostModerationSelector().errored)
      })
    })
  })
})
