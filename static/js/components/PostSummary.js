// @flow
import React from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

import type { Post } from '../flow/discussionTypes';

export default class PostSummary extends React.Component {
  props: {
    post:             Post,
    showChannelLink?: boolean,
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
    const { post } = this.props;
    const formattedDate = moment(post.created).fromNow();
    return (
      <div className="post-summary">
        <div className="upvotes">
          <button> &uArr;</button>
          <span className="votes">{post.upvotes}</span>
        </div>
        <div className="summary">
          <a className="post-title">{ post.title }</a>
          <div className="authored-by">
            by <a>{post.author || 'someone'}</a>, {formattedDate} { this.showChannelLink() }
          </div>
          <a className="num-comments">{post.num_comments || 0} Comments</a>
        </div>
      </div>
    );
  }
}
