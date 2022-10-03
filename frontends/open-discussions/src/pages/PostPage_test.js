/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import { Link } from "react-router-dom"

import CommentTree from "../components/CommentTree"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import PostPage, { PostPage as InnerPostPage } from "./PostPage"
import CommentForm from "../components/CommentForm"
import { NotFound, NotAuthorized } from "ol-util"

import { wait } from "../lib/util"
import { makePost } from "../factories/posts"
import {
  makeComment,
  makeCommentsResponse,
  makeMoreComments
} from "../factories/comments"
import { makeChannel } from "../factories/channels"
import { makeWidgetListResponse } from "../factories/widgets"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { REPLACE_MORE_COMMENTS } from "../actions/comment"
import { FORM_BEGIN_EDIT, FORM_END_EDIT, FORM_UPDATE } from "../actions/forms"
import { SET_SNACKBAR_MESSAGE, SHOW_DIALOG, HIDE_DIALOG } from "../actions/ui"
import { SET_FOCUSED_POST, CLEAR_FOCUSED_POST } from "../actions/focus"
import IntegrationTestHelper from "../util/integration_test_helper"
import { postDetailURL, channelURL, commentPermalink } from "../lib/url"
import { formatTitle } from "../lib/title"
import { createCommentTree } from "../reducers/comments"
import { makeReportRecord } from "../factories/reports"
import { VALID_COMMENT_SORT_TYPES } from "../lib/picker"
import { makeArticle, makeTweet } from "../factories/embedly"
import * as utilFuncs from "../lib/util"
import * as embedUtil from "../lib/embed"
import * as validationFuncs from "../lib/validation"
import { truncate } from "../lib/util"
import { NOT_AUTHORIZED_ERROR_TYPE } from "../util/rest"
import { LINK_TYPE_LINK } from "../lib/channels"
import { REPORT_FORM_KEY } from "../lib/reports"

