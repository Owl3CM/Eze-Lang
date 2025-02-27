#!/usr/bin/env node
import { createFolder } from "./helpers/owlFs.js";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { fileExists, readFile } from "./helpers/owlFs.js";
import { copyFileSync } from "fs";
import chokidar from "chokidar";
export const packagePath = "node_modules/parrot-style/dist";

// Convert exec callback to a promise-based function
const exec = promisify(execCallback);

const configPath = "./parrot.config.json";

export const Watcher = async () => {
  // If parrot.config.json does not exist, copy the default
  if (!(await fileExists(configPath))) {
    copyFileSync(`${packagePath}/parrot.config.default.json`, configPath);
  }

  // Read config again (could have just been created)
  let config = JSON.parse(await readFile(configPath));

  if (!config.outputDir) {
    createFolder(`${config.outputDir}`);
  }
  if (!`${config.outputDir}/yml`) {
    createFolder(`${config.outputDir}/yml`, {
      default: { name: "actions.yml", content: defaultYml },
    });
  }

  // Watch parrot.config.json for changes
  const filesWatcher = chokidar.watch(config.outputDir);
  let timeout;
  filesWatcher.on("change", async (path) => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        exec(`node ${packagePath}/worker.js`);
      } catch (e) {
        console.error("Error parrot building:", e);
      }
    }, 1000);
  });

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    process.exit();
  });
};

const defaultYml = `actions:
  zero:
    desc: The zero action
    value: Zero

  add:
    desc: The add action
    value: Add

  upload:
    desc: The upload action
    value: Upload

  download:
    desc: The download action
    value: Download

  errorWhile:
    desc: Error message template; 'action' describes what failed.
    placeholders: action
    value: An error occurred while {action}

  errorWhileParrot:
    desc: Error message template; 'action' describes what failed.
    parrotHolders: action
    value: An error occurred while {action}

  parrotErrorWhileParrot:
    desc: Error message template; 'action' describes what failed.
    placeholders: action,count,gender,name
    parrotHolders: genderParrotAction,countParrotAction
    value: "{genderParrotAction} do you want {action} {countParrotAction}"

  greeting:
    desc: A greeting message with gender variants. Expects 'name' and optionally 'gender'.
    placeholders: gender, name
    value: Hello {name}
    variants:
      male: Hello Mr. {name}
      female: Hello Ms. {name}
      1: Hello Ms. One

  genderGreeting:
    desc: Greeting based on gender
    placeholders: gender,name
    value: Hello {name}
    conditions:
      "{gender} === 'female' && {name} === 'john'": Hello Ms. Doe
      "{gender} === 'male'": Hello Mr. {name}
      "{gender} === 'female'": Hello Ms. {name}

  itemCount:
    desc: Display item count based on number
    placeholders: count
    value: "{count} items"
    conditions:
      "{count} < 0": Negative items
      "{count} === 0": No items
      "{count} === 1": 1 item
      "{count} < 10": Few items
      "{count} <= 20": "Between 20 and 50 items"
      "{count} < 50": Many items

  remove:
    value: Remove
    desc: Action to remove an item

  saving:
    value: Saving
    desc: Message displayed while saving

  searchingFor:
    desc: Search prompt; 'propName' is the property being searched.
    placeholders: propName
    value: Searching for {propName}
`;
