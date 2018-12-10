// @flow
/* global SETTINGS: false */
import React from "react"
import moment from "moment"
import R from "ramda"
import { Link } from "react-router-dom"

import ReportCount from "./ReportCount"
import { EditPostForm } from "./CommentForms"
import { renderTextContent } from "./Markdown"
import Embedly from "./Embedly"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"
import DropdownMenu from "./DropdownMenu"
import SharePopup from "./SharePopup"
import FollowButton from "./FollowButton"
import PostUpvoteButton from "./PostUpvoteButton"
import ArticleEditor from "./ArticleEditor"

import { isPrivate } from "../lib/channels"
import { formatPostTitle } from "../lib/posts"
import { userIsAnonymous } from "../lib/util"
import { editPostKey } from "../components/CommentForms"
import { makeProfile } from "../lib/profile"
import { postPermalink, profileURL } from "../lib/url"

import type { Post, Channel } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"

type Props = {
  post: Post,
  toggleUpvote: Post => void,
  approvePost: Post => void,
  removePost: Post => void,
  forms: FormsState,
  isModerator: boolean,
  beginEditing: (key: string, initialValue: Object, e: ?Event) => void,
  showPostDeleteDialog: () => void,
  showPostReportDialog: () => void,
  showPermalinkUI: boolean,
  toggleFollowPost: Post => void,
  embedly: Object,
  showPostMenu: Function,
  hidePostMenu: Function,
  postDropdownMenuOpen: boolean,
  showPostShareMenu: Function,
  hidePostShareMenu: Function,
  postShareMenuOpen: boolean,
  channel: Channel
}

export default class ExpandedPostDisplay extends React.Component<Props> {
  renderTextOrArticleContent = () => {
    const { forms, post } = this.props

    if (R.has(editPostKey(post), forms)) {
      return <EditPostForm post={post} editing />
    } else {
      return post.text ? (
        renderTextContent(post)
      ) : (
        <ArticleEditor readOnly initialData={post.article_content || []} />
      )
    }
  }

  approvePost = (e: Event) => {
    const { post, approvePost } = this.props

    e.preventDefault()

    approvePost(post)
  }

  removePost = (e: Event) => {
    const { post, removePost } = this.props

    e.preventDefault()

    removePost(post)
  }

  postActionButtons = () => {
    const {
      toggleUpvote,
      toggleFollowPost,
      post,
      beginEditing,
      isModerator,
      showPostDeleteDialog,
      showPostReportDialog,
      postDropdownMenuOpen,
      showPostMenu,
      hidePostMenu,
      showPostShareMenu,
      hidePostShareMenu,
      postShareMenuOpen,
      channel
    } = this.props

    return (
      <div className="post-actions">
        <div className="left">
          <PostUpvoteButton post={post} toggleUpvote={toggleUpvote} />
          <ReportCount count={post.num_reports} />
        </div>
        <div className="right">
          {SETTINGS.username === post.author_id &&
          (post.text || post.article_content) ? (
              <div
                className="post-action edit-post grey-surround"
                onClick={beginEditing(editPostKey(post), post)}
              >
                <i className="material-icons edit">edit</i>
                <span>Edit</span>
              </div>
            ) : null}
          <div
            className="post-action share-action grey-surround"
            onClick={showPostShareMenu}
          >
            <i className="material-icons reply">reply</i>
            <span>Share</span>
            {postShareMenuOpen ? (
              <SharePopup
                url={postPermalink(post)}
                closePopup={hidePostShareMenu}
                hideSocialButtons={isPrivate(channel)}
              />
            ) : null}
          </div>
          <FollowButton post={post} toggleFollowPost={toggleFollowPost} />
          {userIsAnonymous() ? null : (
            <i
              className="material-icons more_vert grey-surround"
              onClick={postDropdownMenuOpen ? null : showPostMenu}
            >
              more_vert
            </i>
          )}
          {postDropdownMenuOpen ? (
            <DropdownMenu
              closeMenu={hidePostMenu}
              className="post-comment-dropdown"
            >
              {SETTINGS.username === post.author_id ? (
                <li className="comment-action-button delete-post">
                  <a onClick={showPostDeleteDialog} href="#">
                    Delete
                  </a>
                </li>
              ) : null}
              {isModerator && !post.removed ? (
                <li className="comment-action-button remove-post">
                  <a onClick={this.removePost.bind(this)} href="#">
                    Remove
                  </a>
                </li>
              ) : null}
              {isModerator && post.removed ? (
                <li className="comment-action-button approve-post">
                  <a onClick={this.approvePost.bind(this)} href="#">
                    Approve
                  </a>
                </li>
              ) : null}
              {!userIsAnonymous() ? (
                <li className="comment-action-button report-post">
                  <a onClick={showPostReportDialog} href="#">
                    Report
                  </a>
                </li>
              ) : null}
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    )
  }

  render() {
    const { post, forms, showPermalinkUI, embedly } = this.props
    const formattedDate = moment(post.created).fromNow()

    return (
      <div className="expanded-post-summary">
        <div className="summary">
          <div className="post-title">{formatPostTitle(post)}</div>
          <div className="authored-by">
            <div className="left">
              <Link to={profileURL(post.author_id)}>
                <ProfileImage
                  profile={makeProfile({
                    name:                post.author_name,
                    profile_image_small: post.profile_image
                  })}
                  imageSize={PROFILE_IMAGE_MICRO}
                />
                <span className="author-name">{post.author_name}</span>
              </Link>
              {post.author_headline ? (
                <React.Fragment>
                  <span className="author-headline separator">
                    &nbsp;&#8212;&nbsp;
                  </span>
                  <span className="author-headline">
                    {post.author_headline}
                  </span>
                </React.Fragment>
              ) : null}
            </div>
            <div className="right date">{formattedDate}</div>
          </div>
          {embedly && embedly.provider_name ? (
            <div className="provider-name">{embedly.provider_name}</div>
          ) : null}
          {post && post.url ? <Embedly embedly={embedly} /> : null}
        </div>
        {!showPermalinkUI && (post.text || post.article_content)
          ? this.renderTextOrArticleContent()
          : null}
        {R.has(editPostKey(post), forms) ? null : this.postActionButtons()}
      </div>
    )
  }
}
