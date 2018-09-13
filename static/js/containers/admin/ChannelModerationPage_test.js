// @flow
import { assert } from "chai"
import sinon from "sinon"

import ChannelModerationPage, {
  ChannelModerationPage as InnerChannelModerationPage
} from "./ChannelModerationPage"

import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import {
  CLEAR_FOCUSED_COMMENT,
  CLEAR_FOCUSED_POST,
  SET_FOCUSED_COMMENT,
  SET_FOCUSED_POST
} from "../../actions/focus"
import {
  DIALOG_REMOVE_COMMENT,
  DIALOG_REMOVE_POST,
  HIDE_DIALOG,
  SET_SNACKBAR_MESSAGE
} from "../../actions/ui"
import { makeChannelList } from "../../factories/channels"
import { makeChannelPostList } from "../../factories/posts"
import {
  makeCommentReport,
  makePostReport,
  makeReportRecord
} from "../../factories/reports"
import {
  channelModerationURL,
  channelURL,
  commentPermalink
} from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("ChannelModerationPage", () => {
  let render, channels, channel, postList, postIds, reports, helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    channels = makeChannelList()
    channel = channels[0]
    channel.user_is_moderator = true
    postList = makeChannelPostList()
    postIds = postList.map(post => post.id)
    reports = postList.map(makeReportRecord)

    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getReportsStub.returns(Promise.resolve(reports))
    helper.getProfileStub.returns(Promise.resolve(""))

    render = helper.configureHOCRenderer(
      ChannelModerationPage,
      InnerChannelModerationPage,
      {
        posts: {
          data:       new Map(postList.map(post => [post.id, post])),
          processing: false,
          loaded:     true
        },
        postsForChannel: {
          data:       new Map([[channel.name, { postIds: postIds }]]),
          processing: false,
          loaded:     true
        },
        channels: {
          data:       new Map([[channel.name, channel]]),
          processing: false,
          loaded:     true
        },
        subscribedChannels: {
          data:       channels.map(channel => channel.name),
          processing: false,
          loaded:     true
        },
        reports: {
          data:       { reports: [] },
          processing: false,
          loaded:     true
        },
        ui: {
          dialogs: new Map()
        },
        focus: {},
        forms: {}
      },
      {
        match: {
          params: {
            channelName: channel.name
          }
        },
        history:  helper.browserHistory,
        location: {
          search: {}
        }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("integration", () => {
    let renderComponent

    beforeEach(() => {
      renderComponent = helper.renderComponent.bind(helper)
    })

    const renderPage = async () => {
      const [wrapper] = await renderComponent(
        channelModerationURL(channel.name),
        [
          actions.reports.get.requestType,
          actions.reports.get.successType,
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions.subscribedChannels.get.requestType,
          actions.subscribedChannels.get.successType,
          actions.profiles.get.requestType,
          actions.profiles.get.successType,
          SET_CHANNEL_DATA
        ]
      )
      return wrapper.update()
    }

    it("should fetch reports", async () => {
      const wrapper = await renderPage()
      assert.deepEqual(wrapper.find("WithLoading").props().reports, reports)
    })
  })

  it("redirects if the user isn't a moderator", async () => {
    channel.user_is_moderator = false
    const { inner } = await render()

    assert.equal(inner.find("Redirect").prop("to"), channelURL(channel.name))
  })

  describe("post reports", () => {
    let reports

    beforeEach(() => {
      reports = postList.map(makePostReport)
    })

    it(`renders a report for a post`, async () => {
      const { inner } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        }
      })

      const postDisplays = inner.find("Connect(CompactPostDisplay)")
      assert.equal(postDisplays.length, postList.length)

      reports.forEach((report, index) => {
        const props = postDisplays.at(index).props()
        assert.deepEqual(props.post, postList[index])
        assert.deepEqual(props.report, report)
        assert.equal(props.isModerator, channel.user_is_moderator)
      })
    })

    it("opens a dialog for removing a post", async () => {
      const { inner, store } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        }
      })

      const props = inner
        .find("Connect(CompactPostDisplay)")
        .first()
        .props()
      const post = postList[0]
      props.removePost(post)
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SET_FOCUSED_POST,
        payload: post
      })
    })
    ;[[true, "MDCDialog:accept"], [false, "submit"]].forEach(
      ([canRemove, eventType]) => {
        it(`${
          canRemove ? "removes" : "doesn't remove"
        } a report for a post for event type ${eventType}`, async () => {
          const post = postList[0]
          const event = { type: eventType }
          helper.updateRemovedStub.returns(Promise.resolve(post))
          const { wrapper, store } = await render({
            reports: {
              data: {
                reports: reports
              },
              processing: false,
              loaded:     true
            },
            focus: {
              post
            }
          })

          const props = wrapper
            .dive()
            .find("Dialog[id='remove-post-dialog']")
            .first()
            .props()

          await props.onAccept(event)
          const actions = store.getActions()
          if (!canRemove) {
            assert.equal(helper.updateRemovedStub.callCount, 0)
            sinon.assert.calledWith(helper.getReportsStub, channel.name)
          } else {
            sinon.assert.calledWith(helper.updateRemovedStub, post.id, true)
            sinon.assert.calledWith(helper.getReportsStub, channel.name)
            assert.deepEqual(actions[actions.length - 1], {
              type:    SET_SNACKBAR_MESSAGE,
              payload: {
                message: "Post has been removed"
              }
            })
          }
        })
      }
    )

    it("ignores a report for a post", async () => {
      const post = postList[0]
      helper.editPostStub.returns(Promise.resolve(post))
      const { inner } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        },
        focus: {
          post
        }
      })

      const props = inner
        .find("Connect(CompactPostDisplay)")
        .first()
        .props()

      await props.ignorePostReports(post)
      sinon.assert.calledWith(helper.editPostStub, post.id, {
        ignore_reports: true
      })
      sinon.assert.calledWith(helper.getReportsStub, channel.name)
    })

    it("dismisses the dialog for removing a post", async () => {
      const post = postList[0]
      const { store, wrapper } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        },
        focus: {
          post
        }
      })

      const props = wrapper
        .dive()
        .find("Dialog[id='remove-post-dialog']")
        .first()
        .props()

      props.hideDialog()
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type: CLEAR_FOCUSED_POST
      })
      assert.deepEqual(actions[actions.length - 1], {
        type:    HIDE_DIALOG,
        payload: DIALOG_REMOVE_POST
      })
    })
  })

  describe("comment report", () => {
    let reports
    beforeEach(() => {
      reports = postList.map(makeCommentReport)
    })

    it("renders comment reports", async () => {
      const dropdownMenus = "dropdownMenuState"
      const { inner } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        },
        ui: {
          dropdownMenus
        }
      })

      const commentTrees = inner.find("CommentTree")
      assert.equal(commentTrees.length, postList.length)

      reports.forEach((report, index) => {
        const props = commentTrees.at(index).props()
        assert.deepEqual(props.comments, [report.comment])
        assert.equal(
          props.commentPermalink("commentId"),
          commentPermalink(
            channel.name,
            report.comment.post_id,
            null,
            "commentId"
          )
        )
        assert.equal(props.moderationUI, true)
        assert.equal(props.isModerator, channel.user_is_moderator)
        assert.equal(props.dropdownMenus, dropdownMenus)
      })
    })

    it("opens a dialog for removing a comment", async () => {
      const { inner, store } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        }
      })

      const props = inner
        .find("CommentTree")
        .first()
        .props()
      const comment = reports[0].comment
      props.remove(comment)
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SET_FOCUSED_COMMENT,
        payload: comment
      })
    })
    ;[[true, "MDCDialog:accept"], [false, "submit"]].forEach(
      ([canRemove, eventType]) => {
        it(`${
          canRemove ? "removes" : "doesn't remove"
        } a report for a comment for event type ${eventType}`, async () => {
          const comment = reports[0].comment
          const event = { type: eventType }
          helper.updateCommentStub.returns(Promise.resolve(comment))
          const { wrapper, store } = await render({
            reports: {
              data: {
                reports: reports
              },
              processing: false,
              loaded:     true
            },
            focus: {
              comment
            }
          })

          const props = wrapper
            .dive()
            .find("WithCommentModeration")
            .dive()
            .find("Dialog[id='remove-comment-dialog']")
            .first()
            .props()

          await props.onAccept(event)
          const actions = store.getActions()
          if (!canRemove) {
            assert.equal(helper.updateRemovedStub.callCount, 0)
            sinon.assert.calledWith(helper.getReportsStub, channel.name)
          } else {
            sinon.assert.calledWith(helper.updateCommentStub, comment.id, {
              removed: true
            })
            sinon.assert.calledWith(helper.getReportsStub, channel.name)
            assert.deepEqual(actions[actions.length - 1], {
              type:    SET_SNACKBAR_MESSAGE,
              payload: {
                message: "Comment has been removed"
              }
            })
          }
        })
      }
    )

    it("ignores a report for a comment", async () => {
      const comment = reports[0].comment
      helper.updateCommentStub.returns(Promise.resolve(comment))
      const { inner } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        },
        focus: {
          comment
        }
      })

      const props = inner
        .find("CommentTree")
        .first()
        .props()

      await props.ignoreCommentReports(comment)
      sinon.assert.calledWith(helper.updateCommentStub, comment.id, {
        ignore_reports: true
      })
      sinon.assert.calledWith(helper.getReportsStub, channel.name)
    })

    it("dismisses the dialog for removing a comment", async () => {
      const comment = reports[0].comment
      const { store, wrapper } = await render({
        reports: {
          data: {
            reports: reports
          },
          processing: false,
          loaded:     true
        },
        focus: {
          comment
        }
      })

      const props = wrapper
        .dive()
        .find("WithCommentModeration")
        .dive()
        .find("Dialog[id='remove-comment-dialog']")
        .first()
        .props()

      props.hideDialog()
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type: CLEAR_FOCUSED_COMMENT
      })
      assert.deepEqual(actions[actions.length - 1], {
        type:    HIDE_DIALOG,
        payload: DIALOG_REMOVE_COMMENT
      })
    })
  })
})
