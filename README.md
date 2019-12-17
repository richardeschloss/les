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

Want to start it with even less pain (i.e., less "ouch"?)

> les -ow

If there is a default "public" folder in your current working directory, that will be served. The default server can be accessed at: http://localhost:8080

Want to use lesky in YOUR native language? Now you can! (If the language set is in [locales](https://github.com/richardeschloss/les/tree/master/locales) folder, you can use it!). If your *system's language* includes the two-letter language code it will be used; most systems should have the env var "LANG" set. If LANG is not set, simply set it two the language you want to use:

> LANG="es" les 

This will respect options in Spanish and display console messages back in that language.

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
		--proto	Protocol to use [http] ({ http, https, http2 })
		--range	Port Range (in case port is taken) [8000,9000]
		--sslKey	Path to SSL Key
		--sslCert	Path to SSL Certificate
	-o,	--open	Open browser [OS default]
	-w,	--watch	Watch for file changes in dir [staticDir]

---End of Help---

```

> LANG="es" les --ayuda
```
el uso de: les [path] [options]

options:
	-h,	--ayuda	Imprime este menú de ayuda
	-i,	--init	Init lesky en el espacio de trabajo especificado por la ruta por defecto cwd [[cwd]]
	-a,	--host	Dirección [localhost]
	-p,	--puerto	El puerto a utilizar [8080]
		--proto	Protocolo para el uso de [http] ({ http, https, http2 })
		--range	Rango de puertos (en caso de que el puerto se toma). Formato de inicio-final [8000,9000]
		--sslKey	Ruta de acceso de la Clave SSL
		--sslCert	Ruta de acceso a los Certificados SSL
	-o,	--abierto	Abra el navegador. [OS default]
	-w,	--reloj	Reloj para los cambios de los archivos en el directorio [staticDir]

---Fin de Ayudar a---
```


## Customizing (.lesrc config file)

If a `.lesrc` config file is in the current working directory, it will be consumed. If CLI args are _also_ provided, those will override the entry in .lesrc that matches protocol used by the CLI. The config file is simply a JSON file, specifying an array of configurations to use. If a desired port is already taken, an attempt will be made to find a free port.

Example `.lesrc` file:

```
[{
  "host": "localhost",
  "proto": "http2",
	"port": 8000,
  "sslKey": ".ssl/server.key",
  "sslCert": ".ssl/server.crt"
},{
  "proto": "https",
  "portRange": [8000, 9000]
}]
```

If using a language different from English, you can *your* language for the options in the file. So "port" could be written as "puerto" if Spanish is being. English will always be the fallback.

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

- I think some utils can still be transferred over to `les-utils`, where they'd be more reusable.

- The `les.js` file has the i18n support while the others don't. I may want to carry over the translations to the other files, but I would like to do so gracefully. If someone runs `les --init` in a new workspace, it would have to copy over the preferred language set (I'll revisit someday)
