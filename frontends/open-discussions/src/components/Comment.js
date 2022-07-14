// @flow
/* global SETTINGS: false */
import React, { useState, useCallback } from "react"
import moment from "moment"
import { Link } from "react-router-dom"
import { useDispatch } from "react-redux"

import Dialog from "./Dialog"
import ReportCount from "./ReportCount"
import { Card } from "ol-util"
import CommentForm from "./CommentForm"
import CommentVoteForm from "./CommentVoteForm"
import CommentRemovalForm from "./CommentRemovalForm"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "./ProfileImage"
import DropdownMenu from "./DropdownMenu"
import ReplyButton from "./ReplyButton"
import ShareTooltip from "./ShareTooltip"
import { renderTextContent } from "./Markdown"
import CommentReportDialog from "./CommentReportDialog"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
import { makeProfile } from "../lib/profile"
import { profileURL, absolutizeURL } from "../lib/url"
import { toggleFollowComment } from "../util/api_actions"
import { useCommentModeration } from "../hooks/comments"

import type { Post } from "../flow/discussionTypes"

type Props = {
  comment: Object, // I swear this is easier
  post?: Post,
  commentPermalink: Function,
  atMaxDepth?: boolean,
  children?: React$Node,
  shouldGetReports?: boolean,
  channelName?: string,
  moderationUI?: boolean,
  useSearchPageUI?: boolean,
  isPrivateChannel?: boolean,
  isModerator: boolean
}

export default function Comment(props: Props) {
  const {
    commentPermalink,
    post,
    comment,
    atMaxDepth,
    children,
    shouldGetReports,
    channelName,
    moderationUI,
    useSearchPageUI,
    isPrivateChannel,
    isModerator
  } = props

  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [commentMenuOpen, setCommentMenuOpen] = useState(false)

  const dispatch = useDispatch()
  const toggleFollowCommentCB = useCallback(
    comment => {
      toggleFollowComment(dispatch, comment)
    },
    [dispatch]
  )

  const [commentRemoveDialogOpen, setCommentRemoveDialogOpen] = useState(false)
  const [commentDeleteDialogOpen, setCommentDeleteDialogOpen] = useState(false)
  const [commentReportDialogOpen, setCommentReportDialogOpen] = useState(false)

  const { ignoreReports, removeComment, approveComment, deleteComment } =
    useCommentModeration(shouldGetReports, channelName)

  return (
    <div className={`comment ${comment.removed ? "removed" : ""}`}>
      {commentRemoveDialogOpen ? (
        <Dialog
          id="remove-comment-dialog"
          open={commentRemoveDialogOpen}
          onAccept={() => removeComment(comment)}
          hideDialog={() => setCommentRemoveDialogOpen(false)}
          submitText="Yes, remove"
          title="Remove Comment"
        >
          <p>
            Are you sure? You will still be able to see the comment, but it will
            be deleted for normal users. You can undo this later by clicking
            "approve".
          </p>
        </Dialog>
      ) : null}
      {commentDeleteDialogOpen ? (
        <Dialog
          id="comment-delete-dialog"
          open={commentDeleteDialogOpen}
          hideDialog={() => setCommentDeleteDialogOpen(false)}
          onAccept={async () => {
            if (post) {
              await deleteComment(comment, post)
            }
            setCommentDeleteDialogOpen(false)
          }}
          title="Delete Comment"
          submitText="Yes, Delete"
        >
          Are you sure you want to delete this comment?
        </Dialog>
      ) : null}
      {commentReportDialogOpen ? (
        <CommentReportDialog
          comment={comment}
          hideDialog={() => setCommentReportDialogOpen(false)}
        />
      ) : null}
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
            {editing && post ? (
              <CommentForm
                comment={comment}
                post={post}
                closeReply={() => {
                  setEditing(false)
                }}
                editing
                autoFocus
              />
            ) : (
              renderTextContent(comment)
            )}
          </div>
          {replying && post ? (
            <div>
              <CommentForm
                post={post}
                comment={comment}
                closeReply={() => {
                  setReplying(false)
                }}
                autoFocus
              />
            </div>
          ) : null}
          <div className="row comment-actions">
            <CommentVoteForm comment={comment} />
            {atMaxDepth ||
            moderationUI ||
            comment.deleted ||
            useSearchPageUI ? null : (
                <ReplyButton
                  beginEditing={e => {
                    e.preventDefault()
                    setReplying(true)
                  }}
                />
              )}
            {useSearchPageUI ? null : (
              <ShareTooltip
                url={absolutizeURL(commentPermalink(comment.id))}
                hideSocialButtons={isPrivateChannel}
                objectType="comment"
              >
                <div className="share-button-wrapper">
                  <div className="comment-action-button share-button">
                    share
                  </div>
                </div>
              </ShareTooltip>
            )}
            {!userIsAnonymous() && !useSearchPageUI ? (
              <div>
                <i
                  className="material-icons more_vert"
                  onClick={() => setCommentMenuOpen(true)}
                >
                  more_vert
                </i>
                {commentMenuOpen ? (
                  <DropdownMenu
                    closeMenu={() => setCommentMenuOpen(false)}
                    className="post-comment-dropdown"
                  >
                    <li>
                      <div
                        className={`comment-action-button subscribe-comment ${
                          comment.subscribed ? "subscribed" : "unsubscribed"
                        }`}
                        onClick={preventDefaultAndInvoke(() => {
                          toggleFollowCommentCB(comment)
                        })}
                      >
                        <a href="#">
                          {comment.subscribed ? "Unfollow" : "Follow"}
                        </a>
                      </div>
                    </li>
                    {SETTINGS.username === comment.author_id &&
                    !moderationUI ? (
                        <li>
                          <div
                            className="comment-action-button edit-button"
                            onClick={e => {
                              e.preventDefault()
                              setEditing(true)
                            }}
                          >
                            <a href="#">Edit</a>
                          </div>
                        </li>
                      ) : null}
                    {SETTINGS.username === comment.author_id ? (
                      <li>
                        <div
                          className="comment-action-button delete-button"
                          onClick={preventDefaultAndInvoke(() =>
                            setCommentDeleteDialogOpen(true)
                          )}
                        >
                          <a href="#">Delete</a>
                        </div>
                      </li>
                    ) : null}
                    {comment.num_reports && ignoreReports ? (
                      <li>
                        <div
                          className="comment-action-button ignore-button"
                          onClick={preventDefaultAndInvoke(() =>
                            ignoreReports(comment)
                          )}
                        >
                          <a href="#">Ignore reports</a>
                        </div>
                      </li>
                    ) : null}
                    <li>
                      <CommentRemovalForm
                        comment={comment}
                        remove={() => setCommentRemoveDialogOpen(true)}
                        approve={approveComment}
                        isModerator={isModerator}
                      />
                    </li>
                    {moderationUI ? null : (
                      <li>
                        <div
                          className="comment-action-button report-button"
                          onClick={preventDefaultAndInvoke(() =>
                            setCommentReportDialogOpen(true)
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
        </div>
      </Card>
      {children}
    </div>
  )
}
