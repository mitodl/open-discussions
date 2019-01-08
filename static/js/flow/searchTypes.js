// @flow
type ResultCommon = {
  author_avatar_small: string,
  author_headline: ?string,
  author_id: string,
  author_name: string,
}

type RESULT_TYPE_PROFILE = "profile"

export type ProfileResult = ResultCommon & {
  object_type: RESULT_TYPE_PROFILE,
  author_bio: ?string,
  author_avatar_medium: string,
}

type RESULT_TYPE_COMMENT = "comment"

export type CommentResult = ResultCommon & {
  channel_name: string,
  channel_title: string,
  comment_id: string,
  created: string,
  deleted: boolean,
  object_type: RESULT_TYPE_COMMENT,
  parent_comment_id: ?string,
  post_id: string,
  post_slug: string,
  post_title: string,
  removed: boolean,
  score: number,
  text: string,
}

type RESULT_TYPE_POST = "post"

export type PostResult = ResultCommon & {
  article_content: ?Array<Object>,
  article_text: ?string,
  channel_name: string,
  channel_title: string,
  created: string,
  deleted: boolean,
  object_type: RESULT_TYPE_POST,
  num_comments: number,
  post_id: string,
  post_link_url: ?string,
  post_link_thumbnail: ?string,
  post_slug: string,
  post_title: string,
  post_type: string,
  removed: boolean,
  score: number,
  text: string,
}

export type Result = PostResult | CommentResult | ProfileResult

export type SearchInputs = {
  text?: string,
  type?: string,
  incremental: boolean
}

export type SearchParams = {
  type: ?string,
  text: ?string,
  from: number,
  size: number,
  channelName: ?string,
}
