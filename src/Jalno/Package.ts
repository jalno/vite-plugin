import fs from "fs/promises";
import path from 'path';
import Frontend from "./Frontend";

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

        const promises: Promise<Frontend>[] = [];
        const home = path.dirname(manifestFilePath);
        for (const frontendDirectoryInsidePackage of jalno.frontend) {
            promises.push(
                Frontend.fromManifest(name, path.resolve(home, frontendDirectoryInsidePackage))
            );
        }

        return new Package(home, name, manifestFilePath, await Promise.all(promises));
    }

    constructor(
        public readonly home: string,
        public readonly name: string,
        public readonly manifestFilePath: string,
        public readonly frontends: Frontend[] = []
    ) {
        //
    }
}