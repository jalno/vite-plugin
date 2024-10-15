import path from 'path';
import { Plugin, UserConfig } from 'vite';
import Project from './Project';

export interface PluginConfig {
    /**
     * Should configure default aliases?
     * @default true
     */
    configureDefaultAliases?: boolean,
}

export default class JalnoLegacyPresetPlugin {
    /**
     * @returns Just another plugin for vite.
     */
    public static resolve(pluginConfig: Required<PluginConfig>): Plugin {
        return {
            name: 'jalno-legacy-preset',
            enforce: 'post',

            config(config: UserConfig) {
                return {
                    build: {
                        commonjsOptions: {
                            /**
                             * Jquery plugins use 'require' to find Jquery, So we should convert them to ES.
                             * Browsers does not support 'require'.
                             */
                            transformMixedEsModules: true,
                        },
                        rollupOptions: {
                            /**
                             * We use 'window' as global this.
                             * Because some of Jquery plugins using 'this' as window.
                             */
                            context: 'window',
                        },
                        terserOptions: {
                            format: {
                                /**
                                 * Disable comments in case if using 'terser' as minifier to reduce size of output bundle.
                                 */
                                comments: config?.build?.terserOptions?.format?.comments ?? false,
                            },
                        },
                    },
                    esbuild: config?.esbuild ?? {
                        /**
                         * Disable legal comments to reduce size of output bundle.
                         */
                        legalComments: 'none',
                    },
                    resolve: {
                        alias: JalnoLegacyPresetPlugin.resolveAliases(config, pluginConfig),
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

    public static resolveConfig(config: PluginConfig): Required<PluginConfig> {
        if (typeof config === 'undefined') {
            throw new Error('[@jalno/vite-plugin][JalnoLegacyPresetPlugin]: missing configuration.');
        }

        return {
            configureDefaultAliases: config?.configureDefaultAliases ?? true,
        };
    }

    protected static resolveAliases(config: UserConfig, pluginConfig: Required<PluginConfig>) {
        const defaultAliases = JalnoLegacyPresetPlugin.resolveDefaultAliases();

        if (!pluginConfig.configureDefaultAliases) {
            return config.resolve?.alias;
        }

        if (Array.isArray(config.resolve?.alias)) {
            return [
                ...config.resolve?.alias ?? [],
                ...Object.keys(defaultAliases).map(alias => ({
                    find: alias,
                    replacement: defaultAliases[alias],
                }))
            ];
        }

        return {
            ...defaultAliases,
            ...config.resolve?.alias,
        };
    }

    protected static resolveDefaultAliases() {
        const root = Project.getRoot();

        const defaultAliases: Record<string, string> = {
            'moment/locale/ar': path.resolve(root, 'node_modules/moment/locale/ar.js'),
            'moment/locale/fa': path.resolve(root, 'node_modules/moment/locale/fa.js'),
            'moment/moment': path.resolve(root, 'node_modules/moment/moment.js'),
            'moment': path.resolve(root, 'node_modules/moment/moment.js'),
        };

        return defaultAliases;
    }
}
