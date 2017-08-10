// @flow

export type ChannelType = "private" | "public";

export type Channel = {
  name:               string,
  title:              string,
  public_description: string,
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
  title:         string,
  author_id:     string,  // username
  score:         number,
  upvoted:       boolean,
  url:           ?string,
  text:          ?string,
  created:       string,
  num_comments:  number,
  channel_name:  string,
}

export type PostForm = {
  isText: boolean,
  text:   string,
  url:    string,
  title:  string,
}

export type CreatePostPayload = {
  url?:  string,
  text?: string,
  title: string,
};

export type Comment = {
  id:        string,
  post_id:   string,
  text:      string,
  score:     number,
  upvoted:   boolean,
  downvoted: boolean,
  created:   string,
  replies:   Array<Comment>,
  author_id: string,
}

export type CommentForm = {
  post_id:      string,
  comment_id?:  string,
  text:         string,
}
