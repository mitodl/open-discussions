// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';

import PostList from './PostList';
import PostDisplay from './PostDisplay';
import { makeChannelPostList } from '../factories/posts';

describe('PostList', () => {
  const renderPostList = (props = {posts: makeChannelPostList()}) => shallow(
    <PostList {...props} />
  );

  it('should render a list of posts', () => {
    let wrapper = renderPostList();
    assert.lengthOf(wrapper.find(PostDisplay), 20);
  });

  it('should behave well if handed an empty list', () => {
    let wrapper = renderPostList({ posts: []});
    assert.lengthOf(wrapper.find(PostDisplay), 0);
  });

  it('should pass the showChannelLinks prop to PostDisplay', () => {
    let wrapper = renderPostList(
      { posts: makeChannelPostList(), showChannelLinks: true }
    );
    wrapper.find(PostDisplay).forEach(postSummary => {
      assert.isTrue(postSummary.props().showChannelLink);
    });
  });
});
