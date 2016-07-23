const pull = require('pull-stream')
const assert = require('assert')

module.exports = chooPull
chooPull.subscription = wrapSubscriptions
chooPull.effect = wrapEffects

// Wrap handlers to accept pull streams
// obj? -> obj
function chooPull (opts) {
  opts = opts || {}
  assert.equal(typeof opts, 'object', 'choo-pull: opts should be an object or undefined')

  const hooks = {}
  if (opts.effects !== false) {
    hooks.wrapEffects = wrapEffects
  }

  if (opts.subscriptions !== false) {
    hooks.wrapSubscriptions = wrapSubscriptions
  }

  return hooks
}

// Wrap subscriptions to accept pull streams
// fn -> fn
function wrapSubscriptions (cb) {
  assert.equal(typeof cb, 'function', 'choo-pull.subscriptions: cb should be a function')
  return function (send, done) {
    const send$ = createSend$(send)
    const source$ = cb(send$)
    const sink$ = createSink$(done)
    pull(source$, sink$)
  }
}

// Wrap effects to accept pull streams
// fn -> fn
function wrapEffects (cb) {
  assert.equal(typeof cb, 'function', 'choo-pull.effects: cb should be a function')
  return function (data, state, prev, send, done) {
    const send$ = createSend$(send)
    const through$ = cb(state, prev, send$)
    const source$ = createSource$(data)
    const sink$ = createSink$(done)
    pull(source$, through$, sink$)
  }
}

// Create a source stream that wraps data
// and pushes it to the next stream
// obj -> source$
function createSource$ (data) {
  var called = false

  return function (end, cb) {
    if (end) return cb(end)
    if (called === true) return cb(true)

    called = true
    cb(null, data)
  }
}

// Create a sink stream that calls done()
// on error or when done
// fn -> sink$
function createSink$ (done) {
  return function (read) {
    read(null, function next (end, data) {
      // Once cancellation works, 'true' should call the "cancel" method
      if (end === true) return
      if (end) return done(end)

      done(null, data)
      read(null, next)
    })
  }
}

// Transform the send() function into a valid source stream
// fn -> through$
function createSend$ (send) {
  return function send$ (actionName) {
    return function send$Sink (read) {
      return function send$Source (end, cb) {
        read(end, function (end, data) {
          if (end === true) return cb(true)
          if (end) return cb(end)

          send(actionName, data, cb)
        })
      }
    }
  }
}
