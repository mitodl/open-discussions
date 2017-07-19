// @flow
export type Channel = {
  name: string,
  title: string,
  public_description: string,
  theme_type: string,
  num_users: number,
};

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
