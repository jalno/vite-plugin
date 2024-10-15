import { Plugin } from 'vite'
import Project from './Project';
import JalnoPlugin, {PluginConfig as JalnoPluginConfig} from './JalnoPlugin';
import JalnoAutoInstallPlugin, {PluginConfig as JalnoAutoInstallPluginConfig} from './JalnoAutoInstallPlugin';

/**
 * Jalno plugin for Vite.
 *
 * @param config - A config object that configures behaviour of the plugin, you don't need to edit anything in 99 percents of time.
 */
export default function jalno(config: JalnoPluginConfig = {}): Plugin | Plugin[] {
    const resolvedConfig = JalnoPlugin.resolveConfig(config);

    if (resolvedConfig.autoInstall) {
        return [
            JalnoAutoInstallPlugin.resolve(
                JalnoAutoInstallPlugin.resolveConfig(resolvedConfig.autoInstall)
            ),
            JalnoPlugin.resolve(
                resolvedConfig
            ),
        ];
    }

    return JalnoPlugin.resolve(
        resolvedConfig
    );
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

export {Project, JalnoPlugin, JalnoAutoInstallPlugin};