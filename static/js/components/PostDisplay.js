// @flow
import React from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

import { postDetailURL } from '../lib/url';

import type { Post } from '../flow/discussionTypes';

const textContent = post => (
  <div className="text-content-border">
    <div className="text-content">
      { post.text }
    </div>
  </div>
);

export default class PostDisplay extends React.Component {
  props: {
    post:             Post,
    showChannelLink?: boolean,
    expanded?:        boolean,
  }

  showChannelLink = () => {
    const { post, showChannelLink } = this.props;

    return showChannelLink && post.channel_name
      ? <Link to={`/channel/${post.channel_name}`}>
        on {post.channel_name}
      </Link>
      : null;
  }

  render() {
    const { post, expanded } = this.props;
    const formattedDate = moment(post.created).fromNow();
    return (
      <div className="post-summary">
        <div className="upvotes">
          <button> &uArr;</button>
          <span className="votes">{post.score}</span>
        </div>
        <div className="summary">
          <a className="post-title">{ post.title }</a>
          <div className="authored-by">
            by <a>{post.author_id || 'someone'}</a>, {formattedDate} { this.showChannelLink() }
          </div>
          <Link className="num-comments" to={postDetailURL(post.channel_name, post.id)}>
            {post.num_comments || 0} Comments
          </Link>
        </div>
        { (expanded && post.text) ? textContent(post) : null }
      </div>
    );
  }
}
