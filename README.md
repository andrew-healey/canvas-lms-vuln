# Canvas Zero-interaction XSS vulnerability

I found an XSS vulnerability in Instructure's Canvas LMS. It revolves around an outdated, insecure version of jQuery and a broken image handler.

# Vulnerability

## Canvas

Canvas uses an old version of jQuery. Strangely, the `package.json` for Canvas references a repo of jQuery ([here](https://github.com/instructure/canvas-lms/blob/master/package.json#L348) and [here](https://github.com/instructure/canvas-lms/blob/master/package.json#L119)), which uses version 1.7.2. jQuery 1.7.2 is vulnerable to [CVE 2015-9251](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2015-9251). This seems to have happened because the `package.json` does not reference the `npm` version of jQuery, so there is no auto-updating or security notice for it.

The jQuery vulnerability can be triggered by abusing a [broken image handler](https://github.com/instructure/canvas-lms/blob/606a190533691e5ea78722e2489cdac277354556/app/coffeescripts/behaviors/broken-images.js). When run, this script attaches an error handle to all `img` elements on the page, which applies different image styles depending on the error code. The script uses a jQuery request to find the error code, which is the [line of code](https://github.com/instructure/canvas-lms/blob/606a190533691e5ea78722e2489cdac277354556/app/coffeescripts/behaviors/broken-images.js#L24) that this vulnerability abuses.

Notably, this broken image handler runs after most images on the page are finished loading.

## Attack

An attacker uses the Rich Content Editor to make an `img` element pointing to the attacker's server.This server, when receiving a request for an image, will wait for a few seconds before sending a 404 error. The timeout exists because the broken image handler needs to set the error handler on the `img` element before the error occurs.

After throwing a 404, the server expects that the broken image handler will make an XMLHttpRequest to the same url, so it also has a handler for all non-image requests, which will send the payload Javascript with a `Content-Type: application/javascript` header. This will cause the payload to be executed in the victim's browser.

# Proof-of-Concept

The proof-of-concept uses a local Express.js server.

```sh
npm install
node index.js
```

This vulnerability requires that the Rich Content Editor be used to post an image. The example that we will use now is a calendar event, although this vulnerability works just the same on any place that a custom image can be placed at the time a page is loaded (ePortfolios, discussion comments, assignments, etc.).

First, go to the calendar and click any box to make a calendar event. Click "More Options". Then click "Embed Image" and enter the url "http://localhost:3000/image". Click "Update" and "Create Event".

This will bring you to the calendar page. Click on the event, and then click on the title. This should bring you to a full-screen version of the event, where the XSS will run an `alert(1)`.

A full video of this is included:

[![XSS Proof-of-Concept Demonstration](https://img.youtube.com/vi/FVvVQ53yjFs/0.jpg)](https://www.youtube.com/watch?v=FVvVQ53yjFs)

# Solution

Canvas LMS should update to a newer version of jQuery, which also eliminates the risk that this jQuery vulnerability could be abused anywhere else in the codebase.

It seems that Canvas uses the specific repository link because it has some other code bundled in, which I do not know much about (apparently AMD and CommonJS). The immediate solution to this attack (since replacing the old jQuery + CommonJS + AMD may take time) is to set the `dataType` to `"text"` in the `$.get` [call](https://github.com/instructure/canvas-lms/blob/606a190533691e5ea78722e2489cdac277354556/app/coffeescripts/behaviors/broken-images.js#L24) in the broken image handler, which prevents any malicious code from being executed.
