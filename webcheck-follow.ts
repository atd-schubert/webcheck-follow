/// <reference path="./typings/main.d.ts" />

import { Plugin as WebcheckPlugin, IResult, ICallback } from 'webcheck';
import * as url from 'url';
import * as pkg from './package.json';

export interface ISimplifiedRegExpr {
    test(txt: string): boolean;
}

export interface IFollowPluginOptions {
    filterContentType?: ISimplifiedRegExpr | RegExp;
    filterStatusCode?: ISimplifiedRegExpr | RegExp;
    filterUrl?: ISimplifiedRegExpr | RegExp;
    filterFollowUrl?: ISimplifiedRegExpr | RegExp;
}

export interface IAssociativeArray<T> {
    [name: string]: T;
}

/**
 * A helper function for empty regular expressions
 * @private
 * @type {{test: Function}}
 */
var emptyFilter: ISimplifiedRegExpr = { // a spoofed RegExpr...
    test: (): boolean => {
        return true;
    }
};
/**
 * A helper function to handle errors
 * @private
 * @param {null|undefined|error} err - Error to log if there is one
 */
function logError(err: Error): void {
    'use strict';
    if (err) {
        console.error(err);
    }
}

function decode(str: string): string {
    'use strict';
    return str.split('&amp;').join('&')
        .split('&gt;').join('>')
        .split('&lt;').join('<')
        .split('&quot;').join('"')
        .split('&#39;').join('\'');
}

/**
 * Webcheck plugin to follow urls.
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @param {{}} [opts] - Options for this plugin
 * @param {RegExp|{test:Function}} [opts.filterContentType] - Follow only in matching content-type
 * @param {RegExp|{test:Function}} [opts.filterStatusCode] - Follow only in matching HTTP status code
 * @param {RegExp|{test:Function}} [opts.filterFollowUrl] - Follow only matching url
 * @param {RegExp|{test:Function}} [opts.filterUrl] - Follow only in matching url
 * @augments WebcheckPlugin
 * @constructor
 */
export class FollowPlugin extends WebcheckPlugin {

    public package: any = pkg;

    constructor(opts?: IFollowPluginOptions) {
        super();
        opts = opts || {};

        opts.filterContentType = opts.filterContentType || emptyFilter;
        opts.filterStatusCode = opts.filterStatusCode || /^2/;
        opts.filterUrl = opts.filterUrl || emptyFilter;
        opts.filterFollowUrl = opts.filterFollowUrl || emptyFilter;

        this.middleware = (result: IResult, next: ICallback): void => {
            var lastChunk: string = '',
                list: IAssociativeArray<boolean> = {};

            if (!opts.filterUrl.test(result.url) ||
                !opts.filterContentType.test(result.response.headers['content-type']) ||
                !opts.filterStatusCode.test(result.response.statusCode.toString())) {
                return next();
            }
            result.response.on('data', (chunk: Buffer): void => {
                var str: string,
                    lastTwo: string,
                    completeUrls: string[],
                    hrefs: string[],
                    srcs: string[],
                    css: string[],
                    i: number,
                    tmpUrl: string;

                str = chunk.toString();
                lastTwo = lastChunk + str;
                lastChunk = str;

                /* tslint:disable:max-line-length */
                completeUrls = lastTwo.match(/(http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?([a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$\=~])*/g) || [];
                hrefs = lastTwo.match(/(href="((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*")/g) || [];
                srcs = lastTwo.match(/(src="((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*")/g) || [];
                css = lastTwo.match(/(url\("?'?((http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?)?[a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~]*"?'?\))/g) || [];
                /* tslint:enable:max-line-length */

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

            result.response.on('end', (): void => {
                for (let hash: string in list) {
                    if (list.hasOwnProperty(hash)) {
                        this.handle.crawl({
                            url: hash
                            /* tslint:disable:align */
                        }, logError);
                        /* tslint:enable:align */
                    }
                }
            });

            next();
        };
    }
}
