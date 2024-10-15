import logger from "./logger";

export default class Project {
    protected static rootDirectory: string|null = null;

    public static setRoot(path: string) {
        this.rootDirectory = path;
    }

    /**
     * Get the root directory of the project.
     * Where we have a `composer.json` file and maybe have a `vendor` directory that has a `vendor/composer/installed.json` file exists.
     * I use cwd of the process, that means the directory we executed npm commands.
     */
    public static getRoot(): string {
        if (!this.rootDirectory) {
            this.rootDirectory = process.cwd();

            logger.warnOnce(`The root directory does not configured, fallback to process.cwd() [${this.rootDirectory}]`);
        }

        return this.rootDirectory;
    }
}