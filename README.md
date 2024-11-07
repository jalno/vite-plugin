# @jalno/vite-plugin [![npm](https://img.shields.io/npm/v/@jalno/vite-plugin.svg)](https://npmjs.com/package/@jalno/vite-plugin)

If you have used [Jalno](https://jalno.ir/) before, you propebly used other packages of [Jalno Organization](https://github.com/jalno/).  
Each [Jalno Package](https://jalno.ir/package) may has one or more [Frontend](https://jalno.ir/frontend) and each frontend may has some assets.  
If you are familiar with `Jalno`, probably you are familiar with [node_webpack](https://github.com/jalno/node_webpack/), a Jalno package that use `webpack` under the hode to find all assets and bundle them into a file.

In new version of Jalno, we migrate from legacy directory hierarchy into new style, usign [composer](https://getcomposer.org/).  
This package do the same as `node_webpack`, but more faster and efficient, thanks to lovely [Vite](https://vite.dev/)

This plugin supports finding Jalno frontends, themes, and translator phrases  
Also, this plugin provides support for `Jquery` and generally, legecy code style that may be used in Jalno projects.

By default, this plugin will:

- Automatically find Jalno packages in vendor directory and install each package's frontends using npm (Enabled by default).

- Generate a corresponding chunk for every theme (styles and scripts).

- Generate a corresponding chunk for each language to use with [@jalno/translator](https://www.npmjs.com/package/@jalno/translator) package.

- Support Jalno legacy projects (Disabled by default).

- Inject some necessary injection using [@rollup/plugin-inject](https://www.npmjs.com/package/@rollup/plugin-inject) (Disabled by default).

- Configures all options that need by [Laravel](https://laravel.com/) framework to work. (manifest, publicDirectory, buildDirectory, base, ...) without need to use `laravel-vite-plugin`.  
But you can use `laravel-vite-plugin` alongside `@jalno/vite-plugin`

## Installation
```bash
npm install -D @jalno/vite-plugin
```

## Basic Usage

```js
// vite.config.js
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    jalno(),
  ],
}
```
In the basic usage, the auto install behaviour is enabled.
But, the legecy support and auto rollup inject is disabled.

## Migrate from ***node_webpack*** to ***vite***

```js
// vite.config.js
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    jalno({
        legacyPreset: true,
        rollupInject: true,
    }),
  ],
}
```

## Using alongside ***laravel-vite-plugin***
The `laravel-vite-plugin` should be placed before `@jalno/vite-plugin` in plugins array.  
Becase `laravel-vite-plugin` will ignore the passed inputs if the inputs are not empty, but `@jalno/vite-plugin` does not!
```js
// vite.config.js
import laravel from 'laravel-vite-plugin';
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    laravel({
        input: [
            'resources/js/main.js'
        ],
        refresh: true,
    }),
    jalno({
        legacyPreset: true,
        rollupInject: true,
    }),
  ],
}
```


### Auto Install Configuration
You can configure auto install using this sample code.  
This options is ***enabled*** by default.  
You don't need to change anything, in case of you know what are you doing.  
For more information about options, see: [JalnoAutoInstallPlugin](https://github.com/jalno/vite-plugin/blob/master/src/JalnoAutoInstallPlugin.ts#L10)
```js
// vite.config.js
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    jalno({
        // disable auto install using:
        autoInstall: false,

        // or

        // configure behaviour of auto install:
        autoInstall: {
            /**
             * The path to binary of the `npm`
             * @default `npm`
             */
            npmBinary: 'npm',

            /**
             * Log level of npm.
             * Use can turn off npm warns by setting log level.
             * Values: "silent" | "error" | "warn" | "notice" | "http" | "info" | "verbose" | "silly"
             * @default `notice`
             */
            npmLogLevel: 'notice',

            /**
             * The default install command.
             * @default `install`
             */
            installCommand: 'install',

            /**
             * Additional packages to install along with jalno packages.
             * @default `[]`
             */
            additionalPackages: [],
        }
    }),
  ],
}
```

### Legacy Preset
You can configure legecy preset using this sample code.  
This options is ***disabled*** by default.  
Probably you need to enable this option if you want to migrate from `node_webpack` to `vite`.  
For more information about options, see: [JalnoLegacyPresetPlugin](https://github.com/jalno/vite-plugin/blob/master/src/JalnoLegacyPresetPlugin.ts#L5)
```js
// vite.config.js
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    jalno({
        // turn off legacy preset, (default is turned off)
        legacyPreset: false,

        // or

        // turn on it using:
        legacyPreset: true,

        // or

        // turn on with configuring options:
        /*
        * @see https://github.com/jalno/vite-plugin/blob/master/src/JalnoLegacyPresetPlugin.ts#L5
        */
        legacyPreset: {
            // configureDefaultAliases by default `true`.
            configureDefaultAliases: true,
        },
    }),
  ],
}
```

### Rollup Inject
If you enabled ***Legacy Preset*** in previous step, you probably need to enable this option too!
This options is ***disabled*** by default.  
If you enable this options, the plugin using `@rollup/plugin-inject` under the hood.  
The default configuration of the plugins is in: [index.ts -> getDefaultRollupInjectOptions](https://github.com/jalno/vite-plugin/blob/master/src/index.ts#L39)

You can configure rollup inject using this sample code.  
Probably you need to enable this option if you want to migrate from `node_webpack` to `vite`.  
For more information about options, see: [Rollup Inject](https://github.com/jalno/vite-plugin/blob/master/src/index.ts#L32)  



```js
// vite.config.js
import jalno, { Project as JalnoProject } from '@jalno/vite-plugin';

// Set the root of project into plugin.
// Otherwise, plugin will warn about that, but still working using `process.cwd()`
JalnoProject.setRoot(import.meta.dirname);

export default {
  plugins: [
    jalno({
        // disable rollup inject (default is disabled)
        rollupInject: false,

        // or

        // enable with default configuration:
        rollupInject: true,

        // enable with passing your extra options to `@rollup/plugin-inject`
        rollupInject: {
            // enable source map, disabled by default.
            sourceMap: true,

            // Add another modules to `@rollup/plugin-inject`.
            modules: {
                // $: 'jquery',
            },
        },
    }),
  ],
}
```
You need to install the `@rollup/plugin-inject` plugin in your root project to use this option.  
To install this plugin, run:

```sh
npm add -D @rollup/plugin-inject
```

## References

- [Plugin API](https://vite.dev/guide/api-plugin)
- [Jalno Framework](https://jalno.ir/)
- [Jalno Organization](https://github.com/jalno/)