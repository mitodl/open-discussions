// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import moment from "moment"
import { Link } from "react-router-dom"

import ReportCount from "./ReportCount"
import Card from "./Card"
import SpinnerButton from "./SpinnerButton"
import { ReplyToCommentForm, EditCommentForm } from "./CommentForms"
import CommentVoteForm from "./CommentVoteForm"
import CommentRemovalForm from "./CommentRemovalForm"
import { renderTextContent } from "./Markdown"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"
import DropdownMenu from "../components/DropdownMenu"
import ReplyButton from "./ReplyButton"
import SharePopup from "./SharePopup"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
import {
  replyToCommentKey,
  editCommentKey,
  getCommentReplyInitialValue
} from "../components/CommentForms"
import { makeProfile } from "../lib/profile"
import { profileURL, absolutizeURL } from "../lib/url"

import type {
  GenericComment,
  CommentInTree,
  MoreCommentsInTree
} from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { CommentRemoveFunc } from "./CommentRemovalForm"
import type { CommentVoteFunc } from "./CommentVoteForm"

type LoadMoreCommentsFunc = (comment: MoreCommentsInTree) => Promise<*>
type BeginEditingFunc = (fk: string, iv: Object, e: ?Object) => void
type ReportCommentFunc = (comment: CommentInTree) => void

type Props = {
  comments: Array<GenericComment>,
  forms?: FormsState,
  upvote?: CommentVoteFunc,
  downvote?: CommentVoteFunc,
  remove: CommentRemoveFunc,
  approve: CommentRemoveFunc,
  loadMoreComments?: LoadMoreCommentsFunc,
  beginEditing?: BeginEditingFunc,
  isModerator: boolean,
  isPrivateChannel: boolean,
  processing?: boolean,
  deleteComment?: CommentRemoveFunc,
  reportComment?: ReportCommentFunc,
  commentPermalink: (commentID: string) => string,
  moderationUI?: boolean,
  ignoreCommentReports?: (c: CommentInTree) => void,
  toggleFollowComment?: Function,
  curriedDropdownMenufunc: (key: string) => Object,
  dropdownMenus: Set<string>,
  useSearchPageUI?: boolean
}

export const commentDropdownKey = (c: CommentInTree) =>
  `COMMENT_DROPDOWN_${c.id}`

export const commentShareKey = (c: CommentInTree) =>
  `COMMENT_SHARE_MENU_${c.id}`

export default class CommentTree extends React.Component<Props> {
  renderFollowButton = (comment: CommentInTree) => {
    const { toggleFollowComment } = this.props

    return (
      <li>
        <div
          className={`comment-action-button subscribe-comment ${
            comment.subscribed ? "subscribed" : "unsubscribed"
          }`}
          onClick={preventDefaultAndInvoke(() => {
            if (toggleFollowComment) {
              toggleFollowComment(comment)
            }
          })}
        >
          <a href="#">{comment.subscribed ? "Unfollow" : "Follow"}</a>
        </div>
      </li>
    )
  }

