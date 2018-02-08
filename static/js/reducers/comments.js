// @flow
import R from "ramda"
import {
  GET,
  PATCH,
  POST,
  DELETE,
  INITIAL_STATE
} from "redux-hammock/constants"

import { REPLACE_MORE_COMMENTS } from "../actions/comment"
import { findComment } from "../lib/comments"
import * as api from "../lib/api"

import type { Action } from "../flow/reduxTypes"
import type {
  GenericComment,
  CommentFromAPI,
  CommentInTree,
  MoreCommentsFromAPI,
  MoreCommentsInTree,
  ReplaceMoreCommentsPayload
} from "../flow/discussionTypes"

/**
 * Remove the more_comments instance at the level of the parentId
 */
const removeMoreComments = (
  oldTree: Array<GenericComment>,
  parentId: string
) => {
  // first we need to remove the existing more_comments instances. There should be exactly one at the level we are at
  if (parentId) {
    const commentLens = findComment(oldTree, parentId)
    if (!commentLens) {
      throw new Error("Unable to find parent id for comment to update")
    }

    const comment = R.view(commentLens, oldTree)
    const newReplies = comment.replies.filter(
      comment => comment.comment_type === "comment"
    )
    return R.set(commentLens, { ...comment, replies: newReplies }, oldTree)
  } else {
    return oldTree.filter(comment => comment.comment_type === "comment")
  }
}

const deleted = R.always("[deleted]")

const deleteComment = (oldTree: Array<GenericComment>, commentId: string) =>
  R.over(
    findComment(oldTree, commentId),
    R.evolve({
      author_name: deleted,
      text:        deleted,
      author_id:   deleted,
      deleted:     true
    }),
    oldTree
  )

/**
 * Replace an instance of MoreComments with some series of comments from the morecomments API
 */
const replaceMoreComments = (
  oldTree: Array<GenericComment>,
  parentId: string,
  comments: Array<CommentFromAPI | MoreCommentsFromAPI>
) => {
  // First remove the more_comments instance at the parentId level
  let filteredTree = removeMoreComments(oldTree, parentId)

  // now add each comment
  for (const comment of comments) {
    filteredTree = appendCommentToTree(
      filteredTree,
      comment,
      comment.parent_id,
      true
    )
  }

  return filteredTree
}

const addReply = (
  replies: Array<GenericComment>,
  comment: GenericComment,
  appendToEnd: boolean
): Array<GenericComment> =>
  appendToEnd ? [...replies, comment] : [comment, ...replies]

/**
 * Append a comment to the tree in the right place
 */
const appendCommentToTree = (
  tree: Array<GenericComment>,
  comment: CommentFromAPI | MoreCommentsFromAPI,
  parentId: ?string,
  appendToEnd: boolean
): Array<GenericComment> => {
  let newComment: GenericComment

  if (comment.comment_type === "comment") {
    const copy: CommentInTree = { ...comment, replies: [] }
    newComment = copy
  } else if (comment.comment_type === "more_comments") {
    const copy: MoreCommentsInTree = { ...comment }
    newComment = copy
  } else {
    throw new Error("Unexpected comment_type")
  }

  if (!parentId) {
    return addReply(tree, newComment, appendToEnd)
  }

  const lens = findComment(tree, parentId)
  if (!lens) {
    // should probably not get to this point, the original comment should still be present
    // if the API returned a message saying that the reply was successful
    return tree
  }

  let treeComment = R.view(lens, tree)
  const replies = addReply(treeComment.replies, newComment, appendToEnd)
  treeComment = { ...treeComment, replies }
  return R.set(lens, treeComment, tree)
}

/**
 * Modify a comment with updated data
 */
const updateCommentTree = (
  tree: Array<GenericComment>,
  updatedComment: CommentFromAPI
): Array<GenericComment> => {
  const lens = findComment(tree, updatedComment.id)
  if (lens === null) {
    return tree
  }

  const original = R.view(lens, tree)
  const replies = original.replies
  updatedComment = ({ ...updatedComment, replies }: CommentInTree)

  return R.set(lens, updatedComment, tree)
}

/**
 * Create a comment tree from scratch using a flat list of comments from the API
 */
