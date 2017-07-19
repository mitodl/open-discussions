// @flow
import casual from 'casual-browserify';

export const makeChannel = (privateChannel: boolean = false) => ({
  name: casual.word,
  title: casual.title,
  theme_type: privateChannel ? "private" : "public"
});
