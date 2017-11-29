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

export type Post = {
  id:            string,
  author_id:     string,
  score:         number,
  upvoted:       boolean,
  created:       string,
  profile_image: string,
  author_name:   string,
  title:         string,
  url:           ?string,
  text:          ?string,
  num_comments:  number,
  channel_name:  string,
  channel_title: string,
  edited:        boolean,
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

export type Comment = {
  id:            string,
  author_id:     string,
  score:         number,
  upvoted:       boolean,
  created:       string,
  profile_image: string,
  author_name:   string,
  post_id:       string,
  text:          string,
  downvoted:     boolean,
  replies:       Array<Comment>,
  edited:        boolean,
}

export type CommentForm = {
  post_id:      string,
  comment_id?:  string,
  text:         string,
}

export type Moderator = {
  moderator_name: string,
}

export type ChannelModerators = Array<Moderator>
