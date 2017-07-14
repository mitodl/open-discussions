// @flow
export type Channel = {
  id: string,
  name: string,
  title: string,
};

export type ChannelState = {
  channel: ?Channel,
};

// common fields among both types of posts
type PostBase = {
    id: string,
    title: string,
    author: string,  // username
    upvotes: number,
    downvotes: number,
    upvoted: boolean,
    downvoted: boolean,
};

export type LinkPost = PostBase & {
  url: string,
};

export type UrlPost = PostBase & {
  text: string,
};

export type Post = LinkPost | UrlPost;

export type PostsState = {
  post: ?Post,
  posts: ?Array<Post>,
};
