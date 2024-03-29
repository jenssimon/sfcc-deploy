[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url][![star this repo][gh-stars-image]][gh-url] [![fork this repo][gh-forks-image]][gh-url] [![CI][gh-status-image]][gh-status-url]

# sfcc-deploy

> Deploy cartridges to a Salesforce Commerce Cloud (SFCC) instance.

> **Warning**
>
> **DEPRECATED**
>
> The recommended way to deploy code to SFCC instances is direct via [sfcc-ci](https://github.com/SalesforceCommerceCloud/sfcc-ci?tab=readme-ov-file#pushing-code).

![Screenshot](https://github.com/jenssimon/sfcc-deploy/raw/main/deploy.gif)

## Installation

```sh
$ yarn add sfcc-deploy --dev
```

## General

Uploads a set of SFCC cartridges to an instance. Additionally you can extend it with additional tasks.

## Usage

The credentials object is the same as the config for [dwdav](https://www.npmjs.com/package/dwdav#config).

```javascript
import sfccDeploy from 'sfcc-deploy'

const config = {
  hostname: 'host.name.net',
  username: 'login',
  password: 'password',
  p12: 'path/to/cert.p12', // two factor authentication
  passphrase: 'certpassphrase', // two factor authentication
}

const version = '0.5.1'

try {
  await sfccDeploy({
    credentials: config,
    version,

    root: './dist/', // default: './dist/'
  })
} catch (e) {
  console.error('error', e)
}
```

It's also possible to add additional tasks (executed after code upload).

```javascript
const activateCodeVersion = {
  name: ({ options: { version } }) => `Activating code version: ${version}`, // also takes a simple string
  condition: 'activateCodeVersion', // the flag name needed to active the task
  emoji: 'fast_forward',
  fn: (params) => {
    // ...
  },
}

try {
  await sfccDeploy({
    credentials: config,
    version,

    activateCodeVersion: true, // this flag is needed to activate the additional step
    additionalSteps: [
      activateCodeVersion,
    ],
  })
} catch (e)  {
  console.error('error', e)
}
```

The emoji name must one of the available emojis from this [list](https://raw.githubusercontent.com/omnidan/node-emoji/master/lib/emoji.json).
Following information are passed as object to the `name` and `fn`functions:

Property   | Description
-----------|------------
`options`  | The config object of the `sfccDeploy()` call
`dwdav`    | The [dwdav](https://www.npmjs.com/package/dwdav) instance used for upload
`rootDir`  | The root directory
`step`     | The current step (see https://www.npmjs.com/package/cli-step#a-single-step-%EF%B8%8F)
`stepText` | The text of the step

## License

MIT © 2023 [Jens Simon](https://github.com/jenssimon)

[npm-url]: https://www.npmjs.com/package/sfcc-deploy
[npm-image]: https://badgen.net/npm/v/sfcc-deploy
[npm-downloads-image]: https://badgen.net/npm/dw/sfcc-deploy

[gh-url]: https://github.com/jenssimon/sfcc-deploy
[gh-stars-image]: https://badgen.net/github/stars/jenssimon/sfcc-deploy
[gh-forks-image]: https://badgen.net/github/forks/jenssimon/sfcc-deploy
[gh-status-image]: https://github.com/jenssimon/sfcc-deploy/actions/workflows/ci.yml/badge.svg
[gh-status-url]: https://github.com/jenssimon/sfcc-deploy/actions/workflows/ci.yml
