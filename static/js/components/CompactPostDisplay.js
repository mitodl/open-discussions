// @flow
/* global SETTINGS:false */
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

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
  postMenuDropdownFuncs
} from "../lib/posts"
import { userIsAnonymous } from "../lib/util"

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
  dispatch: Dispatch<*>
}

export class CompactPostDisplay extends React.Component<Props> {
  showChannelLink = () => {
    const { post, showChannelLink } = this.props

    return showChannelLink && post.channel_name ? (
      <span>
        {" "}
        in <Link to={channelURL(post.channel_name)}>{post.channel_title}</Link>
      </span>
    ) : null
  }

  render() {
    const {
      post,
      toggleUpvote,
      showPinUI,
      togglePinPost,
      isModerator,
      removePost,
      ignorePostReports,
      reportPost,
      menuOpen,
      dispatch
    } = this.props
    const formattedDate = moment(post.created).fromNow()
    const { showPostMenu, hidePostMenu } = postMenuDropdownFuncs(dispatch, post)

    return (
      <Card
        className={`compact-post-summary ${
          post.stickied && showPinUI ? "sticky" : ""
        }`}
      >
        <div className="row post-toprow">
          <div className="column1">
            <div className="row title-row">
              <Link to={postDetailURL(post.channel_name, post.id, post.slug)}>
                <div className="post-title">
                  <PostTitleAndHostname post={post} />
                </div>
              </Link>
            </div>
            <div className="row">
              <div className="authored-by">
                <div>
                  <Link to={profileURL(post.author_id)}>
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
                  >
                    <span>{formattedDate}</span>
                  </Link>
                  {this.showChannelLink()}
                </div>
              </div>
            </div>
          </div>
          {post.url ? (
            <div
              className={`column2 ${post.thumbnail ? "link-thumbnail" : ""}`}
            >
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
                      103,
                      201
                    )}
                  />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="row">
          <div className="upvote-report-count">
            <PostUpvoteButton post={post} toggleUpvote={toggleUpvote} />
            <ReportCount count={post.num_reports} />
          </div>
          <div className="comments-and-menu">
            <Link
              className="comment-link grey-surround"
              to={postDetailURL(post.channel_name, post.id, post.slug)}
            >
              <i className="material-icons chat_bubble_outline">
                chat_bubble_outline
              </i>
              <span>{post.num_comments}</span>
            </Link>
            {userIsAnonymous() ? null : (
              <i
                className="material-icons more_vert post-menu-button grey-surround"
                onClick={menuOpen ? null : showPostMenu}
              >
                more_vert
              </i>
            )}
            {menuOpen ? (
              <DropdownMenu
                closeMenu={hidePostMenu}
                className="post-comment-dropdown"
              >
                {showPinUI && post.text && isModerator && togglePinPost ? (
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
                    <a onClick={() => ignorePostReports(post)}>
                      Ignore reports
                    </a>
                  </li>
                ) : null}
                {!userIsAnonymous() && reportPost ? (
                  <li>
                    <a onClick={() => reportPost(post)}>Report</a>
                  </li>
                ) : null}
              </DropdownMenu>
            ) : null}
          </div>
        </div>
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
