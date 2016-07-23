# choo-pull [![stability][0]][1]
[![npm version][2]][3] [![build status][4]][5] [![test coverage][6]][7]
[![downloads][8]][9] [![js-standard-style][10]][11]

Wrap handlers to use [pull-stream](pull-stream.github.io) in a `choo` plugin.
This is intended to go beyond basic `choo` usage, and tread into the domain of
managing asynchronous complexity using streams / FRP.

While streams code takes longer to write up front, resulting code is generally
stateless, pretty damn fast and surprisingly reusable. `pull-streams` are a
minimal version of streams that weigh 200 bytes and handle backpressure
phenomenally.

## Usage
```js
const pull = require('choo-pull')
const choo = require('choo')

const app = choo()
app.use(pull())

const tree = app.start()
document.body.appendChild(tree)
```

Now each handler in a `model` expects a valid `through` pull-stream to be
returned synchronously. Initial data will be passed as the source, errors
handling and `done()` calls are appended in the sink:
```js
const through = require('pull-through')
const ws = require('pull-ws')
const xhr = require('xhr')

module.exports = {
  namespace: 'my-model',
  state: {
    count: 0
  },
  reducers: {
    increment: (data, state) => ({ count: state.count + data }),
    decrement: (data, state) => ({ count: state.count - data }),
  },
  subscriptions: {
    getDataFromSocket: (Send$) => {
      const ws$ = Ws$('wss://echo.websocket.org')
      return pull(ws$, Deserialize$(), Send$('performXhr'))
    }
  },
  effects: {
    performXhr: (state, Send$) => pull(Xhr$(), Deserialize$())
  }
}

function Xhr$ () {
  return through((data, cb) => {
    xhr('/foo/bar', { data: data }, (err, res) => {
      if (err) return cb(err)
      cb(null, res)
    })
  })
}

function Deserialize$ () {
  return through((data, cb) {
    try {
      cb(null, JSON.parse(data))
    } catch (e) {
      cb(e)
    }
  })
}

function Ws$ (url) {
  return ws(new window.WebSocket(url))
}
```

## Using send()
Like all other API methods, so too does the `send()` method become a
`pull-stream`. More specifically it becomes a `through` stream that takes the
`action` name as the sole arugment, and pushes any results into any a
connecting `through` or `sink` stream:

```js
const through = require('pull-through')

module.exports = {
  state: {
    count: 0
  },
  reducers: {
    bar: (state) => ({ state.count + data })
  },
  effects: {
    callBar: (state, prev, Send$) => Send$('bar'),
    callFoo: (state, prev, Send$) => Send$('foo')
  }
}

// send('callFoo', 1)
// => state.count = 1
```

## API
### hooks = pull(opts)
Create an object of hooks that can be passed to `app.use()`. Internally ties
into the following hooks:
- __wrapSubscriptions:__ changes the API of `subscriptions` to be `(Send$)`
- __wrapEffects:__ changes the API of `effects` to be `(state, Send$)`

The following options can be passed:
- __opts.subscriptions:__ default: `true`. Determine if `subscriptions` should
  be wrapped
- __opts.effects:__ default: `true`. Determine if `effects` should be wrapped

Incrementally enabling options can be useful when incrementally upgrading from
a CSP-style codebase to a reactive / streaming one.

### pull.subscription(subscription)
Wrap a single `subscription`. Useful to incrementally upgrade a CSP-style
codebase to a reactive / streaming one.

### pull.effect(effect)
Wrap a single `effect`. Useful to incrementally upgrade a CSP-style
codebase to a reactive / streaming one.

## FAQ
### Why aren't reducers wrapped in pull-streams?
In `choo@3` the internal workings demand that data always be returned
synchronously. Because `pull-stream` returns data in a callback, `reducers`
cannot be wrapped. Perhaps at some point we'll allow for a hybrid API, but at
this point it's frankly not possible.

## Installation
```sh
$ npm install choo-pull
```

## License
[MIT](https://tldrlegal.com/license/mit-license)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/choo-pull.svg?style=flat-square
[3]: https://npmjs.org/package/choo-pull
[4]: https://img.shields.io/travis/yoshuawuyts/choo-pull/master.svg?style=flat-square
[5]: https://travis-ci.org/yoshuawuyts/choo-pull
[6]: https://img.shields.io/codecov/c/github/yoshuawuyts/choo-pull/master.svg?style=flat-square
[7]: https://codecov.io/github/yoshuawuyts/choo-pull
[8]: http://img.shields.io/npm/dm/choo-pull.svg?style=flat-square
[9]: https://npmjs.org/package/choo-pull
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
