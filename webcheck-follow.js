/*jslint node:true*/
'use strict';

var WebcheckPlugin = require('webcheck/plugin');
var url = require('url');

var pkg = require('./package.json');
/**
 * A helper function for empty regular expressions
 * @private
 * @type {{test: Function}}
 */
var emptyFilter = {
    test: function () {
        return true;
    }
};

/**
 * A helper function to handle errors
 * @private
 * @param {null|undefined|error} err - Error to log if there is one
 */
var logError = function (err) {
    if (err) {
        console.error(err);
    }
};

var decode = function (str) {
    try {
        return decodeURIComponent(str.split('&amp;').join('&')
            .split('&gt;').join('>')
            .split('&lt;').join('<')
            .split('&quot;').join('"')
            .split('&#39;').join('\''));
    } catch (err) {
        console.error('Error parsing URI!', str, err);
    }
    try {
        return str.split('&amp;').join('&')
            .split('&gt;').join('>')
            .split('&lt;').join('<')
            .split('&quot;').join('"')
            .split('&#39;').join('\'');
    } catch (err) {
        console.error('Error parsing URI without component!', str, err);
    }
    return str;
};

/**
 * Mirroring plugin for webcheck.
 * Mirror content to directory structure.
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @param {{}} [opts] - Options for this plugin
 * @param {RegExp|{test:Function}} [opts.filterContentType] - Follow only in matching content-type
 * @param {RegExp|{test:Function}} [opts.filterStatusCode] - Follow only in matching HTTP status code
 * @param {RegExp|{test:Function}} [opts.filterFollowUrl] - Follow only matching url
 * @param {RegExp|{test:Function}} [opts.filterUrl] - Follow only in matching url
 * @augments Webcheck.Plugin
 * @constructor
 */
var MirrorPlugin = function (opts) {
    var self;

    self = this;
    WebcheckPlugin.apply(this, arguments);

    opts = opts || {};

    opts.filterContentType = opts.filterContentType || emptyFilter;
    opts.filterStatusCode = opts.filterStatusCode || /^2/;
    opts.filterUrl = opts.filterUrl || emptyFilter;
    opts.filterFollowUrl = opts.filterFollowUrl || emptyFilter;

    this.middleware = function (result, next) {
        var lastChunk = '',
            list = {};

        if (!opts.filterUrl.test(result.url) ||
                !opts.filterContentType.test(result.response.headers['content-type']) ||
                !opts.filterStatusCode.test(result.response.statusCode.toString())) {
            return next();
        }
        result.response.on('data', function (chunk) {
            var str, lastTwo, completeUrls, hrefs, srcs, css, i, tmpUrl;
            str = chunk.toString();
            lastTwo = lastChunk + str;
            lastChunk = str;

            completeUrls = lastTwo.match(/(http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?([a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$\=~])*/g) || [];
            hrefs = lastTwo.match(/(href="((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*")/g) || [];
            srcs = lastTwo.match(/(src="((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*")/g) || [];
            css = lastTwo.match(/(url\("?'?((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*"?'?\))/g) || [];

            for (i = 0; i < completeUrls.length; i += 1) {
                completeUrls[i] = decode(completeUrls[i]);
                if (opts.filterFollowUrl.test(completeUrls[i])) {
                    list[completeUrls[i]] = true;
                }
            }
            for (i = 0; i < hrefs.length; i += 1) {
                tmpUrl = hrefs[i].substring(6, hrefs[i].length - 1);
                tmpUrl = tmpUrl.split('#')[0];
                tmpUrl = url.resolve(result.url, decode(tmpUrl));
                if (opts.filterFollowUrl.test(tmpUrl)) {
                    list[tmpUrl] = true;
                }
            }
            for (i = 0; i < srcs.length; i += 1) {
                tmpUrl = srcs[i].substring(5, srcs[i].length - 1);
                tmpUrl = tmpUrl.split('#')[0];
                tmpUrl = url.resolve(result.url, decode(tmpUrl));
                if (opts.filterFollowUrl.test(tmpUrl)) {
                    list[tmpUrl] = true;
                }
            }
            for (i = 0; i < css.length; i += 1) {
                tmpUrl = css[i].substring(4, css[i].length - 1);
                if (/"|'/.test(tmpUrl.substr(0, 1))) {
                    tmpUrl = tmpUrl.substr(1);
                }
                if (/"|'/.test(tmpUrl.substr(-1))) {
                    tmpUrl = tmpUrl.substring(0, tmpUrl.length - 1);
                }
                tmpUrl = tmpUrl.split('#')[0];
                tmpUrl = url.resolve(result.url, tmpUrl);
                if (opts.filterFollowUrl.test(tmpUrl)) {
                    list[tmpUrl] = true;
                }
            }
        });

        result.response.on('end', function () {
            var hash;

            for (hash in list) {
                if (list.hasOwnProperty(hash)) {
                    self.handle.crawl({
                        url: hash
                    }, logError);
                }
            }
        });

        next();
    };
};

MirrorPlugin.prototype = {
    '__proto__': WebcheckPlugin.prototype,
    package: pkg
};

module.exports = MirrorPlugin;
