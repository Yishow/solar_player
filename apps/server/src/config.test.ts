import assert from "node:assert/strict";
import test from "node:test";

import { config } from "./config.js";

test("config reflects environment changes after module import", () => {
    const originalPort = process.env.PORT;
    const originalDataDir = process.env.DATA_DIR;
    const originalDatabasePath = process.env.DATABASE_PATH;

    try {
        delete process.env.PORT;
        delete process.env.DATA_DIR;
        delete process.env.DATABASE_PATH;

        assert.equal(config.port, 3000);

        process.env.PORT = "4321";
        process.env.DATA_DIR = "/tmp/solar-data";

        assert.equal(config.port, 4321);
        assert.equal(config.dataDir, "/tmp/solar-data");
        assert.equal(config.databasePath, "/tmp/solar-data/solar-display.sqlite");

        process.env.DATABASE_PATH = "/tmp/custom.sqlite";
        assert.equal(config.databasePath, "/tmp/custom.sqlite");
    } finally {
        if (originalPort === undefined) {
            delete process.env.PORT;
        } else {
            process.env.PORT = originalPort;
        }

        if (originalDataDir === undefined) {
            delete process.env.DATA_DIR;
        } else {
            process.env.DATA_DIR = originalDataDir;
        }

        if (originalDatabasePath === undefined) {
            delete process.env.DATABASE_PATH;
        } else {
            process.env.DATABASE_PATH = originalDatabasePath;
        }
    }
});