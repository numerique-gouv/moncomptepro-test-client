//

import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { defineConfig } from "cypress";

//

export default defineConfig({
  e2e: {
    baseUrl: "https://duckduckgo.com",
    specPattern: "**/*.feature",
    setupNodeEvents,
    supportFile: false,
  },
});

//

async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  await addCucumberPreprocessorPlugin(on, config);

  on(
    "file:preprocessor",
    createBundler({
      plugins: [createEsbuildPlugin(config)],
    })
  );

  return config;
}
