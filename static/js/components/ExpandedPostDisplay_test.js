/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import { mount, shallow } from "enzyme"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import R from "ramda"
import moment from "moment"
import { EditorView } from "prosemirror-view"

import ExpandedPostDisplay from "./ExpandedPostDisplay"
import Router from "../Router"
import Embedly from "./Embedly"
import FollowButton from "./FollowButton"
import ProfileImage from "../containers/ProfileImage"
import SharePopup from "./SharePopup"

import { wait } from "../lib/util"
import {
  postPermalink,
  postDetailURL,
  profileURL,
  embedlyResizeImage
} from "../lib/url"
import { makePost } from "../factories/posts"
import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { editPostKey } from "../components/CommentForms"
import * as utilFuncs from "../lib/util"
import { makeChannel } from "../factories/channels"
import { shouldIf } from "../lib/test_utils"
import { LINK_TYPE_ARTICLE } from "../lib/channels"

describe("ExpandedPostDisplay", () => {
  let helper,
    post,
    channel,
    beginEditingStub,
    approvePostStub,
    removePostStub,
    showPostDeleteDialogStub,
    showPostReportDialogStub,
    toggleFollowPostStub

  const postProps = (props = {}) => ({
    toggleUpvote: () => {},
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
    post,
    ...props
  })

  const renderPostDisplay = (props = {}) => {
    return mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <ExpandedPostDisplay {...postProps(props)} />
      </Router>
    )
  }

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
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a post correctly", () => {
    post.edited = false
    const wrapper = renderPostDisplay()
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

  it("should link to the post author's profile", () => {
    const link = renderPostDisplay()
      .find(".authored-by")
      .find("Link")
    assert.include(link.text(), post.author_name)
    assert.equal(link.props().to, profileURL(post.author_id))
  })

  //
  ;[["My headline", true], [null, false]].forEach(
    ([headlineText, expElementExists]) => {
      it(`${shouldIf(
        expElementExists
      )} display headline span when text=${String(headlineText)}`, () => {
        post.author_headline = headlineText
        const wrapper = renderPostDisplay({ post })
        const headlineSpan = wrapper.find(".author-headline").at(1)
        assert.equal(headlineSpan.exists(), expElementExists)
        if (expElementExists && headlineText) {
          assert(headlineSpan.text().includes(headlineText))
        }
      })
    }
  )

  it("should hide text content if passed showPermalinkUI", () => {
    const wrapper = renderPostDisplay({ showPermalinkUI: true })
    assert.isFalse(wrapper.find(ReactMarkdown).exists())
  })

  it("should show an embedly component, if a link post", () => {
    [true, false].forEach(isLinkPost => {
      post = makePost(isLinkPost)
      const wrapper = renderPostDisplay()
      assert.equal(isLinkPost, wrapper.find(Embedly).exists())
    })
  })

  it("should display post text", () => {
    const string = "JUST SOME GREAT TEXT!"
    post.text = string
    post.edited = false
    const wrapper = renderPostDisplay()
    assert.equal(wrapper.find(ReactMarkdown).props().source, string)
  })

  it("should not display images from markdown", () => {
    post.edited = false
    post.text = "# MARKDOWN!\n![](https://images.example.com/potato.jpg)"
    const wrapper = renderPostDisplay()
    assert.equal(wrapper.find(ReactMarkdown).props().source, post.text)
    assert.lengthOf(wrapper.find(ReactMarkdown).find("img"), 0)
  })

  it("should include an external link, if a url post", () => {
    post = makePost(true)
    const wrapper = renderPostDisplay()
    const { href, target, children } = wrapper
      .find("a")
      .at(0)
      .props()
    assert.equal(href, post.url)
    assert.equal(target, "_blank")
    assert.equal(children[0], post.title)
  })

  it("should display the domain, for a url post", () => {
    post = makePost(true)
    const wrapper = renderPostDisplay({
      embedly: { provider_name: "Great Website" }
    })
    assert.include(wrapper.find(".provider-name").text(), "Great Website")
  })

  it("should link to the detail view, if a text post", () => {
    const wrapper = renderPostDisplay()
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
    } author`, () => {
      const post = makePost(postType === "url")

      if (postType === "article") {
        post.text === null
        post.article = [{ foo: "bar" }]
      }

      if (userAuthor) {
        SETTINGS.username = post.author_id
      }
      const wrapper = renderPostDisplay({ post })
      assert.equal(wrapper.find(".edit-post").exists(), shouldShowLink)
    })
  })

  it("should show a follow button with correct props", () => {
    post = makePost()
    const wrapper = renderPostDisplay()
    const followButton = wrapper.find(FollowButton)
    assert.ok(followButton.exists())
    assert.equal(followButton.props().post, post)
    assert.equal(followButton.props().toggleFollowPost, toggleFollowPostStub)
  })

  //
  ;[true, false].forEach(userAuthor => {
    it(`${shouldIf(userAuthor)} show a delete button if user ${
      userAuthor ? "is" : "is not"
    } author`, () => {
      post = makePost()
      if (userAuthor) {
        SETTINGS.username = post.author_id
      }
      const wrapper = renderPostDisplay()
      assert.equal(wrapper.find(".delete-post").exists(), userAuthor)
    })
  })

  it("should call showPostDeleteDialog when user clicks 'delete'", () => {
    SETTINGS.username = post.author_id
    const wrapper = renderPostDisplay()
    wrapper
      .find(".delete-post")
      .find("a")
      .simulate("click")
    assert.ok(showPostDeleteDialogStub.called)
  })

  it("should call showPostReportDialog when user clicks 'report'", () => {
    const wrapper = renderPostDisplay()
    wrapper
      .find(".report-post")
      .find("a")
      .simulate("click")
    assert.ok(showPostReportDialogStub.called)
  })

  it('should call beginEditing when user clicks "edit"', () => {
    post = makePost(false)
    SETTINGS.username = post.author_id
    const wrapper = renderPostDisplay()
    wrapper
      .find(".edit-post")
      .at(0)
      .simulate("click")
    assert.ok(beginEditingStub.called)
  })

  it("should hide the report link for anonymous users", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderPostDisplay()
    assert.isNotOk(wrapper.find(".comment-action-button.report-post").exists())
  })

  it("should hide the follow link for anonymous users", () => {
    helper.sandbox.stub(utilFuncs, "userIsAnonymous").returns(true)
    const wrapper = renderPostDisplay()
    assert.isNotOk(
      wrapper.find(".comment-action-button.subscribe-post").exists()
    )
  })

  it("should hide post action buttons when editing", () => {
    post = makePost(false)
    helper.store.dispatch(
      actions.forms.formBeginEdit({
        formKey: editPostKey(post),
        value:   post
      })
    )
    const wrapper = renderPostDisplay({
      forms: helper.store.getState().forms
    })
    assert.lengthOf(wrapper.find(".post-actions"), 0)
  })

  const assertButton = (wrapper, isUpvote) => {
    if (isUpvote) {
      assert.include(
        wrapper.find(".post-upvote-button").props().className,
        "upvoted"
      )
    } else {
      assert.notInclude(
        wrapper.find(".post-upvote-button").props().className,
        "upvoted"
      )
    }
  }

  //
  ;[true, false].forEach(prevUpvote => {
    it(`should show the correct UI when the upvote
    button is clicked when prev state was ${String(prevUpvote)}`, async () => {
      post.upvoted = prevUpvote
      // setting to a function so Flow doesn't complain
      let resolveUpvote = () => null
      const toggleUpvote = helper.sandbox.stub().returns(
        new Promise(resolve => {
          resolveUpvote = resolve
        })
      )
      const wrapper = renderPostDisplay({
        post:         post,
        toggleUpvote: toggleUpvote
      })
      assertButton(wrapper, prevUpvote)
      wrapper.find(".post-upvote-button").simulate("click")
      assert.isOk(toggleUpvote.calledOnce)

      assertButton(wrapper, !prevUpvote)
      resolveUpvote()
      post.upvoted = !prevUpvote
      wrapper.setProps({ post })
      // wait for promise resolve to trigger state changes
      await wait(10)
      wrapper.update()
      assertButton(wrapper, !prevUpvote)
    })
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
    )}`, () => {
      post.removed = removed
      if (isPostAuthor) {
        post.author_id = SETTINGS.username
      }
      const wrapper = renderPostDisplay({ isModerator })
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

  it('should call approvePost when user clicks "approve"', () => {
    post.removed = true
    const wrapper = renderPostDisplay({ isModerator: true })
    wrapper
      .find(".approve-post")
      .find("a")
      .simulate("click")
    assert.ok(approvePostStub.called)
  })

  it('should call removePost when user clicks "remove"', () => {
    post.removed = false
    const wrapper = renderPostDisplay({ isModerator: true })
    wrapper
      .find(".remove-post")
      .find("a")
      .simulate("click")
    assert.ok(removePostStub.called)
  })

  it("should display a report count, if num_reports has a value", () => {
    post.num_reports = 2
    const wrapper = renderPostDisplay()
    const count = wrapper.find(".report-count")
    assert.ok(count.exists())
    // $FlowFixMe: thinks this doesn't exist
    assert.equal(count.text(), `${post.num_reports} Reports`)
  })

  it("should not render a report count, if post has no report data", () => {
    const wrapper = renderPostDisplay()
    const count = wrapper.find(".report-count")
    assert.isNotOk(count.exists())
  })

  it("should render a sharepopup", () => {
    const wrapper = renderPostDisplay({ postShareMenuOpen: true }).find(
      SharePopup
    )
    assert.ok(wrapper.exists())
    assert.equal(wrapper.props().url, postPermalink(post))
  })

  it("should pass down hideSocialButtons to SharePopup if private channel", () => {
    channel.channel_type = "private"
    const popup = renderPostDisplay({ postShareMenuOpen: true }).find(
      SharePopup
    )
    assert.isTrue(popup.props().hideSocialButtons)
  })

  it("should use ArticleEditor and embedlyResizeImage to display if an article post", () => {
    post.post_type = LINK_TYPE_ARTICLE
    post.article_content = []
    post.cover_image = "/img/image.jpg"
    post.text = null
    const wrapper = shallow(<ExpandedPostDisplay {...postProps()} />)
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