export const createCommentTree = (
  responseData: Array<CommentFromAPI | MoreCommentsFromAPI>
): Array<GenericComment> => {
  // responseData should not be modified by this function.
  // tree and lookup contain copies of the data from responseData.
  // However tree and lookup contain references to the same object,
  // so that something like lookup[commentId].replies.push(newComment) will update both data structures
  const tree: Array<GenericComment> = []
  const lookup = {}

  for (const commentResponse of responseData) {
    // be careful not to modify commentResponse, modify copy instead
    let copy: GenericComment

    if (commentResponse.comment_type === "comment") {
      // more_comments type comments don't have an id field
      const copyComment: CommentInTree = {
        ...commentResponse,
        replies: []
      }
      copy = copyComment

      lookup[commentResponse.id] = copy
    } else if (commentResponse.comment_type === "more_comments") {
      const copyComment: MoreCommentsInTree = { ...commentResponse }
      copy = copyComment
    } else {
      throw new Error("Unexpected comment_type")
    }

    const parentId = commentResponse.parent_id

    if (parentId && lookup[parentId]) {
      lookup[parentId].replies.push(copy)
    } else {
      tree.push(copy)
    }
  }

  return tree
}

type CreateCommentPayload = {
  commentId: ?string,
  postId: string,
  comment: CommentFromAPI
}

type GetCommentsPayload = {
  comments: Array<CommentFromAPI | MoreCommentsFromAPI>,
  postId: string
}

type DeleteCommentPayload = {
  commentId: string,
  postId: string
}

type CommentData = Map<string, Array<GenericComment>>

export const commentsEndpoint = {
  name:    "comments",
  verbs:   [GET, PATCH, POST, DELETE],
  getFunc: async (
    postId: string,
    commentId?: string,
    params?: Object
  ): Promise<GetCommentsPayload> => {
    const comments = commentId
      ? await api.getComment(commentId)
      : await api.getComments(postId, params || {})

    return {
      postId:   postId,
      comments: comments
    }
  },
  deleteFunc: async (postId: string, commentId: string): Promise<*> => {
    await api.deleteComment(commentId)
    return { postId, commentId }
  },
  deleteSuccessHandler: (
    { commentId, postId }: DeleteCommentPayload,
    data: CommentData
  ): CommentData => {
    const update = new Map(data)
    const tree = data.get(postId)
    if (tree) {
      update.set(postId, deleteComment(tree, commentId))
    }
    return update
  },
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler: (
    response: GetCommentsPayload,
    data: CommentData
  ): CommentData => {
    const update = new Map(data)
    update.set(response.postId, createCommentTree(response.comments))
    return update
  },
  postFunc: async (
    postId: string,
    text: string,
    commentId: ?string
  ): Promise<CreateCommentPayload> => {
    const comment = await api.createComment(postId, text, commentId)
    return { postId, commentId, comment }
  },
  postSuccessHandler: (
    { commentId, postId, comment }: CreateCommentPayload,
    data: CommentData
  ): CommentData => {
    const update = new Map(data)
    const oldTree = data.get(postId)
    if (oldTree) {
      update.set(
        postId,
        appendCommentToTree(oldTree, comment, commentId, false)
      )
    }
    return update
  },
  patchFunc: (commentId: string, payload: Object) =>
    api.updateComment(commentId, payload),
  patchSuccessHandler: (
    response: CommentFromAPI,
    data: CommentData
  ): CommentData => {
    const update = new Map(data)
    const postId = response.post_id
    const oldTree = data.get(postId)
    if (oldTree) {
      update.set(postId, updateCommentTree(oldTree, response))
    }
    return update
  },
  extraActions: {
    [REPLACE_MORE_COMMENTS]: (
      state,
      action: Action<ReplaceMoreCommentsPayload, *>
    ) => {
      const update = new Map(state.data)
      const { postId, parentId, comments } = action.payload
      const oldTree = state.data.get(postId)
      if (oldTree) {
        update.set(postId, replaceMoreComments(oldTree, parentId, comments))
      }
      return {
        ...state,
        data: update
      }
    }
  }
}

export const moreCommentsEndpoint = {
  name:    "morecomments",
  verbs:   [GET],
  getFunc: (postId: string, parentId: string | null, children: Array<string>) =>
    api.getMoreComments(postId, parentId, children),
  initialState:      { ...INITIAL_STATE },
  getSuccessHandler: (
    response: Array<CommentFromAPI | MoreCommentsFromAPI>,
    data: Map<string, Array<GenericComment>>
  ) => {
    // no changes to state.
    // Instead the dispatcher should use REPLACE_MORE_COMMENTS to send the results to the comments reducer
    return data
  }
}
