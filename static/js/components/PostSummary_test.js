// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';
import { Link } from 'react-router-dom';

import { makePost } from '../factories/posts';
import PostSummary from './PostSummary';

describe('PostSummary', () => {
  const renderPostSummary = props => shallow(<PostSummary {...props}/>);

  it('should render a post correctly', () => {
    const post = makePost();
    const wrapper = renderPostSummary({ post });
    const summary = wrapper.find('.summary');
    assert.equal(wrapper.find('.votes').text(), post.upvotes.toString());
    assert.equal(summary.find('a').at(0).text(), post.title);
    assert.equal(wrapper.find('.num-comments').text(), `${post.num_comments} Comments`);
    const authoredBy = wrapper.find('.authored-by').text();
    const expectedPrefix = `by ${post.author}, `;
    assert(authoredBy.startsWith(expectedPrefix));
    assert.isNotEmpty(authoredBy.substring(expectedPrefix.length));
  });

  it('should link to the subreddit, if told to', () => {
    const post = makePost();
    post.channel_name = "channel_name";
    const wrapper = renderPostSummary({ post: post, showChannelLink: true });
    assert.equal(wrapper.find(Link).props().to, '/channel/channel_name');
  });
});
