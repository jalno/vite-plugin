import { Plugin, UserConfig, normalizePath, loadEnv } from 'vite'
import { InputOption } from "rollup"
import pc from "picocolors"
import Frontend, { JalnoFrontendFileScriptAsset, JalnoFrontendFileStyleAsset } from './Jalno/Frontend';
import path from 'path';
import Project from './Project';
import fs from "fs/promises";
import logger from './logger';
import Packages from './Jalno/Packages';

export interface PluginConfig {
    /**
     * Laravel's public directory.
     * @note This config is only applied if not applied by `laravel-vite-plugin` before.
     *
     * @default 'public'
     */
    publicDirectory?: string,

    /**
     * The public subdirectory where compiled assets should be written.
     * @note This config is only applied if not applied by `laravel-vite-plugin` before.
     *
     * @default 'build'
     */
    buildDirectory?: string,

    /**
     * Laravel's resources directory.
     *
     * @default 'resources'
     */
    resourcesDirectory?: string,

    /**
     * The subdirectory where jalno themes stylesheet files should be written.
     *
     * @default `${resourcesDirectory}/css`
     */
    stylesDirectory?: string

    /**
     * The subdirectory where jalno themes stylesheet files should be written.
     *
     * @default `${resourcesDirectory}/js`
     */
    scriptsDirectory?: string,

    /**
     * The extension of stylesheet file of each theme.
     *
     * @default 'css'
     */
    outputStyleFileExtension?: string,

    /**
     * The extension of stylesheet file of each theme.
     *
     * @default 'js'
     */
    outputScriptFileExtension?: string,

    /**
     * The type of stylesheets we are looking for in frontend assets.
     *
     * @default ["css","less","scss"]
     */
    styleAssetsType?: string | string[],

    /**
     * The type of scripts we are looking for in frontend assets.
     *
     * @default ["js","jsx","ts","tsx"]
     */
    scriptAssetsType?: string | string[],

    /**
     * The format of translator phrases format.
     * You can use '[code]' variable in the format for language code.
     *
     * @default 'translator-[code].[outputScriptFileExtension]'
     */
    translatorFilesNamesFormat?: string,
}

export default class JalnoPlugin {
    /**
     *
     * @param pluginConfig The validated and fullfiled configuration of plugin.
     *  You can achive fullfiled configuration using `JalnoPlugin.resolveConfig(config: PluginConfig)` method.
     * @returns Just another plugin for vite.
     */
    public static resolve(pluginConfig: Required<PluginConfig>): Plugin {
        return {
            name: 'jalno',
            enforce: 'post',

            async config(config: UserConfig, { command, mode }) {
                const env = loadEnv(mode, config.envDir || process.cwd(), '');
                const assetUrl = env.ASSET_URL ?? '';

                return {
                    base: config.base ?? (command === 'build'
                        ? JalnoPlugin.resolveBase(pluginConfig, assetUrl)
                        : '/'
                    ),

                    /**
                     * Directory to vite-pluginserve as plain static assets.
                     * We don't need this, also `laravel-vite-plugin` doesn't.
                     */
                    publicDir: config.publicDir ?? false,

                    build: {
                        /**
                         * We only configure `build.outDir` option to `${publicDirectory}/${buildDirectory}` of plugin config
                         * in case of this option does not configures before.
                         * It may be configured by `laravel-vite-plugin` or provided by user in `vite.config.js` file.
                         */
                        outDir: config.build?.outDir ?? path.join(pluginConfig.publicDirectory, pluginConfig.buildDirectory),

                        /**
                         * We only configure `build.manifest` option to `manifest.json` file if does not configured before.
                         * It may be configured by `laravel-vite-plugin` or provided by user in `vite.config.js` file.
                         * We need manifest for backend integration with laravel.
                         */
                        manifest: config.build?.manifest ?? 'manifest.json',

                        assetsInlineLimit: config.build?.assetsInlineLimit ?? 0,

                        rollupOptions: {
                            /**
                             * We aim to add our files to input of rollup.
                             * If you need to add other files, you can simply add it to `vite.config.js` file.
                             * If you want to use `laravel-vite-plugin`, you should add it before '@jalno-vite-plugin' in plugins array.
                             * @example `plugins: [laravel(input: ['resources/js/laravel.js']), jalno()]`
                             */
                            input: await JalnoPlugin.resolveInput(pluginConfig, config),
                        },
                    },
                };
            },

            configResolved: (config) => {
                if (!Project.hasRoot()) {
                    Project.setRoot(config.root);
                }
            },
        };
    }

