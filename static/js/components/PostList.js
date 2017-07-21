// @flow
import React from 'react';
import R from 'ramda';

import PostSummary from './PostSummary';
import type { Post } from '../flow/discussionTypes';

const renderPosts = R.addIndex(R.map)((post, index) => (
  <PostSummary post={post} key={index} />
));

type PostListProps = {
  posts: Array<Post>
};

const PostList = (props: PostListProps) => {
  const { posts } = props;

  return (
    <div className="post-list">
      { renderPosts(posts) }
    </div>
  );
};

export default PostList;
