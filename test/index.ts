/// <reference path="../typings/main.d.ts" />

import { FollowPlugin } from '../webcheck-follow';
import {Webcheck, ICrawlOptions} from 'webcheck';
import * as freeport from 'freeport';
import * as express from 'express';

/* tslint:disable:align */

describe('Follow Plugin', (): void => {
    var port: number;
    before((done: MochaDone): void => {
        var app: express.Application = express();

        /* tslint:disable:max-line-length */
        app.get('/test.css', (req: express.Request, res: express.Response): void => {
            res.set('Content-Type', 'text/css').send('#id { background-image: url("works.txt"); }');
        });
        app.get('/test.txt', (req: express.Request, res: express.Response): void => {
            res.set('Content-Type', 'text/plain').send('Just a url: https://github.com/atd-schubert');
        });
        app.get('/test.html', (req: express.Request, res: express.Response): void => {
            res.send('<html><head></head><body><a href="href-works.txt">Link</a><img src="src-works.txt" /> Just a fix URL: https://github.com/atd-schubert</body></html>');
        });
        app.get('/hash.html', (req: express.Request, res: express.Response): void => {
            res.send('<html><head></head><body><a href="href-works.txt#hash">Link</a><img src="src-works.txt#hash" /> Just a fix URL: https://github.com/atd-schubert#index url("css-works.txt#hash")</body></html>');
        });
        app.get('/escaped.html', (req: express.Request, res: express.Response): void => {
            res.send('<html><head></head><body><a href="href-works.txt?first&amp;test=second#hash">Link</a><img src="src-works.txt?first&amp;test=second#hash" /> Just a fix URL: https://github.com/atd-schubert?test&amp;another#index url("css-works.txt#hash") <a href="/malformed%20ac%E7%F5es%20.html">Malformed</a></body></html>');
        });
        /* tslint:enable:max-line-length */

        freeport((err: Error, p: number): void => {
            if (err) {
                done(err);
            }
            port = p;
            app.listen(port);
            done();
        });
    });
    describe('Default settings', (): void => {
        var webcheck: Webcheck,
            plugin: FollowPlugin;

        before((): void => {
            webcheck = new Webcheck({});
            plugin = new FollowPlugin();
            webcheck.addPlugin(plugin);
            plugin.enable();
        });

        it('should follow src, href and full urls', (done: MochaDone): void => {
            var src: boolean,
                href: boolean,
                full: boolean,
                listener: Function;

            listener = (settings: ICrawlOptions): void => {
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
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls in css', (done: MochaDone): void => {
            var listener: Function;

            listener = (settings: ICrawlOptions): void => {
                if (settings.url === 'http://localhost:' + port + '/works.txt') {
                    settings.preventCrawl = true;
                    webcheck.removeListener('crawl', listener);
                    return done();
                }
            };
            webcheck.on('crawl', listener);
            webcheck.crawl({
                url: 'http://localhost:' + port + '/test.css'
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls text', (done: MochaDone): void => {
            var found: boolean,
                listener: Function;
            listener = (settings: ICrawlOptions): void => {
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
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should find urls with hash', (done: MochaDone): void => {
            var full: boolean,
                src: boolean,
                href: boolean,
                css: boolean,
                listener: Function;

            listener = (settings: ICrawlOptions): void => {
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
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should parse escaped characters in attributes urls', (done: MochaDone): void => {
            var full: boolean,
                src: boolean,
                href: boolean,
                css: boolean,
                listener: Function,
                malformed: boolean;

            listener = (settings: ICrawlOptions): void => {
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
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
            });
        });
    });
});
