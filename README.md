[![npm](https://img.shields.io/npm/v/lesky)](https://www.npmjs.com/package/lesky)
[![npm](https://img.shields.io/npm/dt/lesky)](https://www.npmjs.com/package/lesky)
[![](https://gitlab.com/richardeschloss/les/badges/master/pipeline.svg)](https://gitlab.com/richardeschloss/les)
[![](https://gitlab.com/richardeschloss/les/badges/master/coverage.svg)](https://gitlab.com/richardeschloss/les)
[![NPM](https://img.shields.io/npm/l/lesky)](https://github.com/richardeschloss/les/blob/development/LICENSE)

# Lightweight Express-ish (Koa) Server -- Type `les` not more!

Super configurable, easy-to-use lightweight Koa Server that lets you
1. Statically serve any directory with `les` (not more). 

--> If the directory contains a `.lesrc` config file, it will be used (FYI, the "rc" suffix stands for "run commands", a typical convention in Linux)

--> If CLI args are provided, those will be used

--> If both .lesrc and CLI args are provided, both will be used, but the CLI args will get priority. 

2. Init a Koa application in any directory with `les --init` (EASY)

--> The actual `server.js` boilerplate is kept separate from `app.js`, so you can focus more on your app and less on boilerplate! 


## Installation

> npm i -g lesky

(I wanted les, but it was taken. No worries though...the "k" in the name makes it a little more accurate)
(Global installation is recommended...install only once)

## Usage

Make sure the "les" binary is discoverable. I.e., your PATH env var should be set up to include `~/.npm-global/bin`:

> export PATH=~/.npm-global/bin:\$PATH

Then, from any folder launching a static server is simply:

> les

If there is a default "public" folder in your current working directory, that will be served. The default server can be accessed at: http://localhost:8080

## Customizing (CLI)

The latest CLI options can always be found in the help menu:

> les --help

```
usage: les [path] [options]

options:
	-h,	--help	Print this help menu
	-i,	--init	Init lesky in workspace specified by path, defaults to cwd [[cwd]]
	-a,	--host	Address to use [localhost]
	-p,	--port	Port to use [8080]
		--proto	Protocol to use [http] ({ http, https, http2, http2s })
		--range	Port Range (in case port is taken) [8000,9000]
		--sslKey	Path to SSL Key
		--sslCert	Path to SSL Certificate
	-o,	--open	Open browser [OS default]

---End of Help---
```

## Customizing (.lesrc config file)

If a `.lesrc` config file is in the current working directory, it will be consumed. If CLI args are _also_ provided, those will override the entry in .lesrc that matches protocol used by the CLI. The config file is simply a JSON file, specifying an array of configurations to use. If a desired port is already taken, an attempt will be made to find a free port.

Example `.lesrc` file:

```
[{
  "host": "localhost",
  "proto": "http2",
  "sslKey": ".ssl/server.key",
  "sslCert": ".ssl/server.crt"
},{
  "proto": "https",
  "portRange": [8000, 9000]
}]
```

## Initializing a workspace to be a lesky app

If it is desired to initialize the current workspace as a lesky app, it's accomplished by:

> les [path] --init [options]

Where path defaults to the current working directory if not specified. The options passed in are the same as those passed to the CLI above. The only difference is that these options will be used to initialize the `.lesrc` config file that gets copied over, so that when you start the app, it will use your provided settings. 

Specifically, running this command will initialize a `package.json` file in your workspace with useful scripts and dependencies (such as Koa). Then it will copy over several sample files, including `server.js` and `app.js` which will be the entry point. It will also automatically install the dependencies. 

Protections in place: if `package.json` or `.lesrc` already exist in the destination folder, they will not be overwritten.

When initialization is done, the following should work:

> npm start 

> npm run dev 

## TODO Items and Notes

- Improved i18n support. Currently the locales folder has a "en_US" locale, but I would like to support more languages, to make this tool easier for devs across the world to use. At the same time, I want to figure out how to do it and still keep things lightweight. Some thoughts:

--> It would be nice if the commands could be entered in the user's preferred language 

--> It would be nice if the console log messages appeared in the user's preferred language.



