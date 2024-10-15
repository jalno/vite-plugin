import Package from "./Package";
import ComposerBridge from "./ComposerBridge";
import logger from "../logger";

export default class Packages {
	protected static instance: Packages;

	public static getInstance(): Packages {
		if (!Packages.instance) {
			Packages.instance = new Packages();
		}

		return Packages.instance;
	}

	protected list: Record<string, Package> = {};

	protected isLoaded = false;

	public async all(forceReload = false) {
		await this.load(forceReload);

		return Object.values(this.list);
	}

	public async load(forceReload = false) {
		if (!this.isLoaded || forceReload) {
			if (forceReload) {
				this.list = {};
			}

			await this.loadFromComposer();

			this.isLoaded = true;
		}
	}

	protected async loadFromComposer() {
		const rootPackage = await ComposerBridge.getRootJalnoPackage();
		if (rootPackage) {
			this.list[rootPackage.name] = rootPackage;
		}

		for (const jalnoPackage of await ComposerBridge.getInstalledJalnoPackages()) {
			if (this.list[jalnoPackage.name] !== undefined) {
				logger.error(`[Packages:loadFromComposer] Duplicate package name '${jalnoPackage.name}' (manifest: ${jalnoPackage.manifestFilePath})`);

				throw new Error(`[@jalno/vite-plugin] Duplicate package name '${jalnoPackage.name}' (manifest: ${jalnoPackage.manifestFilePath})`);
			}
			this.list[jalnoPackage.name] = jalnoPackage;
		}
	}
}