  renderCommentActions = (comment: CommentInTree, atMaxDepth: boolean) => {
    const {
      upvote,
      downvote,
      approve,
      remove,
      deleteComment,
      beginEditing,
      isPrivateChannel,
      isModerator,
      reportComment,
      commentPermalink,
      moderationUI,
      ignoreCommentReports,
      curriedDropdownMenufunc,
      dropdownMenus,
      useSearchPageUI
    } = this.props
    const editFormKey = editCommentKey(comment)

    const { showDropdown, hideDropdown } = curriedDropdownMenufunc(
      commentDropdownKey(comment)
    )
    const {
      showDropdown: showShareMenu,
      hideDropdown: hideShareMenu
    } = curriedDropdownMenufunc(commentShareKey(comment))
    const commentMenuOpen = dropdownMenus.has(commentDropdownKey(comment))
    const commentShareOpen = dropdownMenus.has(commentShareKey(comment))

    return (
      <div className="row comment-actions">
        {upvote && downvote ? (
          <CommentVoteForm
            comment={comment}
            upvote={upvote}
            downvote={downvote}
          />
        ) : null}
        {atMaxDepth ||
        moderationUI ||
        comment.deleted ||
        useSearchPageUI ? null : (
            <ReplyButton
              beginEditing={e => {
                if (beginEditing) {
                  beginEditing(
                    replyToCommentKey(comment),
                    getCommentReplyInitialValue(comment),
                    e
                  )
                }
              }}
            />
          )}
        <div className="share-button-wrapper">
          <div
            className="comment-action-button share-button"
            onClick={showShareMenu}
          >
            share
          </div>
          {commentShareOpen ? (
            <SharePopup
              url={absolutizeURL(commentPermalink(comment.id))}
              closePopup={hideShareMenu}
              hideSocialButtons={isPrivateChannel}
            />
          ) : null}
        </div>
        {!userIsAnonymous() && !useSearchPageUI ? (
          <div>
            <i className="material-icons more_vert" onClick={showDropdown}>
              more_vert
            </i>
            {commentMenuOpen ? (
              <DropdownMenu
                closeMenu={hideDropdown}
                className="post-comment-dropdown"
              >
                {userIsAnonymous() ? null : this.renderFollowButton(comment)}
                {SETTINGS.username === comment.author_id && !moderationUI ? (
                  <li>
                    <div
                      className="comment-action-button edit-button"
                      onClick={e => {
                        if (beginEditing) {
                          beginEditing(editFormKey, comment, e)
                        }
                      }}
                    >
                      <a href="#">Edit</a>
                    </div>
                  </li>
                ) : null}
                {SETTINGS.username === comment.author_id && deleteComment ? (
                  <li>
                    <div
                      className="comment-action-button delete-button"
                      onClick={preventDefaultAndInvoke(() =>
                        deleteComment(comment)
                      )}
                    >
                      <a href="#">Delete</a>
                    </div>
                  </li>
                ) : null}
                {comment.num_reports && ignoreCommentReports ? (
                  <li>
                    <div
                      className="comment-action-button ignore-button"
                      onClick={preventDefaultAndInvoke(() =>
                        ignoreCommentReports(comment)
                      )}
                    >
                      <a href="#">Ignore reports</a>
                    </div>
                  </li>
                ) : null}
                <li>
                  <CommentRemovalForm
                    comment={comment}
                    remove={remove}
                    approve={approve}
                    isModerator={isModerator}
                  />
                </li>
                {moderationUI || userIsAnonymous() || !reportComment ? null : (
                  <li>
                    <div
                      className="comment-action-button report-button"
                      onClick={preventDefaultAndInvoke(() =>
                        reportComment(comment)
                      )}
                    >
                      <a href="#">Report</a>
                    </div>
                  </li>
                )}
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
        <ReportCount count={comment.num_reports} />
      </div>
    )
  }

  renderComment = (depth: number, comment: CommentInTree) => {
    const { forms, processing, commentPermalink } = this.props
    const editFormKey = editCommentKey(comment)
    // ramda can't determine arity here so use curryN
    const renderGenericComment = R.curryN(2, this.renderGenericComment)(
      depth + 1
    )

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth

    return (
      <div
        className={`comment ${comment.removed ? "removed" : ""}`}
        key={`comment-${comment.id}`}
      >
        <Card>
          <Link to={profileURL(comment.author_id)}>
            <ProfileImage
              profile={makeProfile({
                name:                comment.author_name,
                username:            SETTINGS.username,
                profile_image_small: comment.profile_image
              })}
              imageSize={PROFILE_IMAGE_MICRO}
            />
          </Link>
          <div className="comment-contents">
            <div className="author-info">
              <Link to={profileURL(comment.author_id)}>
                <span className="author-name">{comment.author_name}</span>
              </Link>
              <Link to={commentPermalink(comment.id)}>
                <span className="authored-date">
                  {moment(comment.created).fromNow()}
                </span>
              </Link>
              <span className="removed-note">
                {comment.removed ? (
                  <span>[comment removed by moderator]</span>
                ) : null}
              </span>
            </div>
            <div className="row text">
              {forms && R.has(editFormKey, forms) ? (
                <EditCommentForm
                  forms={forms}
                  comment={comment}
                  processing={processing}
                  editing
                />
              ) : (
                renderTextContent(comment)
              )}
            </div>
            {atMaxDepth ? null : (
              <div>
                <ReplyToCommentForm
                  forms={forms}
                  comment={comment}
                  processing={processing}
                />
              </div>
            )}
            {this.renderCommentActions(comment, atMaxDepth)}
          </div>
        </Card>
        {atMaxDepth ? null : (
          <div className="replies">
            {R.map(renderGenericComment, comment.replies)}
          </div>
        )}
      </div>
    )
  }

  renderMoreComments = (comment: MoreCommentsInTree) => {
    const { loadMoreComments } = this.props
    return loadMoreComments ? (
      <div
        className="more-comments"
        key={`more-comments-${comment.parent_id || "null"}`} // will be null if parent_id is null, indicating root level
      >
        <SpinnerButton
          className="load-more-comments"
          onClickPromise={() => loadMoreComments(comment)}
        >
          Load More Comments
        </SpinnerButton>
      </div>
    ) : null
  }

  renderGenericComment = (depth: number, comment: GenericComment) => {
    if (comment.comment_type === "comment") {
      return this.renderComment(depth, comment)
    } else if (comment.comment_type === "more_comments") {
      return this.renderMoreComments(comment)
    } else {
      throw new Error("Unexpected comment_type")
    }
  }

  renderTopLevelComment = (comment: GenericComment, idx: number) => {
    return (
      <div className="top-level-comment" key={idx}>
        {this.renderGenericComment(0, comment)}
      </div>
    )
  }

  render() {
    const { comments } = this.props
    return (
      <div className="comments">
        {R.addIndex(R.map)(this.renderTopLevelComment, comments)}
      </div>
    )
  }
}