    /**
     * Make plugin configuration and set default values from user given configuration.
     *
     * @param config The user given configuration.
     * @returns The validated and fullfiled configuration for plugin.
     */
    public static resolveConfig(config: PluginConfig): Required<PluginConfig> {
        if (typeof config === 'undefined') {
            throw new Error('[@jalno/vite-plugin][JalnoPlugin]: missing configuration.');
        }

        const root = Project.getRoot();
        const removeRootFromPathIfExists = (path: string) => {
            if (path.startsWith(root)) {
                return path.substring(root.length + 1);
            }

            return path;
        };

        if (typeof config.publicDirectory === 'string') {
            config.publicDirectory = normalizePath(
                removeRootFromPathIfExists(config.publicDirectory).trim().replace(/^\/+/, '')
            );

            if (config.publicDirectory === '') {
                throw new Error('[@jalno/vite-plugin][JalnoPlugin]: publicDirectory must be a subdirectory. E.g. \'public\'.')
            }
        }

        if (typeof config.buildDirectory === 'string') {
            config.buildDirectory = normalizePath(
                removeRootFromPathIfExists(config.buildDirectory).trim().replace(/^\/+/, '')
            );

            if (config.buildDirectory === '') {
                throw new Error('[@jalno/vite-plugin][JalnoPlugin]: buildDirectory must be a subdirectory. E.g. \'build\'.')
            }
        }

        if (typeof config.resourcesDirectory === 'string') {
            config.resourcesDirectory = normalizePath(
                removeRootFromPathIfExists(config.resourcesDirectory).trim().replace(/^\/+/, '')
            );

            if (config.resourcesDirectory === '') {
                throw new Error('[@jalno/vite-plugin][JalnoPlugin]: resourcesDirectory must be a subdirectory. E.g. \'resources\'.')
            }
        }

        if (typeof config.stylesDirectory === 'string') {
            config.stylesDirectory = normalizePath(
                removeRootFromPathIfExists(config.stylesDirectory).trim().replace(/^\/+/, '')
            );

            if (config.stylesDirectory === '') {
                throw new Error('[@jalno/vite-plugin][JalnoPlugin]: stylesDirectory must be a subdirectory. E.g. \'resources/css\'.')
            }
        }

        if (typeof config.scriptsDirectory === 'string') {
            config.scriptsDirectory = normalizePath(
                removeRootFromPathIfExists(config.scriptsDirectory).trim().replace(/^\/+/, '')
            );

            if (config.scriptsDirectory === '') {
                throw new Error('[@jalno/vite-plugin][JalnoPlugin]: scriptsDirectory must be a subdirectory. E.g. \'resources/js\'.')
            }
        }

        if (typeof config.styleAssetsType === 'string') {
            config.styleAssetsType = [config.styleAssetsType];
        }

        if (typeof config.scriptAssetsType === 'string') {
            config.scriptAssetsType = [config.scriptAssetsType];
        }

        return {
            buildDirectory: config.buildDirectory ?? 'build',
            publicDirectory: config.publicDirectory ?? 'public',

            resourcesDirectory: config.resourcesDirectory ?? 'resources',
            stylesDirectory: config.stylesDirectory ?? path.join((config.resourcesDirectory ?? 'resources'), 'css'),
            scriptsDirectory: config.scriptsDirectory ?? path.join((config.resourcesDirectory ?? 'resources'), 'js'),

            outputStyleFileExtension: config.outputStyleFileExtension ?? 'css',
            outputScriptFileExtension: config.outputScriptFileExtension ?? 'js',

            styleAssetsType: config.styleAssetsType ?? ['css', 'less', 'scss'],
            scriptAssetsType: config.scriptAssetsType ?? ['js', 'jsx', 'ts', 'tsx'],

            translatorFilesNamesFormat: config.translatorFilesNamesFormat ?? `translator-[code].${config.outputScriptFileExtension ?? 'js'}`,
        };
    }

    protected static resolveBase(pluginConfig: Required<PluginConfig>, assetUrl: string): string {
        return assetUrl + (! assetUrl.endsWith('/') ? '/' : '') + pluginConfig.buildDirectory + '/';
    }

