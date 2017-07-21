// @flow
import React from 'react';
import moment from 'moment';

import type { Post } from '../flow/discussionTypes';

export default class PostSummary extends React.Component {
  props: {
    post: Post,
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
          <h3>{post.title}</h3>
          <span className="authored-by">
            by {post.author || 'someone'}, {formattedDate}
          </span>
          <span className="num-comments">{post.num_comments || 0} Comments</span>
        </div>
      </div>
    );
  }
}
