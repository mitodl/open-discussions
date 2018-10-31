// @flow
type ResultCommon = {
  author_avatar_small: string,
  author_headline: ?string,
  author_id: string,
  author_name: string,
}
export type ProfileResult = ResultCommon & {
  object_type: "profile",
  author_bio: ?string,
  author_avatar_medium: string,
}
export type CommentResult = ResultCommon & {
  channel_name: string,
  channel_title: string,
  comment_id: string,
  created: string,
  deleted: boolean,
  object_type: "comment",
  parent_comment_id: ?string,
  post_id: string,
  post_slug: string,
  post_title: string,
  removed: boolean,
  score: number,
  text: string,
}
export type PostResult = ResultCommon & {
  channel_name: string,
  channel_title: string,
  created: string,
  deleted: boolean,
  object_type: "post",
  num_comments: number,
  post_id: string,
  post_link_url: ?string,
  post_link_thumbnail: ?string,
  post_slug: string,
  post_title: string,
  removed: boolean,
  score: number,
  text: string,
}
export type Result = PostResult | CommentResult | ProfileResult
