# Paper Plane
> [TDLib](https://github.com/tdlib/td) bindings for Node.js.

Paper Plane is a package for easing the interaction with TDLib through Node.js. It's completely asynchrounus, blazing fast and reliable, so you can build a Telegram client with no worries of MTProto or Telegram API.

## Installation
``` bash
npm i -S tg-paper-plane
```
**Note:** TDlib library (`libtdjson.so`) must be installed on your machine.

## Example
A fully functioning but simple client is available at [`example/`](https://github.com/BlackSuited/paper-plane/tree/master/example) directory. Before using it, make sure you have an app in [Telegram Development Tools](https://my.telegram.org). Set `TD_API_ID` and `TD_API_HASH` environment variables. You can get these for your own from [Telegram account tools](https://my.telegram.org).

## Methods
TDlib has a complete [documentation of methods, types and everything else in the library](https://core.telegram.org/tdlib/).

## Changelog
#### v0.0.6
* Added encryptionKey parameter to class constructor, so the class can be used for encrypted databases, too. Also, `authorizationWaitEncryptionKey` is automatically handled by Paper Plane.

#### v0.0.5
* Call `this.resolver` when an AuthReady received from TDlib.

#### v0.0.4
* Removed Babel from dependencies,
* Set Node.js required version to `>=8.0.0`,
* Added JSDoc comments for each function in class,
* Updated example,
* and squished a few bugs.
