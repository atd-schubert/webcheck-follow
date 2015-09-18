# webcheck-follow
[Webcheck](https://github.com/atd-schubert/node-webcheck) plugin to follow resources from HTML and CSS resources

## How to install

```bash
npm install --save webcheck-follow
```

## How to use

```js
var Webcheck = require('webcheck');
var FollowPlugin = require('webcheck-follow');

var plugin = FollowPlugin();

var webcheck = new Webcheck();
webcheck.addPlugin(plugin);

plugin.enable();

// now continue with your code...

```

## Options
- `filterContentType`: Follow only in matching content-type.
- `filterStatusCode`: Follow only in matching HTTP status code (defaults to 2xx status codes).
- `filterUrl`: Follow only **in** matching url.
- `filterFollowUrl`: Follow only matching url.

### Note for filters

Filters are regular expressions, but the plugin uses only the `.test(str)` method to proof. You are able to write
your own and much complexer functions by writing the logic in the test method of an object like this:

```js
opts = {
   filterSomething: {
       test: function (val) {
           return false || true;
       }
   }
}
```
