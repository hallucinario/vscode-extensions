import { defineConfig } from "@vscode/test-cli";
import { tmpdir } from "os";
import { join } from "path";

export default defineConfig({
  tests: [
    {
      files: "out/test/integration/**/*.test.js",
      workspaceFolder: "test/fixtures/sample-workspace",
      mocha: {
        timeout: 20000,
      },
      launchArgs: [
        "--user-data-dir",
        join(tmpdir(), "jv-test"),
      ],
    },
  ],
});