    protected static async resolveInput(pluginConfig: Required<PluginConfig>, config: UserConfig): Promise<InputOption> {
        const input: InputOption = [];

        if (typeof config.build?.rollupOptions?.input === 'string') {
            input.push(config.build.rollupOptions.input);
        } else {
            if (Array.isArray(config.build?.rollupOptions?.input)) {
                input.push(...config.build.rollupOptions.input);
            } else {
                for (const index in config.build?.rollupOptions?.input) {
                    input.push(config.build.rollupOptions.input[index]);
                }
            }
        }

        /**
         * Try to load packages just for one time before tring to get assets files.
         * Because both `generateStyleFiles` and `generateScriptFiles` try to call it at same time.
         * This will cause throw duplicate package error.
         */
        await Packages.getInstance().load();

        const groupedFiles = (await Promise.all([
            this.generateStyleFiles(pluginConfig),
            this.generateScriptFiles(pluginConfig),
            this.generateLanguageFiles(pluginConfig),
        ]));

        for (const files of groupedFiles) {
            input.push(...files);
        }

        return input;
    }

    protected static async generateLanguageFiles(config: Required<PluginConfig>): Promise<string[]> {
        type TranslatorItem = {
            source: `${string}-package` | `${string}-frontend`,
            phrases: Record<string, string>,
            rtl: boolean,
        };
        const translator: Record<string, TranslatorItem[]> = {};

        for (const p of await Packages.getInstance().all()) {
            for (const language of p.languages) {
                translator[language.code] = translator[language.code] || [];
                translator[language.code].push({
                    source: `${p.name}-package`,
                    rtl: language.isRtl,
                    phrases: language.phrases,
                });
            }

            for (const f of p.frontends) {
                for (const language of f.languages) {
                    translator[language.code] = translator[language.code] || [];
                    translator[language.code].push({
                        source: `${f.name}-frontend`,
                        rtl: language.isRtl,
                        phrases: language.phrases,
                    });
                }
            }
        }

        const builder = async (code: string, items: TranslatorItem[]) => {
            const content = "// This file is generated by @jalno/vite-plugin, DO NOT EDIT IT MANUALLY!\n\n"
                + ";window.jalno = window.jalno || {};\n"
                + "window.jalno.translator = window.jalno.translator || {};\n"
                + `window.jalno.translator['${code}'] = window.jalno.translator['${code}'] || [];\n\n`
                + items
                    .map(
                        (item) => `window.jalno.translator.${code}.push(${JSON.stringify(item, null, 2)});`
                    )
                    .join("\n\n")
                + "\n";

            await fs.mkdir(config.scriptsDirectory, { recursive: true });

            const fileToWrite = path.join(config.scriptsDirectory, config.translatorFilesNamesFormat.replace('[code]', code));
            logger.info(`Write ${pc.bold('translator')} file for language code '${pc.italic(code)}' into: ${pc.green(fileToWrite)}`);
            await fs.writeFile(fileToWrite, content);

            return fileToWrite;
        };

        const files: Promise<string>[] = [];
        for (const code in translator) {
            files.push(builder(code, translator[code]));
        }

        return await Promise.all(files);
    }

    /**
     * Compile all style files into single file.
     * We use `styleAssetsType` option in config to gather related files.
     * The output files extention are defined by `outputStyleFileExtension` config option.
     *
     * @returns Path of compiled files.
     */
    protected static async generateStyleFiles(config: Required<PluginConfig>) {
        return this.generateCompiledFiles(config, 'style');
    }

    /**
     * Compile all script files into single file.
     * We use `scriptAssetsType` option in config to gather related files.
     * The output files extention are defined by `outputScriptFileExtension` config option.
     *
     * @returns Path of compiled files.
     */
    protected static async generateScriptFiles(config: Required<PluginConfig>) {
        return this.generateCompiledFiles(config, 'script');
    }