describe("PostPage", function() {
  this.timeout(10000)

  let helper,
    render,
    post,
    comments,
    commentsResponse,
    channel,
    twitterEmbedStub

  beforeEach(() => {
    post = makePost()
    commentsResponse = makeCommentsResponse(post, 3)
    comments = createCommentTree(commentsResponse)
    channel = makeChannel()

    helper = new IntegrationTestHelper()
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getEmbedlyStub.returns(Promise.resolve(makeArticle()))
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getCommentsStub.returns(Promise.resolve(commentsResponse))
    helper.getCommentStub.returns(
      Promise.resolve(R.slice(0, 1, commentsResponse))
    )
    helper.updateCommentStub.returns(Promise.resolve())
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        posts: [post]
      })
    )
    helper.deletePostStub.returns(Promise.resolve())
    helper.deleteCommentStub.returns(Promise.resolve())
    helper.getReportsStub.returns(Promise.resolve(R.times(makeReportRecord, 4)))
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getWidgetListStub.returns(Promise.resolve(makeWidgetListResponse(0)))
    render = helper.configureHOCRenderer(
      PostPage,
      InnerPostPage,
      {
        posts: {
          data:       new Map([[post.id, post]]),
          processing: false,
          loaded:     true
        },
        postsForChannel: {
          data:       new Map([[channel.name, { postIds: [post.id] }]]),
          processing: false,
          loaded:     true
        },
        channels: {
          data:       new Map([[channel.name, channel]]),
          processing: false,
          loaded:     true
        },
        comments: {
          data:       new Map([[post.id, comments]]),
          processing: false,
          loaded:     true
        },
        reports: {
          data:       {},
          processing: false,
          loaded:     true
        },
        subscribedChannels: {
          data:       [channel.name],
          processing: false,
          loaded:     true
        },
        ui: {
          dialogs:       new Map(),
          dropdownMenus: new Map()
        },
        profiles: {
          data:       new Map(),
          processing: false,
          loaded:     true
        },
        focus: {},
        forms: {}
      },
      {
        channelName: channel.name,
        match:       {
          params: {
            postID:      post.id,
            channelName: channel.name
          }
        },
        location: {
          search:   {},
          pathname: "/"
        },
        history: helper.browserHistory
      }
    )
    twitterEmbedStub = helper.sandbox.stub(embedUtil, "ensureTwitterEmbedJS")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should set the document title", async () => {
    const { inner } = await render()
    assert.equal(
      inner
        .find("MetaTags")
        .props()
        .children.find(child => child.type === "title").props.children,
      formatTitle(post.title)
    )
  })

  it("should set the document meta description", async () => {
    const { inner } = await render()
    assert.equal(
      inner
        .find("MetaTags")
        .props()
        .children.find(child => child.type === "meta").props["content"],
      truncate(post.text, 300)
    )
  })

  it("should set the document meta canonical link to the post detail url", async () => {
    const { inner } = await render()

    assert.equal(
      inner.find("MetaTags").props().canonicalLink,
      postDetailURL(channel.name, post.id, post.slug)
    )
  })

  it("should set the document meta canonical link to the comment permalink", async () => {
    const commentLink = commentPermalink(
      channel.name,
      post.id,
      post.slug,
      comments[0].id
    )
    const { inner } = await render(
      {},
      {
        match: {
          params: {
            postID:      post.id,
            channelName: channel.name,
            commentID:   comments[0].id
          }
        }
      }
    )

    assert.equal(inner.find("MetaTags").props().canonicalLink, commentLink)
  })

  it("should render comments", async () => {
    const { inner } = await render()
    assert.deepEqual(inner.find(CommentTree).props().comments, comments)
  })

  it("should load twitter JS on page load", async () => {
    await render()
    sinon.assert.calledWith(twitterEmbedStub)
  })

  it("should call window.twttr.widgets.load() if a twitter embed", async () => {
    post.url = "http://foo.bar.example.com/baz"
    post.text = null
    post.post_type = LINK_TYPE_LINK
    helper.getEmbedlyStub.returns(Promise.resolve({ response: makeTweet() }))

    window.twttr = {
      widgets: { load: helper.sandbox.stub() }
    }

    await render({
      embedly: {
        data: new Map([[post.url, null]])
      }
    })
    // wait a cycle to let posts and comments resolve
    await wait(0)
    sinon.assert.calledWith(window.twttr.widgets.load)
  })

  it("should show a comment permalink UI if at the right URL", async () => {
    const { inner } = await render(
      {},
      {
        match: {
          params: {
            postID:      post.id,
            channelName: channel.name,
            commentID:   comments[0].id
          }
        }
      }
    )
    const card = inner.find(".comment-detail-card")
    assert(card.exists())
    assert.include(
      card.find("div").at(0).text(),
      "You are viewing a single comment's thread."
    )
    assert.equal(
      card.find(Link).props().to,
      postDetailURL(channel.name, post.id, post.slug)
    )
    assert.equal(
      card.find(Link).props().children,
      "View the rest of the comments"
    )
    assert.isTrue(inner.find(ExpandedPostDisplay).props().showPermalinkUI)
  })

  it("should hide the comments header section when there are no comments", async () => {
    post.num_comments = 0
    helper.getPostStub.returns(Promise.resolve(post))
    helper.getCommentsStub.returns(Promise.resolve([]))
    const { inner } = await render()
    assert.isFalse(inner.find(".count-and-sort").exists())
  })

  //
  ;[true, false].forEach(userIsAnon => {
    it(`should show a CommentForm when userIsAnonymous() === ${userIsAnon}`, async () => {
      const anonStub = helper.sandbox.stub(utilFuncs, "userIsAnonymous")
      anonStub.returns(userIsAnon)
      const { inner } = await render()
      assert.ok(inner.find(CommentForm).exists())
    })
  })

  it("passed props to each CommentVoteForm", async () => {
    const { inner } = await render()
    const commentTree = inner.find("CommentTree")
    const commentTreeProps = commentTree.props()
    const forms = commentTree.find("CommentVoteForm")
    assert.isTrue(forms.length > 0)
    for (const form of forms) {
      const fromProps = form.props
      assert.equal(fromProps.downvote, commentTreeProps.downvote)
      assert.equal(fromProps.upvote, commentTreeProps.upvote)
    }
  })

  it("loads more comments when the function is called", async () => {
    const { inner, store } = await render()
    const commentTree = inner.find("CommentTree")
    const commentTreeProps = commentTree.props()
    const parent = comments[0]
    const moreComments = makeMoreComments(post, parent.id)
    const newComment = makeComment(post, parent.id)
    const newComments = [newComment]

    helper.getMoreCommentsStub.returns(Promise.resolve(newComments))
    await commentTreeProps.loadMoreComments(moreComments)
    const actionsList = store.getActions()
    assert.includeMembers(R.pluck("type")(actionsList), [
      actions.morecomments.get.requestType,
      actions.morecomments.get.successType,
      REPLACE_MORE_COMMENTS
    ])

    sinon.assert.calledWith(
      helper.getMoreCommentsStub,
      post.id,
      parent.id,
      moreComments.children
    )
  })

  describe("deleting post", () => {
    it("opens a confirmation dialog for deleting a post", async () => {
      const { inner, store } = await render()
      inner.find("ExpandedPostDisplay").prop("showPostDeleteDialog")()
      const actionsList = store.getActions()
      assert.deepEqual(R.last(actionsList), {
        type:    SHOW_DIALOG,
        payload: "DELETE_POST_DIALOG"
      })
    })

    it("deletes a post", async () => {
      SETTINGS.username = post.author_id
      const { inner, store } = await render({
        forms: {
          [REPORT_FORM_KEY]: {
            value:  {},
            errors: {}
          }
        }
      })

      const props = inner.find("OurDialog").at(0).props()

      assert.equal(props.title, "Delete Post")
      await props.onAccept()
      sinon.assert.calledWith(helper.deletePostStub, post.id)
      assert.includeDeepMembers(store.getActions(), [
        {
          type:    actions.posts.delete.requestType,
          payload: post.id
        },
        {
          type: actions.posts.delete.successType
        },
        {
          type:    SET_SNACKBAR_MESSAGE,
          payload: { message: "Post has been deleted" }
        },
        {
          type:    HIDE_DIALOG,
          payload: "DELETE_POST_DIALOG"
        }
      ])

      const {
        location: { pathname }
      } = helper.browserHistory
      assert.equal(pathname, channelURL(channel.name))
    })
  })

  describe("as a moderator user", () => {
    beforeEach(() => {
      channel.user_is_moderator = true
    })

    describe("removing or approving", () => {
      describe("posts", () => {
        it("should show a dialog to remove the post", async () => {
          post.removed = false
          const { inner, store } = await render()

          await inner.find("ExpandedPostDisplay").prop("removePost")(post)
          assert.includeDeepMembers(store.getActions(), [
            {
              type:    SET_FOCUSED_POST,
              payload: post
            },
            {
              type:    SHOW_DIALOG,
              payload: "DIALOG_REMOVE_POST"
            }
          ])
        })

        it("removes the post", async () => {
          post.removed = false
          const expected = {
            ...post,
            removed: true
          }
          helper.updateRemovedStub.returns(Promise.resolve(expected))

          const { wrapper, store } = await render({
            focus: {
              post
            }
          })
          const dialogProps = wrapper.find("OurDialog").at(1).props()
          assert.equal(dialogProps.title, "Remove Post")
          await dialogProps.onAccept({ preventDefault: helper.sandbox.stub() })

          assert.includeDeepMembers(store.getActions(), [
            {
              type:    actions.postRemoved.patch.requestType,
              payload: post.id
            },
            {
              type:    actions.postRemoved.patch.successType,
              payload: expected
            },
            {
              type:    SET_POST_DATA,
              payload: expected
            },
            {
              type: CLEAR_FOCUSED_POST
            },
            {
              type:    HIDE_DIALOG,
              payload: "DIALOG_REMOVE_POST"
            },
            {
              type:    SET_SNACKBAR_MESSAGE,
              payload: {
                message: "Post has been removed"
              }
            }
          ])

          sinon.assert.calledWith(helper.updateRemovedStub, post.id, true)
        })

        it("approves the post", async () => {
          post.removed = true
          const { inner, store } = await render()
          const expected = {
            ...post,
            removed: false
          }
          helper.updateRemovedStub.returns(Promise.resolve(expected))

          await inner.find("ExpandedPostDisplay").prop("approvePost")(post)

          assert.includeDeepMembers(store.getActions(), [
            {
              type:    SET_SNACKBAR_MESSAGE,
              payload: {
                message: "Post has been approved"
              }
            }
          ])

          sinon.assert.calledWith(helper.updateRemovedStub, post.id, false)
        })
      })
    })
  })

  describe("reporting", () => {
    beforeEach(() => {
      helper.reportContentStub.returns(Promise.resolve())
    })

    describe("posts", () => {
      it("opens a dialog for reporting a post", async () => {
        const { inner, store } = await render()

        const preventDefaultStub = helper.sandbox.stub()
        inner.find("ExpandedPostDisplay").prop("showPostReportDialog")({
          preventDefault: preventDefaultStub
        })
        assert.ok(preventDefaultStub.called)

        assert.includeDeepMembers(store.getActions(), [
          {
            type:    SET_FOCUSED_POST,
            payload: post
          },
          {
            type:    FORM_BEGIN_EDIT,
            payload: {
              formKey: REPORT_FORM_KEY,
              value:   {
                reason: ""
              }
            }
          },
          {
            type:    SHOW_DIALOG,
            payload: "REPORT_POST_DIALOG"
          }
        ])
      })

      it("edits text in the report post dialog", async () => {
        const { store, wrapper } = await render({
          forms: {
            [REPORT_FORM_KEY]: {
              value:  {},
              errors: {}
            }
          },
          focus: post
        })

        const dialog = wrapper.find("OurDialog").at(0)
        assert.equal(dialog.prop("title"), "Report Post")
        dialog.find("ReportForm").prop("onUpdate")({
          target: {
            name:  "reason",
            value: "spam"
          }
        })

        const actionsList = store.getActions()
        assert.deepEqual(R.last(actionsList), {
          type:    FORM_UPDATE,
          payload: {
            formKey: REPORT_FORM_KEY,
            value:   {
              reason: "spam"
            }
          }
        })
      })

      it("should report a post", async () => {
        const reason = "a reason goes here"
        const { store, wrapper } = await render({
          forms: {
            [REPORT_FORM_KEY]: {
              value: {
                reason
              },
              errors: {}
            }
          },
          focus: {
            post
          }
        })

        const dialog = wrapper.find("OurDialog").at(0)
        assert.equal(dialog.prop("title"), "Report Post")

        await dialog.props().onAccept()
        sinon.assert.calledWith(helper.reportContentStub, {
          post_id: post.id,
          reason:  reason
        })

        assert.includeDeepMembers(store.getActions(), [
          {
            type:    actions.reports.post.requestType,
            payload: {
              post_id: post.id,
              reason
            }
          },
          {
            type: actions.reports.post.successType
          },
          {
            type:    FORM_END_EDIT,
            payload: {
              formKey: REPORT_FORM_KEY
            }
          },
          {
            type:    HIDE_DIALOG,
            payload: "REPORT_POST_DIALOG"
          },
          {
            type: CLEAR_FOCUSED_POST
          },
          {
            type:    SET_SNACKBAR_MESSAGE,
            payload: {
              message: "Post has been reported"
            }
          }
        ])
      })
    })

    describe("validation", () => {
      describe("posts", () => {
        it("validates post report content", async () => {
          const reason = "a reason goes here"
          const form = {
            value: {
              reason
            },
            errors: {}
          }
          const { wrapper } = await render({
            forms: {
              [REPORT_FORM_KEY]: form
            },
            focus: {
              post
            }
          })

          const dialog = wrapper.find("OurDialog").at(0)
          assert.equal(dialog.prop("title"), "Report Post")

          const validationStub = helper.sandbox
            .stub(validationFuncs, "validateContentReportForm")
            .returns({ a: "complaint" })
          await dialog.props().onAccept()
          assert.equal(helper.reportContentStub.callCount, 0)
          sinon.assert.calledWith(validationStub, form)
        })

        it("passes validation errors to ReportForm for display", async () => {
          const errors = "some errors"
          const { wrapper } = await render({
            forms: {
              [REPORT_FORM_KEY]: {
                value:  {},
                errors: errors
              }
            },
            focus: {
              post
            }
          })

          const dialog = wrapper.find("OurDialog").at(0)
          assert.equal(dialog.prop("title"), "Report Post")

          assert.equal(dialog.find("ReportForm").prop("validation"), errors)
        })
      })
    })
  })

  it("should show a 404 page", async () => {
    const { inner } = await render({
      posts: {
        error: {
          errorStatusCode: 404
        }
      }
    })
    assert(inner.find(NotFound).exists())
  })

  it("should show an unauthorized page", async () => {
    const { inner } = await render({
      posts: {
        error: {
          error_type: NOT_AUTHORIZED_ERROR_TYPE
        }
      }
    })
    assert(inner.find(NotAuthorized).exists())
  })

  it("should show a 404 page for a comment 404", async () => {
    const { inner } = await render({
      comments: {
        error: {
          errorStatusCode: 404
        }
      }
    })
    assert(inner.find(NotFound).exists())
  })

  it("should show the PostPage if a 410 happens on comments", async () => {
    // really this only happens on comments.post, but we don't have per-verb status codes so this is close enough
    const { inner } = await render({
      comments: {
        error: {
          errorStatusCode: 410
        }
      }
    })
    assert.isNotOk(inner.find(NotFound).exists())
  })

  it("should show the normal error page for non 404 errors", async () => {
    const { inner } = await render({
      posts: {
        error: {
          errorStatusCode: 500
        }
      }
    })
    assert.equal(inner.find(".errored").text(), "Error loading page")
    assert.isFalse(inner.find(NotFound).exists())
  })

  it("should switch the sorting method when an option is selected", async () => {
    post.num_comments = 5
    const { inner, wrapper } = await render()

    for (const sortType of VALID_COMMENT_SORT_TYPES) {
      const select = inner.find(".count-and-sort").find("CommentSortPicker")
      select.props().updatePickerParam(sortType, {
        preventDefault: helper.sandbox.stub()
      })

      assert.equal(wrapper.props().history.location.search, `?sort=${sortType}`)
    }
  })
})
