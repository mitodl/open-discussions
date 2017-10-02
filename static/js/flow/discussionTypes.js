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

export type AuthoredContent = {
  id:            string,
  author_id:     string,
  score:         number,
  upvoted:       boolean,
  created:       string,
  profile_image: string,
  author_name:   string,
};

export type Post = AuthoredContent & {
  title:         string,
  url:           ?string,
  text:          ?string,
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

export type Comment = AuthoredContent & {
  post_id:       string,
  text:          string,
  downvoted:     boolean,
  replies:       Array<Comment>,
}

export type CommentForm = {
  post_id:      string,
  comment_id?:  string,
  text:         string,
}
