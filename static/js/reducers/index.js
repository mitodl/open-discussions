// @flow
import { combineReducers } from 'redux';
import { channels } from './channels';
import { posts } from './posts';

export default combineReducers({
  channels,
  posts,
});
