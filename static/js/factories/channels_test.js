// @flow
import { assert } from 'chai';

import { makeChannel } from './channels';

describe('channels factory', () => {
  it('should make a channel', () => {
    let channel = makeChannel();
    assert.isString(channel.name);
    assert.isString(channel.title);
    assert.equal(channel.theme_type, "public");
  });
});
