// @flow
import {
  LINK_TYPE_TEXT,
  LINK_TYPE_LINK,
} from "../lib/channels"

import type { LinkType, ChannelType } from "../lib/channels"

export type Channel = {
  name:                string,
  title:               string,
  description:         string,
  public_description:  string,
  channel_type:        ChannelType,
  num_users:           number,
  user_is_contributor: boolean,
  user_is_moderator:   boolean,
  link_type:          LinkType,
  membership_is_managed: boolean,
}

export type ChannelForm = {
  name:               string,
  title:              string,
  description:        string,
  public_description: string,
  channel_type:       ChannelType,
  link_type:          LinkType
}

export type ChannelAppearanceEditValidation = {
  title:              string,
  description:        string,
  public_description: string
}

export type ChannelBasicEditValidation = {
  link_type: string
}

export type AuthoredContent = {
  id:              string,
  author_id:       string,
  score:           number,
  upvoted:         boolean,
  created:         string,
  profile_image:   string,
  author_name:     string,
  edited:          boolean,
  num_reports:     ?number,
  ignore_reports?: boolean,
  subscribed:      boolean
}

export type Post = AuthoredContent & {
  title:         string,
  url:           ?string,
  text:          ?string,
  slug:          string,
  num_comments:  number,
  channel_name:  string,
  channel_title: string,
  stickied:      boolean,
  removed:       boolean
}

type PostFormType =
  | typeof LINK_TYPE_LINK
  | typeof LINK_TYPE_TEXT
  | null

export type PostForm = {
  postType: PostFormType,
  text:     string,
  url:      string,
  title:    string
}

export type PostValidation = {
  text?:      string,
  url?:       string,
  title?:     string,
  channel?:   string,
  post_type?: string
}

export type CreatePostPayload = {
  url?:  string,
  text?: string,
  title: string
}

export type PostListPagination = {
  after:        ?string,
  after_count:  ?number,
  before:       ?string,
  before_count: ?number
}

export type PostListPaginationParams = {
  before: ?string,
  after:  ?string,
  count:  ?number
}

export type PostListData = {
  pagination: PostListPagination,
  postIds:    Array<string>
}

export type PostListResponse = {
  pagination: PostListPagination,
  posts:      Array<Post>
}

type HasParentId = {
  parent_id: ?string
}

export type MoreCommentsFromAPI = HasParentId & {
  post_id:      string,
  children:     Array<string>,
  comment_type: "more_comments"
}

export type CommentFromAPI = AuthoredContent &
  HasParentId & {
    post_id:      string,
    text:         string,
    downvoted:    boolean,
    removed:      boolean,
    deleted:      boolean,
    comment_type: "comment"
  }

export type CommentInTree = CommentFromAPI & {
  replies: Array<GenericComment>
}

export type MoreCommentsInTree = MoreCommentsFromAPI

export type CommentForm = {
  post_id:     string,
  comment_id?: string,
  text:        string
}

// If you're looking for a 'Comment' type this is probably what you want.
// It represents any element in the comment tree stored in the reducer
export type GenericComment = CommentInTree | MoreCommentsInTree

// This is not a data structure from the API, this is for the payload of the action updating the tree in the reducer
export type ReplaceMoreCommentsPayload = {
  comments: Array<CommentFromAPI | MoreCommentsFromAPI>,
  parentId: string,
  postId:   string
}

// The optional fields here are shown only to other moderators
export type Moderator = {
  moderator_name: string,
  email?:         string,
  full_name?:     string
}

export type ChannelModerators = Array<Moderator>

export type Contributor = {
  contributor_name: string,
  email:            string,
  full_name:        string
}

export type ChannelContributors = Array<Contributor>

export type Member = Contributor | Moderator

export type Report = {
  reason: string
}

export type CommentReport = Report & {
  reportType: "comment",
  commentId:  string
}

export type PostReport = Report & {
  reportType: "post",
  postId:     string
}

export type GenericReport = PostReport | CommentReport

export type ReportValidation = {
  reason: string
}

export type PostReportRecord = {
  post:    Post,
  comment: null,
  reasons: Array<string>
}

export type CommentReportRecord = {
  comment: CommentFromAPI,
  post:    null,
  reasons: Array<string>
}

export type ReportRecord = PostReportRecord | CommentReportRecord

export type Profile = {
  name:              string,
  image:             ?string,
  image_small:       ?string,
  image_medium:      ?string,
  image_file:        ?string,
  image_small_file:  ?string,
  image_medium_file: ?string,
  bio:               ?string,
  headline:          ?string,
  username:          string
}

export type ProfileValidation = {
  name: string
}

export type ProfilePayload = {
  name:     string,
  bio:      ?string,
  headline: ?string
}

export type SocialAuth = {
  provider: string,
  email:    ?string
}
