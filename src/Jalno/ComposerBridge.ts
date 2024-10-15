import path from "path";
import fs from "fs/promises";
import Project from "../Project";
import Package from "./Package";
import logger from "../logger";
import Utils from "../Utils";

type ComposerPackage = {
    name: string,
    extra?: {
        jalno?: {
            manifest?: string,
        },
    },
};

type ComposerInstalledFile = {
    packages: ComposerPackage[],
};

export default class ComposerBridge {
    public static async getRootJalnoPackage() {
        const root = Project.getRoot();
        const composerFilePath = path.resolve(root, "composer.json");

        if (await Utils.fileExists(composerFilePath)) {
            const composer: ComposerPackage = JSON.parse(
                (await fs.readFile(composerFilePath)).toString("utf8")
            );

            if (composer.extra?.jalno?.manifest !== undefined) {
                const manifestFilePath = path.resolve(root, composer.extra.jalno.manifest);
                const name = this.getJalnoPackageNameFromComposerName(composer.name);
                return Package.fromManifest(name, manifestFilePath);
            }
        } else {
            logger.warn(`[ComposerBridge:getRootJalnoPackage] composer.json not exists in: ${composerFilePath}`);
        }
    }

    public static async getInstalledJalnoPackages() {
        const root = Project.getRoot();
        const composerInstalledFile = path.resolve(root, "vendor", "composer", "installed.json");

        const promises: Promise<Package>[] = [];
        if (await Utils.fileExists(composerInstalledFile)) {
            const installed: ComposerInstalledFile = JSON.parse(
                (await fs.readFile(composerInstalledFile)).toString("utf8")
            );

            for (const composerPackage of installed.packages) {
                if (composerPackage.extra?.jalno?.manifest !== undefined) {
                    promises.push(
                        Package.fromManifest(
                            this.getJalnoPackageNameFromComposerName(composerPackage.name),
                            path.resolve(root, "vendor", composerPackage.name, composerPackage.extra.jalno.manifest)
                        )
                    );
                }
            }
        } else {
            logger.error(
                `[ComposerBridge:getInstalledJalnoPackages]: installed.json does not exists in: ${composerInstalledFile}`
                + '\n\t Hint: Install composer packages using `composer install` command.'
            );

            throw new Error(
                `[@jalno/vite-plugin] installed.json does not exists in: ${composerInstalledFile}!`
                + " Try install composer packages using `composer install` command."
            );
        }

        return Promise.all(promises);
    }

    protected static getJalnoPackageNameFromComposerName(composerName: string) {
        return composerName.substring(
            composerName.indexOf('/') + 1
        );
    }
}