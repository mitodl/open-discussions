// @flow
import { assert } from 'chai'

import { wait } from './util'

describe('utility functions', () => {
  it('waits some milliseconds', done => {
    let executed = false
    wait(30).then(() => {
      executed = true
    })

    setTimeout(() => {
      assert.isFalse(executed)

      setTimeout(() => {
        assert.isTrue(executed)

        done()
      }, 20)
    }, 20)
  })
})
