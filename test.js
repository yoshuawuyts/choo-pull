const pull = require('pull-stream')
const noop = require('noop2')
const test = require('tape')
const chooPull = require('./')

test('hooks = pull()', (t) => {
  t.test('should assert input types', function (t) {
    t.plan(1)
    t.throws(chooPull.bind(null, 123), /object/)
  })

  t.test('should return an object of hooks', (t) => {
    t.plan(2)
    const hooks = chooPull()
    t.equal(typeof hooks.wrapSubscriptions, 'function', 'subs exist')
    t.equal(typeof hooks.wrapEffects, 'function', 'effects exist')
  })

  t.test('should accept options to disable hooks', (t) => {
    t.plan(2)

    const hooks1 = chooPull({ subscriptions: false })
    t.notOk(hooks1.wrapSubscriptions, 'no subs')

    const hooks3 = chooPull({ effects: false })
    t.notOk(hooks3.wrapEffects, 'no effects')
  })
})

test('hook:wrapSubscription', (t) => {
  t.test('should transform into a pull-stream', (t) => {
    t.plan(2)

    var called = false
    const fn = chooPull.subscription((send$) => (end, cb) => {
      if (end) return cb(end)
      if (called) return cb(true)

      called = true
      cb(null, 'hey!')
    })

    fn(noop, done)

    function done (err, res) {
      t.ifError(err, 'no err')
      t.equal(res, 'hey!')
    }
  })

  t.test('should handle errors', (t) => {
    t.plan(3)

    var called = false
    const fn = chooPull.subscription((send$) => (end, cb) => {
      if (end) return cb(end)
      if (called) return cb(true)

      called = true
      cb(new Error('oh no!'))
    })

    fn(noop, done)

    function done (err, res) {
      t.ok(err, 'err exists')
      t.notOk(res, 'no res')
      t.equal(err.message, 'oh no!')
    }
  })

  t.test('should have a send$ method', (t) => {
    t.plan(2)

    var sourceCalled = false
    var sendCalled = false
    var called = false

    const fn = chooPull.subscription((Send$) => (end, cb) => {
      if (end) return cb(end)
      if (called) return cb(true)

      called = true
      // create source$
      const source$ = function source (end, cb) {
        if (end) return cb(end)
        if (sourceCalled) return cb(true)
        sourceCalled = true
        cb(null, 'oi')
      }
      const send$ = Send$('foobar')
      const sink$ = function sink (read) {
        read(null, function next (end, data) {
          if (end) return
          if (sendCalled) return

          sendCalled = true
          t.pass('send called a sink')
          t.equal(data, 'oi', 'data was equal')
          read(null, next)
        })
      }

      pull(source$, send$, sink$)
    })

    fn(send, done)

    function send (name, data, done) {
      done(null, data)
    }

    function done (err, res) {
      t.ok(err, 'err exists')
      t.notOk(res, 'no res')
      t.equal(err.message, 'oh no!')
    }
  })
})

test('hook:wrapEffect', (t) => {
  t.test('should transform into a pull-stream', (t) => {
    t.plan(3)

    var called = false
    const fn = chooPull.effect((state, prev, send$) => {
      return (read) => (end, cb) => read(end, (end, data) => {
        if (end) return cb(end)
        if (called) return cb(true)

        t.deepEqual(state, { foo: 'bar' }, 'state is what it should be')
        called = true
        cb(null, 'oi')
      })
    })

    const data = 'hey'
    const state = { foo: 'bar' }
    const prev = {}
    const send = noop
    const done = (err, res) => {
      t.ifError(err, 'no err')
      t.equal(res, 'oi', 'res is equal')
    }
    fn(data, state, prev, send, done)
  })
  t.test('should handle errors')
  t.test('should have a send$ method')
})
