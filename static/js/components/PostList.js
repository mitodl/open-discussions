// @flow
import React from 'react';

import PostSummary from './PostSummary';

import type { Post } from '../flow/discussionTypes';

const renderPosts = (posts, showChannelLinks) => posts.map((post, index) => (
  <PostSummary post={post} key={index} showChannelLink={showChannelLinks} />
));

type PostListProps = {
  posts:             Array<Post>,
  showChannelLinks?: boolean,
};

const PostList = (props: PostListProps) => {
  const { posts, showChannelLinks } = props;

  return (
    <div className="post-list">
      { renderPosts(posts, showChannelLinks) }
    </div>
  );
};

export default PostList;
