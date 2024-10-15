import path from 'path';
import fs from 'fs/promises';
import Packages from './Packages';
import logger from '../logger';
import Utils from '../Utils';

export type JalnoFrontendInlineScriptAsset = {
    type: "inline",
    code: string,
};

export type JalnoFrontendFileScriptAsset = {
    type: "js" | "jsx" | "ts" | "tsx",
    file: string,
};

export type JalnoFrontendScriptAsset = JalnoFrontendInlineScriptAsset | JalnoFrontendFileScriptAsset;


export type JalnoFrontendInlineStyleAsset = {
    type: "inline",
    code: string,
};

export type JalnoFrontendFileStyleAsset = {
    type: "css" | "less" | "scss",
    file: string,
};

export type JalnoFrontendStyleAsset = JalnoFrontendInlineStyleAsset | JalnoFrontendFileStyleAsset;

export type JalnoFrontendPackageAsset = {
    type: "package",
    name: string,
    version: string,
};

export type JalnoFrontendAsset = JalnoFrontendPackageAsset |
    JalnoFrontendScriptAsset |
    JalnoFrontendInlineScriptAsset |
    JalnoFrontendStyleAsset |
    JalnoFrontendInlineStyleAsset;

export type JalnoFrontendLanguageKey = `${string}_${string}`;
export type JalnoFrontendLanguage = Record<JalnoFrontendLanguageKey, string>;

export type JalnoFrontend = {
    /**
     * The name of the frontend.
     * We group frontends using this name.
     */
    name: string,

    /**
     * The title of the frontend that is in human readable format.
     */
    title: string,

    /**
     * Assets of the frontend.
     * Currently we just use 'file' assets in our plugin.
     * Inline assets handled by the jalno framework.
     * We does not care about package assets anymore, They should be deprecated. We relly on `package.json` file.
     */
    assets?: JalnoFrontendAsset[],

    /**
     * Languages of each frontend.
     */
    languages?: JalnoFrontendLanguage,
};

export default class Frontend {

    public static async getAllFrontends() {
        const frontends: Frontend[] = [];

        for (const p of await Packages.getInstance().all()) {
            for (const frontend of p.frontends) {
                frontends.push(frontend);
            }
        }

        return frontends;
    }

    public static async fromManifest(jalnoPackageName: string, frontendHomePath: string) {
        let manifestFilePath = path.resolve(frontendHomePath, "jalno.json");

        if (! (await Utils.fileExists(manifestFilePath))) {
            // fallback to old-style manifest file naming convention.
            manifestFilePath = path.resolve(frontendHomePath, "theme.json");

            if (await Utils.fileExists(manifestFilePath)) {
                logger.warn(`[Frontend:fromManifest] Using 'theme.json' as frontend manifest is deprected! Use 'jalno.json' instead! [${manifestFilePath}]`);
            } else {
                logger.error(
                    `[Frontend:fromManifest] Can not find neither 'jalno.json' nor 'theme.json' file in '${frontendHomePath}' for the '${jalnoPackageName}' package!`
                );

                throw new Error(`[@jalno/vite-plugin] [Frontend:fromManifest] Can not find neither 'jalno.json' nor 'theme.json' file in '${frontendHomePath}' for the '${jalnoPackageName}' package!`);
            }
        }

        const jalno: JalnoFrontend = JSON.parse(
            (await fs.readFile(manifestFilePath)).toString("utf8")
        );

        const frontend = new Frontend(frontendHomePath, jalno.name, manifestFilePath, jalnoPackageName);
        frontend.assets = jalno.assets ?? [];
        return frontend;
    }

    protected immutableAssets: JalnoFrontendAsset[] | undefined = undefined;

    constructor(
        public readonly home: string,
        public readonly name: string,
        public readonly manifestFilePath: string,
        public readonly jalnoPackageName: string,
    ) {
        //
    }

    public set assets(value: JalnoFrontendAsset[]) {
        if (typeof this.immutableAssets !== 'undefined') {
            throw new Error('[@jalno/vite-plugin] [Frontend:assets] Assets of frontend are immutable.');
        }

        this.immutableAssets = value;
    }

    public get assets(): JalnoFrontendAsset[] {
        return this.immutableAssets ?? [];
    }

    public getAssetsByType(type: string | string[] | undefined = undefined, hasFiles: boolean | undefined = undefined) {
        if (typeof type === "string") {
            type = [type];
        }
        return this.assets
            .filter((asset) => {
                return (type === undefined || type.includes(asset.type))
                    && (hasFiles === undefined
                        || asset.hasOwnProperty("file") == hasFiles // eslint-disable-line no-prototype-builtins
                    );
            });
    }

    public getNpmLikeName(): string {
        return `jalno-${this.jalnoPackageName}-${path.basename(this.home)}`;
    }
}