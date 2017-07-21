// @flow
export type Channel = {
  id: string,
  name: string,
  title: string,
};

export type ChannelState = {
  channel: ?Channel,
};

// Post type
export type Post = {
  id: string,
  title: string,
  author: string,  // username
  upvotes: number,
  downvotes: number,
  upvoted: boolean,
  downvoted: boolean,
  url: ?string,
  text: ?string,
  created: string,
  num_comments: number,
};

export type PostsState = {
  post: ?Post,
  posts: ?Array<Post>,
};
