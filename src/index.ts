import { Plugin } from 'vite'
import Project from './Project';
import inject, {RollupInjectOptions} from '@rollup/plugin-inject';
import JalnoPlugin, {PluginConfig as JalnoPluginConfig} from './JalnoPlugin';
import JalnoAutoInstallPlugin, {PluginConfig as JalnoAutoInstallPluginConfig} from './JalnoAutoInstallPlugin';
import JalnoLegacyPresetPlugin , {PluginConfig as JalnoLegacyPresetPluginConfig} from './JalnoLegacyPresetPlugin';

export interface JalnoGeneralConfig extends JalnoPluginConfig {
    /**
     * Should auto install frontend packages into the main package?
     * Enabled by default with default options.
     *
     * @default true
     */
    autoInstall?: JalnoAutoInstallPluginConfig | boolean,

    /**
     * Should use useJalnoLegacyPreset?
     * In useJalnoLegacyPreset, we configured some default options for 'vite' for our current projects.
     * In new projects you propebly don't need to enable this.
     * But in current projects you have to enable it to prevent facing errors!
     *
     * @default false
     */
    legacyPreset?: JalnoLegacyPresetPluginConfig | boolean,

    /**
     * Should use '@rollup/plugin-inject' plugin?
     * You should enable this in legacy projects.
     * @default false
     */
    rollupInject?: RollupInjectOptions | boolean,
}

/**
 * Get default configuration for '@rollup/plugin-inject' plugin.
 * This configuration mostly used for legacy projects.
 */
export const getDefaultRollupInjectOptions = (options?: RollupInjectOptions): RollupInjectOptions => {
    return {
        /**
         * Skip source map generation. This will improve performance.
         */
        sourceMap: options?.sourceMap ?? false,

        modules: {
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            'window.moment': 'moment',
            'moment': 'moment',
            "t": ["@jalno/translator", "t"],
            "Translator": ["@jalno/translator", "default"],
            ...options?.modules,
        },

        exclude: Array.isArray(options?.exclude)
            ? [
                "**/*.css",
                ...(options?.exclude ?? []),
            ]
            : (options?.exclude
                ? ["**/*.css", options?.exclude]
                : ["**/*.css"]
            ),

        include: options?.include,
    };
}

const resolveConfig = (config: JalnoGeneralConfig): Required<JalnoGeneralConfig & {
    autoInstall: JalnoAutoInstallPluginConfig | false,
    legacyPreset: JalnoLegacyPresetPluginConfig | false,
    rollupInject: RollupInjectOptions | false,
}> => {
    if (typeof config === 'undefined') {
        throw new Error('[@jalno/vite-plugin] missing configuration.');
    }

    const boolSafeOptions = <T>(options?: T | boolean, defaults: T | false = false) => {
        if (typeof options === 'undefined') {
            return defaults;
        }
        if (typeof options === 'boolean') {
            if (options) {
                return {} as T;
            } else {
                return false;
            }
        }
        return options;
    };
    return {
        ...JalnoPlugin.resolveConfig(config),

        autoInstall: boolSafeOptions(config?.autoInstall, JalnoAutoInstallPlugin.resolveConfig({

        })),

        legacyPreset: boolSafeOptions(config.legacyPreset, false),

        rollupInject: boolSafeOptions(config.rollupInject, false),
    };
};

/**
 * Jalno plugin for Vite.
 *
 * @param config - A config object that configures behaviour of the plugin, you don't need to edit anything in 99 percents of time.
 */
export default function jalno(config: JalnoGeneralConfig = {}): Plugin[] {
    const {
        autoInstall,
        rollupInject,
        legacyPreset,
        ...jalnoPluginConfig
    } = resolveConfig(config);

    const plugins: Plugin[] = [];

    if (autoInstall) {
        plugins.push(
            JalnoAutoInstallPlugin.resolve(
                JalnoAutoInstallPlugin.resolveConfig(autoInstall)
            )
        );
    }

    if (rollupInject) {
        plugins.push(
            inject(
                getDefaultRollupInjectOptions(rollupInject)
            )
        );
    }

    plugins.push(
        JalnoPlugin.resolve(
            JalnoPlugin.resolveConfig(jalnoPluginConfig)
        )
    );

    if (legacyPreset) {
        plugins.push(
            JalnoLegacyPresetPlugin.resolve(
                JalnoLegacyPresetPlugin.resolveConfig(legacyPreset)
            )
        );
    }

    return plugins;
}

/**
 *
 * @param config A config object that configures behaviour of the plugin, again you don't need to edit anything in 99 percents of time.
 * @returns
 */
export function jalnoAutoInstall(config: JalnoAutoInstallPluginConfig = {}): Plugin {
    return JalnoAutoInstallPlugin.resolve(
        JalnoAutoInstallPlugin.resolveConfig(config)
    );
}

export function jalnoLegacyPreset(config: JalnoLegacyPresetPluginConfig = {}): Plugin {
    return JalnoLegacyPresetPlugin.resolve(
        JalnoLegacyPresetPlugin.resolveConfig(config)
    )
}

export {Project, JalnoPlugin, JalnoAutoInstallPlugin, JalnoLegacyPresetPlugin};
