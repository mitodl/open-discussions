// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import ReactMarkdown from "react-markdown"

import Comment from "./Comment"
import CommentForm from "./CommentForm"
import { commentPermalink, profileURL, absolutizeURL } from "../lib/url"
import ShareTooltip from "./ShareTooltip"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeComment } from "../factories/comments"
import { makePost } from "../factories/posts"
import { makeCommentReport } from "../factories/reports"
import * as utilFuncs from "../lib/util"
import { shouldIf } from "../lib/test_utils"

describe("CommentTree", () => {
  let comment, post, permalinkFunc, helper, render, anonStub

  const openMenu = wrapper => wrapper.find(".more_vert").simulate("click")

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    comment = makeComment(post)
    permalinkFunc = commentPermalink("channel", post.id, post.slug)
    anonStub = helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(false)
    helper.updateCommentStub.resetBehavior()
    helper.updateCommentStub.callsFake(comment => Promise.resolve(comment))
    helper.deleteCommentStub.resetBehavior()
    helper.deleteCommentStub.callsFake(comment => Promise.resolve(comment))
    render = helper.configureReduxQueryRenderer(Comment, {
      comment,
      post,
      commentPermalink: permalinkFunc
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[true, false].forEach(useSearchPageUI => {
    it(`${shouldIf(!useSearchPageUI)} show the Share button`, async () => {
      const { wrapper } = await render({ useSearchPageUI })
      assert.equal(
        wrapper.find(".share-button-wrapper").exists(),
        !useSearchPageUI
      )
    })
  })

  it('should not include a "reply" button if useSearchPageUI is true', async () => {
    const { wrapper } = await render({ useSearchPageUI: true })
    assert.isNotOk(wrapper.find(".comment-action-button.reply-button").exists())
  })

  it('should include a "reply" button', async () => {
    const { wrapper } = await render()
    wrapper.find(".comment-action-button.reply-button").at(0).simulate("click")
    const form = wrapper.find(CommentForm)
    assert.deepEqual(comment, form.prop("comment"))
  })

  it("has a comment vote form", async () => {
    const { wrapper } = await render()
    assert.deepEqual(wrapper.find("CommentVoteForm").prop("comment"), comment)
  })

  it('should not include a "reply" button for deleted comments', async () => {
    comment.deleted = true
    const { wrapper } = await render()
    assert.isNotOk(
      wrapper
        .find(".top-level-comment .comment-actions")
        .at(0)
        .find(".comment-action-button.reply-button")
        .exists()
    )
  })

  //
  ;[true, false].forEach(useSearchPageUI => {
    [true, false].forEach(userIsAnonymous => {
      it(`${shouldIf(
        !userIsAnonymous && !useSearchPageUI
      )} include a showMenu icon when anon=${String(
        userIsAnonymous
      )} and search=${String(useSearchPageUI)}`, async () => {
        anonStub.returns(userIsAnonymous)
        const { wrapper } = await render({ useSearchPageUI })
        assert.equal(
          wrapper.find(".more_vert").exists(),
          !userIsAnonymous && !useSearchPageUI
        )
      })
    })
  })

  it('should include a "report" button', async () => {
    const { wrapper } = await render()
    openMenu(wrapper)
    wrapper
      .find(".comment-action-button.report-button")
      .at(0)
      .simulate("click", null)
    const reportDialog = wrapper.find("CommentReportDialog")
    assert.deepEqual(reportDialog.props().comment, comment)
    reportDialog.props().hideDialog()
    wrapper.update()
    assert.isNotOk(wrapper.find("CommentReportDialog").exists())
  })

  it('should include an "Edit" button, if the user wrote the comment', async () => {
    SETTINGS.username = comment.author_id
    const { wrapper } = await render()
    openMenu(wrapper)
    wrapper.find(".edit-button").simulate("click")
    const form = wrapper.find(CommentForm)
    assert.deepEqual(comment, form.prop("comment"))
  })

  //
  ;[
    [true, "Unfollow"],
    [false, "Follow"]
  ].forEach(([subscribed, buttonText]) => {
    it(`should include a ${buttonText} button when subscribed === ${String(
      subscribed
    )}`, async () => {
      comment.subscribed = subscribed
      const { wrapper } = await render()
      openMenu(wrapper)
      const button = wrapper.find(".subscribe-comment").at(0)
      assert.equal(button.text(), buttonText)
      button.simulate("click")
      assert.deepEqual(helper.updateCommentStub.args[0], [
        comment.id,
        { subscribed: !subscribed }
      ])
    })
  })

  it("should include a 'delete' button, if the user wrote the comment", async () => {
    SETTINGS.username = comment.author_id
    const { wrapper } = await render()
    openMenu(wrapper)
    wrapper.find(".comment-action-button.delete-button").simulate("click")
    const deleteDialog = wrapper.find("#comment-delete-dialog").at(0)
    await deleteDialog.prop("onAccept")()
    wrapper.update()
    assert.isNotOk(wrapper.find("#comment-delete-dialog").exists())
    assert.deepEqual(helper.deleteCommentStub.args[0], [comment.id])
  })

  it("should not show a delete button, otherwise", async () => {
    const { wrapper } = await render()
    openMenu(wrapper)
    assert.isNotOk(wrapper.find(".delete-button").exists())
  })

  it("should show the author name", async () => {
    const { wrapper } = await render()
    const authorName = wrapper
      .find(".comment")
      .at(0)
      .find(".author-name")
      .at(0)
      .text()
    assert.equal(authorName, comment.author_name)
  })

  it("should link to the author's profile", async () => {
    const { wrapper } = await render()
    const link = wrapper.find(".author-info").at(0).find("Link").at(0)
    assert.equal(link.text(), comment.author_name)
    assert.equal(link.props().to, profileURL(comment.author_id))
    const secondLink = wrapper.find(".comment").at(0).find("Link").at(0)
    assert.equal(secondLink.props().to, profileURL(comment.author_id))
    assert(secondLink.find("ProfileImage").exists())
  })

  it("should link to the comment URL", async () => {
    const { wrapper } = await render()
    const link = wrapper.find(".author-info").at(0).find("Link").at(1).props()
    assert.equal(link.to, permalinkFunc(comment.id))
  })

  //
  ;[true, false].forEach(isPrivateChannel => {
    it(`should render a ShareTooltip on a ${
      isPrivateChannel ? "private" : "public"
    } channel`, async () => {
      const { wrapper } = await render({ isPrivateChannel })
      const toolTip = wrapper.find(ShareTooltip)
      const { url, hideSocialButtons, objectType } = toolTip.props()
      assert.equal(objectType, "comment")
      assert.equal(url, absolutizeURL(permalinkFunc(comment.id)))
      assert.equal(hideSocialButtons, isPrivateChannel)
    })
  })

  it("should use markdown to render comments, should skip images", async () => {
    comment.text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    comment.edited = false
    const { wrapper } = await render()
    const md = wrapper.find(ReactMarkdown)

    assert.equal(md.props().source, comment.text)
    assert.lengthOf(md.find("img"), 0)
  })

  it("should render a profile image", async () => {
    const { wrapper } = await render()
    const { src } = wrapper.find(".profile-image").at(0).props()
    assert.equal(src, comment.profile_image)
  })

  describe("moderation UI", () => {
    const moderationUI = true
    const isModerator = true
    let report

    beforeEach(() => {
      report = makeCommentReport(makePost())
    })

    it("should hide the reply button", async () => {
      const { wrapper } = await render({ moderationUI })
      assert.isNotOk(wrapper.find(".reply-button").exists())
    })

    it("should hide the report button", async () => {
      const { wrapper } = await render({ moderationUI })
      assert.isNotOk(wrapper.find(".report-button").exists())
    })

    it("should include the report count if the comment has the data", async () => {
      const { comment } = report
      const { wrapper } = await render({ comment })
      assert.ok(wrapper.find(".report-count").exists())
      assert.equal(wrapper.find(".report-count").text(), "2 Reports")
    })

    it("should not render a report count, if comment has no report data", async () => {
      const { wrapper } = await render()
      const count = wrapper.find(".report-count")
      assert.isNotOk(count.exists())
    })

    it("should include an ignoreCommentReports button if report and moderator", async () => {
      const { comment } = report
      const { wrapper } = await render({
        isModerator,
        comment
      })
      openMenu(wrapper)
      const ignoreButton = wrapper.find(".ignore-button")
      assert.equal(ignoreButton.text(), "Ignore reports")
      ignoreButton.simulate("click")
      assert.deepEqual(helper.updateCommentStub.args[0], [
        comment.id,
        { ignore_reports: true }
      ])
    })

    it("should let a moderator approve a comment", async () => {
      comment.removed = true
      const { wrapper } = await render({ isModerator: true })
      openMenu(wrapper)
      wrapper.find(".approve-button").simulate("click")
      assert.deepEqual(helper.updateCommentStub.args[0], [
        comment.id,
        { removed: false }
      ])
    })

    it("should let a moderator remove a comment", async () => {
      comment.removed = false
      const { wrapper } = await render({ isModerator: true })
      openMenu(wrapper)
      wrapper.find(".remove-button").simulate("click")
      wrapper.find("#remove-comment-dialog").at(0).prop("onAccept")()
      assert.deepEqual(helper.updateCommentStub.args[0], [
        comment.id,
        { removed: true }
      ])
    })
  })
})
