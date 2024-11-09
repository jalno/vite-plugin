import { Plugin, normalizePath } from 'vite'
import Frontend from './Jalno/Frontend';
import path from 'path';
import Project from './Project';
import fs from "fs/promises";
import logger from './logger';
import Utils from "./Utils";
import { spawn } from "child_process";

export interface PluginConfig {
    /**
     * The path to binary of the `npm`
     * @default `npm`
     */
    npmBinary?: string,

    /**
     * Log level of npm.
     * @default `notice`
     */
    npmLogLevel?: "silent" | "error" | "warn" | "notice" | "http" | "info" | "verbose" | "silly",

    /**
     * The default install command.
     * @default `install`
     */
    installCommand?: string,

    /**
     * Additional packages to install along with jalno packages.
     * @default `[]`
     */
    additionalPackages?: string | string[],
}

export default class JalnoAutoInstallPlugin {

    public static resolve(pluginConfig: Required<PluginConfig>): Plugin {
        return {
            name: 'jalno-auto-install',
            enforce: 'pre',

            buildStart: {
                order: 'pre',
                sequential: true,
                async handler() {
                    const root = Project.getRoot();
                    const packages = await JalnoAutoInstallPlugin.resolvePackages(root);

                    if (packages.length) {
                        await JalnoAutoInstallPlugin.npmInstall(packages, pluginConfig, root);
                    }
                },
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
            throw new Error('[@jalno/vite-plugin][JalnoAutoInstallPlugin]: missing configuration.');
        }

        if (typeof config.additionalPackages === 'string') {
            config.additionalPackages = [config.additionalPackages];
        }

        return {
            npmBinary: config?.npmBinary ?? 'npm',
            npmLogLevel: config?.npmLogLevel ?? 'notice',
            installCommand: config?.installCommand ?? 'install',
            additionalPackages: config?.additionalPackages ?? [],
        };
    }

    protected static async npmInstall(packages: string[], config: Required<PluginConfig>, projectRoot: string) {
        const args = [
            /**
             * The install command.
             */
            config.installCommand,
            /**
             * Log level of npm.
             * @see https://docs.npmjs.com/cli/v10/using-npm/config#loglevel
             */
            `--loglevel=${config.npmLogLevel}`,
            /**
             * Install the root package's devDependencies.
             * Including our package and other vite package that mostly saved in devDependencies.
             */
            "--production=false",
            /**
             * Dependencies that exist outside of the project root will be packed and installed as regular dependencies instead of creating a symlink.
             * @see https://docs.npmjs.com/cli/v8/commands/npm-install#install-links
             */
            "--install-links",
            /**
             * Do not show any message about funding to speed up.
             */
            "--no-fund",
            /**
             * Do not show any message about audit to speed up.
             */
            "--no-audit",
            /**
             * Do not save packages into root `package.json` file.
             */
            "--no-save",
        ];

        packages.push(
            ...config.additionalPackages
        );

        logger.info(`[jalno-auto-install] Running command:\n${config.npmBinary} ${args.join(" ")} \\\n\t${packages.join(" \\\n\t")}`);

        args.push(
            ...packages,
        );

        return new Promise((resolve, reject) => {
            spawn(config.npmBinary, args, {
                cwd: projectRoot,
                stdio: ['inherit', 'inherit', 'inherit'],
            })
            .on('close', (code) => {
                if (code) {
                    reject(code);
                } else {
                    resolve(code);
                }
            })
            .on('error', (err) => reject(err));
        });

    }

    /**
     * Get npm packages.
     *
     * @param projectRoot The project root to calculate relative path based on it.
     * @returns name of npm packages (actually path to the package!)
     */
    protected static async resolvePackages(projectRoot: string) {
        const promises: Promise<string | null>[] = [];
        for (const frontend of await Frontend.getAllFrontends()) {
            promises.push(
                JalnoAutoInstallPlugin.resolvePackageByFrontend(frontend, projectRoot)
            );
        }

        const paths = await Promise.all(promises);

        const packages: string[] = [];
        for(const path of paths) {
            if (path) {
                packages.push(path);
            }
        }

        return packages;
    }

    /**
     * Convert Jalno frontend to NPM package name.
     * This method may write correct name of jalno frontend into the npm's `package.json` file.
     *
     * @param frontend The Jalno frontend that we try to convert it to npm package.
     * @param projectRoot The root of the project to calculate relative path.
     * @returns name of npm package (actually path to the package!) or null in case of there is no `package.json` file.
     */
    protected static async resolvePackageByFrontend(frontend: Frontend, projectRoot: string) {
        const packageFile = path.resolve(frontend.home, "package.json");

        if (!await Utils.fileExists(packageFile)) {
            logger.warn(`Can not find 'package.json' file in: ${packageFile}`);

            return null;
        }

        let content: {
            name?: string,
        };
        try {
            content = JSON.parse(
                (await fs.readFile(packageFile)).toString("utf-8")
            );
        } catch (err) {
            logger.error(`Can not process: ${packageFile}`);
            throw err;
        }

        const packageName = frontend.getNpmLikeName();

        if (content?.name !== packageName) {
            content = {
                name: packageName,
                ...content,
            };
            await fs.writeFile(packageFile, JSON.stringify(content, undefined, "\t"));
        }

        let frontendRelativePath = normalizePath(
            path.relative(
                projectRoot,
                frontend.home
            )
        );

        /**
         * To install local NPM package, the package name should be a path.
         * If it does not contains path seprator, NPM can not detect how to install it.
         * So, we add ./ to the packages that does not have any path seprator.
         */
        if (!frontendRelativePath.includes(path.sep)) {
            frontendRelativePath = "." + path.sep + frontendRelativePath;
        }

        return frontendRelativePath;
    }

}