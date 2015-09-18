/*jslint node:true*/

/*global describe, it, before, after, beforeEach, afterEach*/

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
            var src, href, full;
            webcheck.on('crawl', function (result) {
                if (result.url === 'https://github.com/atd-schubert') {
                    full = true;
                } else if (result.url === 'http://localhost:' + port + '/src-works.txt') {
                    src = true;
                } else if (result.url === 'http://localhost:' + port + '/href-works.txt') {
                    href = true;
                }
            });
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.html'
            }, function (err) {
                if (err) {
                    return done(err);
                }
                setTimeout(function(){
                    if (href && src && full) {
                        return done();
                    }
                    return done(new Error('A resource was not found'));
                }, 1);


            });
        });
        it('should find urls in css', function (done) {
            var found;
            webcheck.on('crawl', function (result) {
                if (result.url === 'http://localhost:' + port + '/works.txt') {
                    found = true;
                }
            });
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.css'
            }, function (err) {
                if (err) {
                    return done(err);
                }
                setTimeout(function(){
                    if (found) {
                        return done();
                    }
                    return done(new Error('A resource was not found'));
                }, 1);


            });
        });
        it('should find urls text', function (done) {
            var found;
            webcheck.on('crawl', function (result) {
                if (result.url === 'https://github.com/atd-schubert') {
                    found = true;
                }
            });
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.txt'
            }, function (err) {
                if (err) {
                    return done(err);
                }
                setTimeout(function(){
                    if (found) {
                        return done();
                    }
                    return done(new Error('A resource was not found'));
                }, 1);


            });
        });
    });
});
