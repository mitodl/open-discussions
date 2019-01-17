// @flow
/* global SETTINGS:false */
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"
import Dotdotdot from "react-dotdotdot"

import Card from "./Card"
import DropdownMenu from "./DropdownMenu"
import ReportCount from "./ReportCount"
import PostUpvoteButton from "./PostUpvoteButton"

import {
  channelURL,
  embedlyThumbnail,
  postDetailURL,
  profileURL
} from "../lib/url"
import {
  PostTitleAndHostname,
  getPostDropdownMenuKey,
  postMenuDropdownFuncs,
  getTextContent,
  POST_PREVIEW_LINES,
  EMBEDLY_THUMB_HEIGHT,
  EMBEDLY_THUMB_WIDTH
} from "../lib/posts"
import { userIsAnonymous } from "../lib/util"
import { LINK_TYPE_LINK } from "../lib/channels"

import type { Dispatch } from "redux"
import type { Post } from "../flow/discussionTypes"

type Props = {
  post: Post,
  showChannelLink?: boolean,
  toggleUpvote?: Post => void,
  togglePinPost?: ?(post: Post) => Promise<*>,
  showPinUI?: boolean,
  isModerator: boolean,
  removePost?: ?(post: Post) => void,
  ignorePostReports?: (post: Post) => Promise<*>,
  reportPost?: ?(post: Post) => void,
  menuOpen: boolean,
  useSearchPageUI?: boolean,
  dispatch: Dispatch<*>
}

export class CompactPostDisplay extends React.Component<Props> {
  showChannelLink = () => {
    const { post, showChannelLink } = this.props

    return showChannelLink && post.channel_name ? (
      <span>
        {" "}
        in{" "}
        <Link className="navy" to={channelURL(post.channel_name)}>
          {post.channel_title}
        </Link>
      </span>
    ) : null
  }

  renderFooterContents() {
    const {
      dispatch,
      post,
      toggleUpvote,
      showPinUI,
      togglePinPost,
      isModerator,
      removePost,
      ignorePostReports,
      reportPost,
      menuOpen,
      useSearchPageUI
    } = this.props

    const { showPostMenu, hidePostMenu } = postMenuDropdownFuncs(dispatch, post)

    return (
      <React.Fragment>
        <PostUpvoteButton post={post} toggleUpvote={toggleUpvote} />
        <Link
          className="comment-link grey-surround"
          to={postDetailURL(post.channel_name, post.id, post.slug)}
        >
          <i className="material-icons chat_bubble_outline">
            chat_bubble_outline
          </i>
          <span>{post.num_comments}</span>
        </Link>
        {userIsAnonymous() || useSearchPageUI ? null : (
          <i
            className="material-icons more_vert post-menu-button grey-surround"
            onClick={menuOpen ? null : showPostMenu}
          >
            more_vert
          </i>
        )}
        <ReportCount count={post.num_reports} />
        {menuOpen ? (
          <DropdownMenu
            closeMenu={hidePostMenu}
            className="post-comment-dropdown"
          >
            {showPinUI && isModerator && togglePinPost ? (
              <li>
                <a onClick={() => togglePinPost(post)}>
                  {post.stickied ? "Unpin" : "Pin"}
                </a>
              </li>
            ) : null}
            {isModerator && removePost ? (
              <li>
                <a onClick={() => removePost(post)}>Remove</a>
              </li>
            ) : null}
            {isModerator && ignorePostReports ? (
              <li>
                <a onClick={() => ignorePostReports(post)}>Ignore reports</a>
              </li>
            ) : null}
            {!userIsAnonymous() && reportPost ? (
              <li>
                <a onClick={() => reportPost(post)}>Report</a>
              </li>
            ) : null}
          </DropdownMenu>
        ) : null}
      </React.Fragment>
    )
  }

  render() {
    const { post, showPinUI } = this.props

    const formattedDate = moment(post.created).fromNow()
    const previewText = getTextContent(post)

    return (
      <Card
        className={`compact-post-summary ${
          post.stickied && showPinUI ? "sticky" : ""
        }`}
      >
        <div className="column1">
          <div className="preview-body">
            <div className="row title-row">
              {post.stickied && showPinUI ? (
                <img
                  className="pin"
                  src="/static/images/pinnned-post-icon.svg"
                />
              ) : null}
              <Link
                to={postDetailURL(post.channel_name, post.id, post.slug)}
                className="navy no-underline"
              >
                <div className="post-title">
                  <PostTitleAndHostname post={post} />
                </div>
              </Link>
            </div>
            {previewText ? (
              <div className="row">
                <Dotdotdot clamp={POST_PREVIEW_LINES} className="preview">
                  {previewText}
                </Dotdotdot>
              </div>
            ) : null}
            <div className="row author-row">
              <div className="authored-by">
                <div>
                  <Link to={profileURL(post.author_id)} className="navy">
                    <span className="author-name">{post.author_name}</span>
                  </Link>
                  {post.author_headline ? (
                    <span className="author-headline">
                      &nbsp;&#8212;&nbsp;
                      {post.author_headline}
                    </span>
                  ) : null}
                </div>
                <div className="date">
                  <Link
                    to={postDetailURL(post.channel_name, post.id, post.slug)}
                    className="grey"
                  >
                    <span>{formattedDate}</span>
                  </Link>
                  {this.showChannelLink()}
                </div>
              </div>
            </div>
          </div>
          <div className="preview-footer">{this.renderFooterContents()}</div>
        </div>
        {post.post_type === LINK_TYPE_LINK || post.thumbnail ? (
          <div
            className={`column2 ${post.thumbnail ? "link-thumbnail" : ""} ${
              post.post_type === LINK_TYPE_LINK ? "external-link" : ""
            }`}
          >
            {post.post_type === LINK_TYPE_LINK ? (
              <React.Fragment>
                <div className="top-right">
                  <a href={post.url} target="_blank" rel="noopener noreferrer">
                    <i className="material-icons open_in_new top-right overlay-icon">
                      open_in_new
                    </i>
                  </a>
                </div>
                {post.thumbnail ? (
                  <a href={post.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={embedlyThumbnail(
                        SETTINGS.embedlyKey,
                        post.thumbnail,
                        EMBEDLY_THUMB_HEIGHT,
                        EMBEDLY_THUMB_WIDTH
                      )}
                    />
                  </a>
                ) : null}
              </React.Fragment>
            ) : (
              <img src={post.thumbnail} />
            )}
          </div>
        ) : null}
      </Card>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { post } = ownProps
  const { dropdownMenus } = state.ui

  const postMenuKey = getPostDropdownMenuKey(post)
  const menuOpen = dropdownMenus.has(postMenuKey)

  return { menuOpen }
}

export default connect(mapStateToProps)(CompactPostDisplay)
