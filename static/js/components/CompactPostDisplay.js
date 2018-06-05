// @flow
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import Card from "./Card"
import DropdownMenu from "./DropdownMenu"

import { channelURL, postDetailURL } from "../lib/url"
import {
  PostVotingButtons,
  PostTitleAndHostname,
  getPostDropdownMenuKey
} from "../lib/posts"
import { userIsAnonymous } from "../lib/util"
import { showDropdown, hideDropdownDebounced } from "../actions/ui"

import type { Post } from "../flow/discussionTypes"

export class CompactPostDisplay extends React.Component<*, void> {
  props: {
    post: Post,
    showChannelLink: boolean,
    toggleUpvote: Post => void,
    togglePinPost: Post => void,
    showPinUI: boolean,
    isModerator: boolean,
    removePost?: (p: Post) => void,
    ignorePostReports?: (p: Post) => void,
    reportPost: (p: Post) => void,
    menuOpen: boolean,
    showPostMenu: Function,
    hidePostMenu: Function
  }

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
      showPostMenu,
      hidePostMenu,
      menuOpen
    } = this.props
    const formattedDate = moment(post.created).fromNow()

    return (
      <Card
        className={`compact-post-summary ${
          post.stickied && showPinUI ? "sticky" : ""
        }`}
      >
        <div className="row title-row">
          <Link to={postDetailURL(post.channel_name, post.id)}>
            <div className="post-title">
              <PostTitleAndHostname post={post} />
            </div>
          </Link>
          {post.url ? (
            <a href={post.url} target="_blank">
              <i className="material-icons open_in_new">open_in_new</i>
            </a>
          ) : (
            <i className="material-icons notes">notes</i>
          )}
        </div>
        <div className="row">
          <div className="authored-by">
            <div className="author-name">{post.author_name}</div>
            <div className="date">
              {formattedDate}
              {this.showChannelLink()}
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <PostVotingButtons post={post} toggleUpvote={toggleUpvote} />
          </div>
          <div className="comments-and-menu">
            <Link
              className="comment-link"
              to={postDetailURL(post.channel_name, post.id)}
            >
              <i className="material-icons chat_bubble_outline">
                chat_bubble_outline
              </i>
              {post.num_comments}
            </Link>
            {userIsAnonymous() ? null : (
              <i
                className="material-icons more_vert"
                onClick={menuOpen ? null : showPostMenu}
              >
                more_vert
              </i>
            )}
            {menuOpen ? (
              <DropdownMenu closeMenu={hidePostMenu}>
                {post.num_reports ? (
                  <li>
                    <div className="report-count">
                      Reports: {post.num_reports}
                    </div>
                  </li>
                ) : null}
                {showPinUI && post.text && isModerator ? (
                  <li>
                    <a onClick={() => togglePinPost(post)}>
                      {post.stickied ? "unpin" : "pin"}
                    </a>
                  </li>
                ) : null}
                {isModerator && removePost ? (
                  <li>
                    <a onClick={() => removePost(post)}>remove</a>
                  </li>
                ) : null}
                {isModerator && ignorePostReports ? (
                  <li>
                    <a onClick={() => ignorePostReports(post)}>
                      ignore all reports
                    </a>
                  </li>
                ) : null}
                {!userIsAnonymous() ? (
                  <li>
                    <a onClick={() => reportPost(post)}>report</a>
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

const mapDispatchToProps = (dispatch, ownProps) => {
  const { post } = ownProps
  const postMenuKey = getPostDropdownMenuKey(post)

  return {
    showPostMenu: () => dispatch(showDropdown(postMenuKey)),
    hidePostMenu: () => dispatch(hideDropdownDebounced(postMenuKey))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CompactPostDisplay)
