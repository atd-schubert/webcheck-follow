/*jslint node:true*/

/*global describe, it, before, after, beforeEanonsenseach*/

'use strict';

var FollowPlugin = require('../');

var Webcheck = require('webcheck');
var freeport = require('freeport');
var express = require('express');

describe('Mirror Plugin', function () {
    var port;
    before(function (done) {
        var app = express();

        /*jslint unparam: true*/
        app.get('/test.css', function (req, res) {
            res.set('Content-Type', 'text/css').send('#id { background-image: url("works.txt"); }');
        });
        app.get('/test.txt', function (req, res) {
            res.set('Content-Type', 'text/plain').send('Just a url: https://github.com/atd-schubert');
        });
        app.get('/test.html', function (req, res) {
            res.send('<html><head></head><body><a href="href-works.txt">Link</a><img src="src-works.txt" /> Just a fix URL: https://github.com/atd-schubert</body></html>');
        });
        app.get('/hash.html', function (req, res) {
            res.send('<html><head></head><body><a href="href-works.txt#hash">Link</a><img src="src-works.txt#hash" /> Just a fix URL: https://github.com/atd-schubert#index url("css-works.txt#hash")</body></html>');
        });
        app.get('/escaped.html', function (req, res) {
            res.send('<html><head></head><body><a href="href-works.txt?first&amp;test=second#hash">Link</a><img src="src-works.txt?first&amp;test=second#hash" /> Just a fix URL: https://github.com/atd-schubert?test&amp;another#index url("css-works.txt#hash") <a href="/malformed%20ac%E7%F5es%20.html">Malformed</a></body></html>');
        });
        /*jslint unparam: false*/

        freeport(function (err, p) {
            if (err) {
                done(err);
            }
            port = p;
            app.listen(port);
            done();
        });
    });
    describe('Default settings', function () {
        var webcheck, plugin;

        before(function () {
            webcheck = new Webcheck();
            plugin = new FollowPlugin();
            webcheck.addPlugin(plugin);
            plugin.enable();
        });

        it('should follow src, href and full urls', function (done) {
            var src, href, full, listener;

            listener = function (settings) {
                if (settings.url === 'https://github.com/atd-schubert') {
                    settings.preventCrawl = true;
                    full = true;
                } else if (settings.url === 'http://localhost:' + port + '/src-works.txt') {
                    settings.preventCrawl = true;
                    src = true;
                } else if (settings.url === 'http://localhost:' + port + '/href-works.txt') {
                    settings.preventCrawl = true;
                    href = true;
                }
                if (href && src && full) {
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.html'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls in css', function (done) {
            var listener;

            listener = function (settings) {
                if (settings.url === 'http://localhost:' + port + '/works.txt') {
                    settings.preventCrawl = true;
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.css'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls text', function (done) {
            var found, listener;
            listener = function (settings) {
                if (settings.url === 'https://github.com/atd-schubert') {
                    settings.preventCrawl = true;
                    if (!found) {
                        found = true;
                    }
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.txt'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls with hash', function (done) {
            var full, src, href, css, listener;

            listener = function (settings) {
                if (settings.url === 'https://github.com/atd-schubert') {
                    settings.preventCrawl = true;
                    full = true;
                } else if (settings.url === 'http://localhost:' + port + '/src-works.txt') {
                    settings.preventCrawl = true;
                    src = true;
                } else if (settings.url === 'http://localhost:' + port + '/href-works.txt') {
                    settings.preventCrawl = true;
                    href = true;
                } else if (settings.url === 'http://localhost:' + port + '/css-works.txt') {
                    settings.preventCrawl = true;
                    css = true;
                }

                if (href && src && full && css) {
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/hash.html'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should parse escaped characters in attributes urls', function (done) {
            var full, src, href, css, listener, malformed;

            listener = function (settings) {
                if (settings.url === 'https://github.com/atd-schubert?test&another') {
                    settings.preventCrawl = true;
                    full = true;
                } else if (settings.url === 'http://localhost:' + port + '/src-works.txt?first&test=second') {
                    settings.preventCrawl = true;
                    src = true;
                } else if (settings.url === 'http://localhost:' + port + '/href-works.txt?first&test=second') {
                    settings.preventCrawl = true;
                    href = true;
                } else if (settings.url === 'http://localhost:' + port + '/css-works.txt') {
                    settings.preventCrawl = true;
                    css = true;
                } else if (settings.url === 'http://localhost:' + port + '/malformed%20ac%E7%F5es%20.html') {
                    console.log(settings.url);
                    settings.preventCrawl = true;
                    malformed = true;
                }

                if (href && src && full && css && malformed) {
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/escaped.html'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
    });
});
