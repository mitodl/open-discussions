// @flow
/* global SETTINGS: false */
import React from "react"
import moment from "moment"
import R from "ramda"
import { Link } from "react-router-dom"

import { EditPostForm } from "./CommentForms"
import { renderTextContent } from "./Markdown"
import Embedly from "./Embedly"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"
import DropdownMenu from "./DropdownMenu"
import SharePopup from "./SharePopup"

import { formatPostTitle, PostVotingButtons } from "../lib/posts"
import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
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
  renderTextContent = () => {
    const { forms, post } = this.props

    return R.has(editPostKey(post), forms) ? (
      <EditPostForm post={post} editing />
    ) : (
      renderTextContent(post)
    )
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

  postSubscriptionButton = () => {
    const { toggleFollowPost, post } = this.props
    return post.subscribed ? (
      <div
        className="post-action subscribed"
        onClick={preventDefaultAndInvoke(() => {
          toggleFollowPost(post)
        })}
      >
        <i className="material-icons rss_feed">rss_feed</i>
        Unfollow
      </div>
    ) : (
      <div
        className="post-action unsubscribed"
        onClick={preventDefaultAndInvoke(() => {
          toggleFollowPost(post)
        })}
      >
        <i className="material-icons rss_feed">rss_feed</i>
        Follow
      </div>
    )
  }

  postActionButtons = () => {
    const {
      toggleUpvote,
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
          <PostVotingButtons
            post={post}
            className="expanded"
            toggleUpvote={toggleUpvote}
          />
        </div>
        <div className="right">
          {SETTINGS.username === post.author_id && post.text ? (
            <div
              className="post-action edit-post"
              onClick={beginEditing(editPostKey(post), post)}
            >
              <i className="material-icons edit">edit</i>
              Edit
            </div>
          ) : null}
          <div className="post-action share-action">
            <div onClick={showPostShareMenu}>
              <i className="material-icons reply">reply</i>
              Share
            </div>
            {postShareMenuOpen ? (
              <SharePopup
                url={postPermalink(post)}
                closePopup={hidePostShareMenu}
                hideSocialButtons={channel.channel_type === "private"}
              />
            ) : null}
          </div>
          {userIsAnonymous() ? null : this.postSubscriptionButton()}
          {userIsAnonymous() ? null : (
            <i
              className="material-icons more_vert"
              onClick={postDropdownMenuOpen ? null : showPostMenu}
            >
              more_vert
            </i>
          )}
          {postDropdownMenuOpen ? (
            <DropdownMenu closeMenu={hidePostMenu}>
              {post.num_reports ? (
                <div className="report-count">Reports: {post.num_reports}</div>
              ) : null}
              {SETTINGS.username === post.author_id ? (
                <li className="comment-action-button delete-post">
                  <a onClick={showPostDeleteDialog} href="#">
                    delete
                  </a>
                </li>
              ) : null}
              {isModerator && !post.removed ? (
                <li className="comment-action-button remove-post">
                  <a onClick={this.removePost.bind(this)} href="#">
                    remove
                  </a>
                </li>
              ) : null}
              {isModerator && post.removed ? (
                <li className="comment-action-button approve-post">
                  <a onClick={this.approvePost.bind(this)} href="#">
                    approve
                  </a>
                </li>
              ) : null}
              {!userIsAnonymous() ? (
                <li className="comment-action-button report-post">
                  <a onClick={showPostReportDialog} href="#">
                    report
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
      <div className="post-summary expanded">
        <div className="summary">
          <div className="post-title">{formatPostTitle(post)}</div>
          <div className="authored-by">
            <Link className="left" to={profileURL(post.author_id)}>
              <ProfileImage
                profile={makeProfile({
                  name:                post.author_name,
                  profile_image_small: post.profile_image
                })}
                imageSize={PROFILE_IMAGE_MICRO}
              />
              <div className="author-name">{post.author_name}</div>
            </Link>
            <div className="right">{formattedDate}</div>
          </div>
          {embedly && embedly.provider_name ? (
            <div className="provider-name">{embedly.provider_name}</div>
          ) : null}
          {post && post.url ? <Embedly embedly={embedly} /> : null}
        </div>
        {!showPermalinkUI && post.text ? this.renderTextContent() : null}
        {R.has(editPostKey(post), forms) ? null : this.postActionButtons()}
      </div>
    )
  }
}
