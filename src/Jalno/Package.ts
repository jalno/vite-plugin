import fs from "fs/promises";
import path from 'path';
import Frontend from "./Frontend";
import LanguageFile from "./LanguageFile";
import Utils from "../Utils";

export type JalnoPackageLanguageKey = `${string}_${string}`;
export type JalnoPackageLanguage = {
    [k: JalnoPackageLanguageKey]: string,
};

type JalnoPackage = {
    frontend?: string | string[],
    languages?: JalnoPackageLanguage,
};

export default class Package {
    public static async fromManifest(name: string, manifestFilePath: string) {
        const jalno: JalnoPackage = JSON.parse(
            (await fs.readFile(manifestFilePath)).toString("utf8")
        );

        if (jalno.frontend === undefined) {
            jalno.frontend = [];
        }
        if (typeof jalno.frontend === "string") {
            jalno.frontend = [jalno.frontend];
        }

        const frontends: Promise<Frontend>[] = [];
        const home = path.dirname(manifestFilePath);
        for (const frontendDirectoryInsidePackage of jalno.frontend) {
            frontends.push(
                Frontend.fromManifest(name, path.resolve(home, frontendDirectoryInsidePackage))
            );
        }

        const languages: Promise<LanguageFile>[] = [];
        const langsDirectory = path.join(home, 'langs');
        if (await Utils.fileExists(langsDirectory)) {
            for (const file of await fs.readdir(langsDirectory)) {
                if (!file.endsWith('.json')) {
                    continue;
                }
                const code = path.parse(file).name;
                languages.push(
                    LanguageFile.fromFile(path.join(langsDirectory, file), code)
                );
            }
        }

        return new Package(home, name, manifestFilePath, await Promise.all(frontends), await Promise.all(languages));
    }

    constructor(
        public readonly home: string,
        public readonly name: string,
        public readonly manifestFilePath: string,
        public readonly frontends: Frontend[] = [],
        public readonly languages: LanguageFile[] = []
    ) {
        //
    }
}