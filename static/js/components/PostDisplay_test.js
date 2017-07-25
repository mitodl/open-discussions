// @flow
import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';
import { Link } from 'react-router-dom';

import { makePost } from '../factories/posts';
import PostDisplay from './PostDisplay';

describe('PostDisplay', () => {
  const renderPostDisplay = props => shallow(<PostDisplay {...props}/>);

  it('should render a post correctly', () => {
    const post = makePost();
    const wrapper = renderPostDisplay({ post });
    const summary = wrapper.find('.summary');
    assert.equal(wrapper.find('.votes').text(), post.score.toString());
    assert.equal(summary.find('a').at(0).text(), post.title);
    assert.deepEqual(
      wrapper.find('.num-comments').props().children,
      [post.num_comments, ' Comments']
    );
    const authoredBy = wrapper.find('.authored-by').text();
    const expectedPrefix = `by ${post.author_id}, `;
    assert(authoredBy.startsWith(expectedPrefix));
    assert.isNotEmpty(authoredBy.substring(expectedPrefix.length));
  });

  it('should link to the subreddit, if told to', () => {
    const post = makePost();
    post.channel_name = "channel_name";
    const wrapper = renderPostDisplay({ post: post, showChannelLink: true });
    assert.equal(wrapper.find(Link).at(0).props().to, '/channel/channel_name');
  });

  it("should display text, if given a text post and the 'expanded' flag", () => {
    const  post = makePost();
    let string = "JUST SOME GREAT TEXT!";
    post.text = string;
    const wrapper = renderPostDisplay({post: post, expanded: true});
    assert.include(wrapper.text(), string);
  });

  it("should not display text, if given a text post but lacking the 'expanded' flag", () => {
    const  post = makePost();
    let string = "JUST SOME GREAT TEXT!";
    post.text = string;
    const wrapper = renderPostDisplay({post: post});
    assert.notInclude(wrapper.text(), string);
  });
});
