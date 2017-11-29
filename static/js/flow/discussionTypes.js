// @flow
export type ChannelType = "private" | "public";

export type Channel = {
  name:               string,
  title:              string,
  public_description: ?string,
  description:        ?string,
  channel_type:       ChannelType,
  num_users:          number,
}

export type ChannelForm = {
  name:               string,
  title:              string,
  public_description: string,
  channel_type:       ChannelType,
}

export type AuthoredContent = {
  id:            string,
  author_id:     string,
  score:         number,
  upvoted:       boolean,
  created:       string,
  profile_image: string,
  author_name:   string,
  edited:        boolean,
}

export type Post = AuthoredContent & {
  title:         string,
  url:           ?string,
  text:          ?string,
  num_comments:  number,
  channel_name:  string,
  channel_title: string,
  stickied:      boolean,
}

export type PostForm = {
  isText: boolean,
  text:   string,
  url:    string,
  title:  string,
}

export type PostValidation = {
  text:   string,
  url:    string,
  title:  string,
  channel:string,
}

export type CreatePostPayload = {
  url?:  string,
  text?: string,
  title: string,
};

export type PostListPagination = {
  after: ?string,
  after_count: ?number,
  before: ?string,
  before_count: ?number,
}

export type PostListPaginationParams = {
  before: ?string,
  after: ?string,
  count: ?number,
}

export type PostListData = {
  pagination: PostListPagination,
  postIds: Array<string>
}

export type PostListResponse = {
  pagination: PostListPagination,
  posts: Array<Post>,
}

type HasParentId = {
  parent_id:    ?string,
}

export type MoreCommentsFromAPI = HasParentId & {
  post_id:      string,
  children:     Array<string>,
  comment_type: "more_comments",
}

export type CommentFromAPI = AuthoredContent & HasParentId & {
  post_id:       string,
  text:          string,
  downvoted:     boolean,
  comment_type:  "comment",
}

export type CommentInTree = CommentFromAPI & {
  replies: Array<GenericComment>,
}

export type MoreCommentsInTree = MoreCommentsFromAPI

export type CommentForm = {
  post_id:      string,
  comment_id?:  string,
  text:         string,
}

// If you're looking for a 'Comment' type this is probably what you want.
// It represents any element in the comment tree stored in the reducer
export type GenericComment = CommentInTree | MoreCommentsInTree

// This is not a data structure from the API, this is for the payload of the action updating the tree in the reducer
export type ReplaceMoreCommentsPayload = {
  comments: Array<CommentFromAPI|MoreCommentsFromAPI>,
  parentId: string,
  postId: string,
}

export type Moderator = {
  moderator_name: string,
}

export type ChannelModerators = Array<Moderator>