    /**
     *
     * @param config The config of the plugin, `styleAssetsType` or `scriptAssetsType` are used for gather assets type.
     *  Also we use `stylesDirectory` or `scriptsDirectory` to store output files.
     *  And `outputStyleFileExtension` or `outputScriptFileExtension` for the extention of each file.
     * @param type `style` or `script`
     * @returns The compiled files for each theme.
     */
    protected static async generateCompiledFiles(config: Required<PluginConfig>, type: 'style'|'script') {
        const getDate = () => {
            return (new Date).toISOString();
        }

        const importStatement = (path: string) => {
            return type === 'style'
                ? `@import "${path}";`
                : `import "${path}";`;
        };

        const frontContentGenerator = (name: string, files: string[], repository: string[], indent = '  ') => {
            let content = indent + `/* ** START FRONTEND '${name}' ASSETS AT (${getDate()}) ** */` + "\n";
            if (files.length === 0) {
                content += indent.repeat(2) + "/* // EMPTY */" + "\n";
            }

            for (const file of files) {
                if (repository.includes(file)) {
                    content += indent.repeat(2) + `/* DUPLICATE: ${importStatement(file)} */` + "\n";
                } else {
                    content += indent.repeat(2) + importStatement(file) + "\n";
                    repository.push(file);
                }
            }
            return content + indent + `/* ** END FRONTEND '${name}' ASSETS AT (${getDate()}) ** */` + "\n";
        };

        const themeContentGenerator = (name: string, frontends: Record<string,{frontend: string, files: string[]}>): string => {
            let content = `/* * START THEME '${name}' ASSETS AT (${getDate()}) * */` + "\n\n";
            const repository: string[] = [];
            for (const index in frontends) {
                const frontend = frontends[index];
                content += frontContentGenerator(frontend.frontend, frontend.files, repository) + "\n";
            }
            return content + `/* * END THEME '${name}' ASSETS AT (${getDate()}) * */`;
        };

        const outputDirectory = type === 'style'
            ? config.stylesDirectory
            : config.scriptsDirectory;

        const extension = type === 'style'
            ? config.outputStyleFileExtension
            : config.outputScriptFileExtension;

        const builder = async (theme: {
            theme: string;
            frontends: Record<string, {
                frontend: string;
                files: string[];
            }>}
        ) => {
            const content = "/* This file is generated by @jalno/vite-plugin, DO NOT EDIT IT MANUALLY! */\n\n"
                + (type === 'script'
                    ? ";window.jalno = window.jalno || {};\n"
                        + "window.jalno.translator = window.jalno.translator || {};\n\n"
                    : ""
                ) + themeContentGenerator(theme.theme, theme.frontends) + "\n";

            await fs.mkdir(outputDirectory, { recursive: true });

            const fileToWrite = path.join(outputDirectory, `${theme.theme}.${extension}`);
            const fileToWriteLog = type === 'script' ? pc.cyan(fileToWrite) : pc.magenta(fileToWrite);
            logger.info(`Write ${pc.bold(type)} file into: ${fileToWriteLog}`);
            await fs.writeFile(fileToWrite, content);

            return fileToWrite;
        }

        const resolvedAssets = await this.resolveAssetsByType(type === 'style' ?
            config.styleAssetsType :
            config.scriptAssetsType
        );

        const promises: Promise<string>[] = [];
        for (const index in resolvedAssets) {
            const theme = resolvedAssets[index];

            promises.push(builder(theme));
        }

        return await Promise.all(promises);
    }

    protected static async resolveAssetsByType(types: string | string[]) {
        const themes: Record<string, {
            theme: string,
            frontends: Record<string, {
                frontend: string,
                files: string[],
            }>,
        }> = {};

        const onlyUniqes = <T>(value: T, index: number, array: T[]) => array.indexOf(value) === index;

        for (const frontend of await Frontend.getAllFrontends()) {
            themes[frontend.name] = themes[frontend.name] ?? {
                theme: frontend.name,
                frontends: {},
            };

            const assetsFiles = frontend.getAssetsByType(types, true)
                .map((asset) => this.getPathToAsset(
                    asset as JalnoFrontendFileScriptAsset | JalnoFrontendFileStyleAsset,
                    frontend
                ))
                .filter(onlyUniqes);

            themes[frontend.name].frontends[frontend.getNpmLikeName()] = {
                frontend: frontend.getNpmLikeName(),
                files: assetsFiles,
            };
        }

        return themes;
    }

    private static getPathToAsset(asset: JalnoFrontendFileScriptAsset | JalnoFrontendFileStyleAsset, frontend: Frontend): string {
        if (asset.file.startsWith("node_modules/")) {
            return asset.file.substring("node_modules/".length);
        }

        return `${frontend.getNpmLikeName()}/${asset.file}`;
    }
}