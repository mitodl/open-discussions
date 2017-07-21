// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';

import { makePost } from '../factories/posts';
import PostSummary from './PostSummary';

describe('PostSummary', () => {
  const renderPostSummary = (post) => shallow(<PostSummary post={post}/>);

  it('should render a post correctly', () => {
    const post = makePost();
    const wrapper = renderPostSummary(post);
    const summary = wrapper.find('.summary');
    assert.equal(wrapper.find('.votes').text(), post.upvotes.toString());
    assert.equal(summary.find('h3').text(), post.title);
    assert.equal(wrapper.find('.num-comments').text(), `${post.num_comments} Comments`);
    const authoredBy = wrapper.find('.authored-by').text();
    const expectedPrefix = `by ${post.author}, `;
    assert(authoredBy.startsWith(expectedPrefix));
    assert.isNotEmpty(authoredBy.substring(expectedPrefix.length));
  });
});
