import { createFolder } from "./helpers/owlFs.js";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { fileExists, readFile } from "./helpers/owlFs.js";
import { copyFileSync } from "fs";
import chokidar from "chokidar";
export const packagePath = "node_modules/eze-lang/dist";

// Convert exec callback to a promise-based function
const exec = promisify(execCallback);
const configPath = "./parrot.config.json";
export const Watcher = async (once) => {
  // If parrot.config.json does not exist, copy the default
  if (!(await fileExists(configPath))) {
    copyFileSync(`${packagePath}/parrot.config.default.json`, configPath);
  }
  // Read config again (could have just been created)
  let config = JSON.parse(await readFile(configPath));
  const ymlPath = `${config.outputDir}/yml`;
  if (!(await fileExists(config.outputDir))) {
    await createFolder(`${config.outputDir}`);
  }
  if (!(await fileExists(ymlPath))) {
    await createFolder(
      ymlPath,
      Object.entries(ymls).map(([name, content]) => {
        return { name: `${name}.yml`, content: content(config) };
      })
    );
    exec(`node ${packagePath}/worker.js`);
  } else if (once) {
    exec(`node ${packagePath}/worker.js`);
  } else {
    // Watch parrot.config.json for changes
    const ymlsWatcher = chokidar.watch(ymlPath);
    let timeout;
    const onChange = async (path) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          exec(`node ${packagePath}/worker.js`);
        } catch (e) {
          console.error("Error parrot building:", e);
        }
      }, 10);
    };
    ymlsWatcher.on("change", onChange);

    chokidar.watch(configPath).on("change", async () => {
      process.kill(process.pid, "SIGINT");
    });
  }
  // Handle Ctrl+C
  process.on("SIGINT", () => {
    process.exit();
  });
};

const ymls = {
  default: (config) => `
ISO:
  desc: The ISO action
  value: ${config.defaultLanguage}
`,
  actions: (config) => `
upload:
  desc: "Action for uploading a file"
  value: "Upload File"

download:
  desc: "Action for downloading a file"
  value: "Download File"

search:
  desc: "Search action with a query"
  placeholders: query
  value: "Searching for '{query}'..."`,
  errors: (config) =>
    `
serverError:
  desc: "Generic server error message"
  value: "A server error occurred. Please try again later."

errorWhile:
  desc: "Error message with a dynamic action"
  placeholders: action
  value: "An error occurred while {action}"

errorWithDetail:
  desc: "Nested key lookup error message using parrotHolders"
  parrotHolders: action
  value: "Failed to perform {action}"`,

  greetings: (config) => `
greeting:
  desc: "Basic greeting with variants based on gender"
  placeholders: gender, name
  value: "Hello {name}"
  variants:
    male: "Hello Mr. {name}"
    female: "Hello Ms. {name}"
    default: "Hello {name}"
  
genderGreeting:
  desc: "Greeting with multi-conditions based on gender and name"
  placeholders: gender, name
  value: "Hi {name}"
  conditions:
    "{gender} === 'female' && {name} === 'Alice'": "Welcome, Queen Alice!"
    "{gender} === 'male'": "Greetings, Sir {name}"
    "{gender} === 'female'": "Greetings, Lady {name}"`,
  itemsCount: (config) => `
itemCount:
  desc: "Displays item count with context-aware messages"
  placeholders: count
  value: "{count} items available"
  conditions:
    "{count} < 0": "Invalid count"
    "{count} === 0": "No items available"
    "{count} === 1": "One item available"
    "{count} > 1 && {count} < 10": "A few items available"
    "{count} >= 10 && {count} < 50": "Several items available"
    "{count} >= 50": "Many items available"`,
  custom: (config) => `
failed:
  desc: "Custom message combining dynamic elements"
  placeholders: detail, action
  value: "Failed to {action} {detail}"
  
becauseOf:
  desc: "Provides a reason message"
  placeholders: user
  value: "because of {user}"

customMessage:
  desc: "Custom message combining dynamic elements from various sources"
  placeholders: user,anyText
  parrotHolders: detail, action, becauseOf
  value: ".{becauseOf} {detail}, {anyText}"
`,
};
