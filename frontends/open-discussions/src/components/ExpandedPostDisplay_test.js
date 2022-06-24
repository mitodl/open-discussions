/* global SETTINGS: false */
import { assert } from "chai"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import R from "ramda"
import moment from "moment"
import { EditorView } from "prosemirror-view"

import ExpandedPostDisplay from "./ExpandedPostDisplay"
import Embedly from "./Embedly"
import FollowButton from "./FollowButton"
import ProfileImage from "./ProfileImage"
import ShareTooltip from "./ShareTooltip"
import * as ArticleEditorModule from "./ArticleEditor"

import {
  postPermalink,
  postDetailURL,
  profileURL,
  embedlyResizeImage
} from "../lib/url"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { editPostKey } from "../components/EditPostForm"
import * as utilFuncs from "../lib/util"
import { makeChannel } from "../factories/channels"
import { shouldIf } from "../lib/test_utils"
import { LINK_TYPE_ARTICLE } from "../lib/channels"

describe("ExpandedPostDisplay", () => {
  let helper,
    render,
    post,
    channel,
    beginEditingStub,
    approvePostStub,
    removePostStub,
    showPostDeleteDialogStub,
    showPostReportDialogStub,
    toggleFollowPostStub,
    postProps

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    post = makePost()
    channel = makeChannel()
    beginEditingStub = helper.sandbox.stub()
    approvePostStub = helper.sandbox.stub()
    removePostStub = helper.sandbox.stub()
    showPostDeleteDialogStub = helper.sandbox.stub()
    showPostReportDialogStub = helper.sandbox.stub()
    toggleFollowPostStub = helper.sandbox.stub()
    helper.sandbox.stub(EditorView.prototype, "focus")
    helper.stubComponent(ArticleEditorModule, "ArticleEditor")
    postProps = {
      beginEditing: R.curry((key, post, e) => {
        beginEditingStub(key, post, e)
      }),
      approvePost:          approvePostStub,
      removePost:           removePostStub,
      showPostDeleteDialog: showPostDeleteDialogStub,
      showPostReportDialog: showPostReportDialogStub,
      toggleFollowPost:     toggleFollowPostStub,
      postDropdownMenuOpen: true,
      forms:                {},
      channel,
      post
    }

    render = helper.configureReduxQueryRenderer(ExpandedPostDisplay, postProps)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a post correctly", async () => {
    post.edited = false
    const { wrapper } = await render()
    const summary = wrapper.find(".summary")
    assert.equal(wrapper.find(".votes").text(), post.score.toString())
    assert.equal(
      summary
        .find(Link)
        .at(0)
        .props().children,
      post.title
    )
    const authoredBy = wrapper.find(".authored-by")
    assert.ok(authoredBy.find(ProfileImage).exists())
    assert.equal(authoredBy.find(".author-name").text(), post.author_name)
    assert.equal(
      authoredBy.find(".right").text(),
      moment(post.created).fromNow()
    )
  })

  it("should link to the post author's profile", async () => {
    const { wrapper } = await render()
    const link = wrapper.find(".authored-by").find("Link")
    assert.include(link.text(), post.author_name)
    assert.equal(link.props().to, profileURL(post.author_id))
  })

  //
  ;[
    ["My headline", true],
    [null, false]
  ].forEach(([headlineText, expElementExists]) => {
    it(`${shouldIf(expElementExists)} display headline span when text=${String(
      headlineText
    )}`, async () => {
      post.author_headline = headlineText
      const { wrapper } = await render({ post })
      const headlineSpan = wrapper.find(".author-headline").at(1)
      assert.equal(headlineSpan.exists(), expElementExists)
      if (expElementExists && headlineText) {
        assert(headlineSpan.text().includes(headlineText))
      }
    })
  })

  it("should hide text content if passed showPermalinkUI", async () => {
    const { wrapper } = await render({ showPermalinkUI: true })
    assert.isFalse(wrapper.find(ReactMarkdown).exists())
  })

  //
  ;[true, false].forEach(isLinkPost => {
    it(`${shouldIf(
      isLinkPost
    )} show a embedly compoent when link post:${isLinkPost.toString()}`, async () => {
      post = makePost(isLinkPost)
      const { wrapper } = await render({ post })
      assert.equal(isLinkPost, wrapper.find(Embedly).exists())
    })
  })

  it("should display post text", async () => {
    const string = "JUST SOME GREAT TEXT!"
    post.text = string
    post.edited = false
    const { wrapper } = await render()
    assert.equal(wrapper.find(ReactMarkdown).props().source, string)
  })

  it("should not display images from markdown", async () => {
    post.edited = false
    post.text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    const { wrapper } = await render()
    assert.equal(wrapper.find(ReactMarkdown).props().source, post.text)
    assert.lengthOf(wrapper.find(ReactMarkdown).find("img"), 0)
  })

  it("should include an external link, if a url post", async () => {
    post = makePost(true)
    const { wrapper } = await render({ post })
    const { href, target, children } = wrapper
      .find("a")
      .at(0)
      .props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
    assert.equal(children[0], post.title)
  })

  it("should display the domain, for a url post", async () => {
    post = makePost(true)
    const { wrapper } = await render({
      post,
      embedly: { provider_name: "Great Website" }
    })
    assert.include(wrapper.find(".provider-name").text(), "Great Website")
  })

  it("should link to the detail view, if a text post", async () => {
    const { wrapper } = await render()
    const { to, children } = wrapper
      .find(Link)
      .at(0)
      .props()
    assert.equal(children, post.title)
    assert.equal(to, postDetailURL(post.channel_name, post.id, post.slug))
  })

  //
  ;[
    ["text", true, true],
    ["article", true, true],
    ["url", true, false],
    ["text", false, false],
    ["article", false, false],
    ["url", false, false]
  ].forEach(([postType, userAuthor, shouldShowLink]) => {
    it(`${shouldIf(
      shouldShowLink
    )} show an edit link if post is ${postType} and user ${
      userAuthor ? "is" : "is not"
    } author`, async () => {
      const post = makePost(postType === "url")

      if (postType === "article") {
        post.text === null
        post.article = [{ foo: "bar" }]
      }

      if (userAuthor) {
        SETTINGS.username = post.author_id
      }
      const { wrapper } = await render({ post })
      assert.equal(wrapper.find(".edit-post").exists(), shouldShowLink)
    })
  })

  it("should show a follow button with correct props", async () => {
    post = makePost()
    const { wrapper } = await render({ post })
    const followButton = wrapper.find(FollowButton)
    assert.ok(followButton.exists())
    assert.equal(followButton.props().post, post)
    assert.equal(followButton.props().toggleFollowPost, toggleFollowPostStub)
  })

  //
  ;[true, false].forEach(userAuthor => {
    it(`${shouldIf(userAuthor)} show a delete button if user ${
      userAuthor ? "is" : "is not"
    } author`, async () => {
      post = makePost()
      if (userAuthor) {
        SETTINGS.username = post.author_id
      }
      const { wrapper } = await render({ post })
      assert.equal(wrapper.find(".delete-post").exists(), userAuthor)
    })
  })

  it("should call showPostDeleteDialog when user clicks 'delete'", async () => {
    SETTINGS.username = post.author_id
    const { wrapper } = await render()
    wrapper
      .find(".delete-post")
      .find("a")
      .simulate("click")
    assert.ok(showPostDeleteDialogStub.called)
  })

  it("should call showPostReportDialog when user clicks 'report'", async () => {
    const { wrapper } = await render()
    wrapper
      .find(".report-post")
      .find("a")
      .simulate("click")
    assert.ok(showPostReportDialogStub.called)
  })

  it('should call beginEditing when user clicks "edit"', async () => {
    post = makePost(false)
    SETTINGS.username = post.author_id
    const { wrapper } = await render({ post })
    wrapper
      .find(".edit-post")
      .at(0)
      .simulate("click")
    assert.ok(beginEditingStub.called)
  })

  it("should hide the report link for anonymous users", async () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".comment-action-button.report-post").exists())
  })

  it("should hide the follow link for anonymous users", async () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const { wrapper } = await render()
    assert.isNotOk(
      wrapper.find(".comment-action-button.subscribe-post").exists()
    )
  })

  it("should hide post action buttons when editing", async () => {
    post = makePost(false)
    helper.store.dispatch(
      actions.forms.formBeginEdit({
        formKey: editPostKey(post),
        value:   post
      })
    )
    const { wrapper } = await render({
      post,
      forms: helper.store.getState().forms
    })
    assert.lengthOf(wrapper.find(".post-actions"), 0)
  })

  //
  ;[
    [true, false, true],
    [true, false, false],
    [true, true, true],
    [true, true, false],
    [false, false, true],
    [false, false, false],
    [false, true, true],
    [false, true, false]
  ].forEach(([isModerator, removed, isPostAuthor]) => {
    it(`${shouldIf(
      isModerator && !removed && !isPostAuthor
    )} display approve and remove links if isModerator=${String(
      isModerator
    )}, removed=${String(removed)}, isPostAuthor=${String(
      isPostAuthor
    )}`, async () => {
      post.removed = removed
      if (isPostAuthor) {
        post.author_id = SETTINGS.username
      }
      const { wrapper } = await render({ isModerator })
      assert.equal(
        wrapper.find(".approve-post").exists(),
        isModerator && removed && !isPostAuthor
      )
      assert.equal(
        wrapper.find(".remove-post").exists(),
        isModerator && !removed && !isPostAuthor
      )
    })
  })

  it('should call approvePost when user clicks "approve"', async () => {
    post.removed = true
    const { wrapper } = await render({ isModerator: true })
    wrapper
      .find(".approve-post")
      .find("a")
      .simulate("click")
    assert.ok(approvePostStub.called)
  })

  it('should call removePost when user clicks "remove"', async () => {
    post.removed = false
    const { wrapper } = await render({ isModerator: true })
    wrapper
      .find(".remove-post")
      .find("a")
      .simulate("click")
    assert.ok(removePostStub.called)
  })

  it("should display a report count, if num_reports has a value", async () => {
    post.num_reports = 2
    const { wrapper } = await render()
    const count = wrapper.find(".report-count")
    assert.ok(count.exists())
    // $FlowFixMe: thinks this doesn't exist
    assert.equal(count.text(), `${post.num_reports} Reports`)
  })

  it("should not render a report count, if post has no report data", async () => {
    const { wrapper } = await render()
    const count = wrapper.find(".report-count")
    assert.isNotOk(count.exists())
  })

  it("should render a sharepopup", async () => {
    const { wrapper } = await render({ postShareMenuOpen: true })
    const tooltip = wrapper.find(ShareTooltip)
    assert.ok(tooltip.exists())
    assert.equal(tooltip.props().url, postPermalink(post))
  })

  it("should pass down hideSocialButtons to ShareTooltip if private channel", async () => {
    channel.channel_type = "private"
    const { wrapper } = await render({ postShareMenuOpen: true })
    const popup = wrapper.find(ShareTooltip)
    assert.isTrue(popup.props().hideSocialButtons)
  })

  it("should use ArticleEditor and embedlyResizeImage to display if an article post", async () => {
    post.post_type = LINK_TYPE_ARTICLE
    post.article_content = []
    post.cover_image = "/img/image.jpg"
    post.text = null
    const { wrapper } = await render()
    assert.ok(wrapper.find("ArticleEditor"))
    assert.deepEqual(wrapper.find("ArticleEditor").props(), {
      readOnly:    true,
      initialData: []
    })
    const img = wrapper.find("img.cover-image")
    assert.ok(img.exists())
    const { src } = img.props()
    assert.equal(
      src,
      embedlyResizeImage(SETTINGS.embedlyKey, "/img/image.jpg", 300)
    )
  })
})
