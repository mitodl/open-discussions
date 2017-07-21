// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';

import PostList from './PostList';
import PostSummary from './PostSummary';
import { makeChannelPostList } from '../factories/posts';

describe('PostList', () => {
  const renderPostList = posts => shallow(
    <PostList posts={posts} />
  );

  it('should render a list of posts', () => {
    let wrapper = renderPostList(makeChannelPostList());
    assert.lengthOf(wrapper.find(PostSummary), 20);
  });

  it('should behave well if handed an empty list', () => {
    let wrapper = renderPostList([]);
    assert.lengthOf(wrapper.find(PostSummary), 0);
  });
});
