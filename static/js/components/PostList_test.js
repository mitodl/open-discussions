// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';

import PostList from './PostList';
import PostSummary from './PostSummary';
import { makeChannelPostList } from '../factories/posts';

describe('PostList', () => {
  const renderPostList = (props = {posts: makeChannelPostList()}) => shallow(
    <PostList {...props} />
  );

  it('should render a list of posts', () => {
    let wrapper = renderPostList();
    assert.lengthOf(wrapper.find(PostSummary), 20);
  });

  it('should behave well if handed an empty list', () => {
    let wrapper = renderPostList({ posts: []});
    assert.lengthOf(wrapper.find(PostSummary), 0);
  });

  it('should pass the showChannelLinks prop to PostSummary', () => {
    let wrapper = renderPostList(
      { posts: makeChannelPostList(), showChannelLinks: true }
    );
    wrapper.find(PostSummary).forEach(postSummary => {
      assert.isTrue(postSummary.props().showChannelLink);
    });
  });
});
