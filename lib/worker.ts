#!/usr/bin/env node

/**
 * -----------------------------------------
 *  Imports
 * -----------------------------------------
 */
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { execSync } from "child_process";
import { readFile } from "./helpers/owlFs.js";

/**
 * -----------------------------------------
 *  Type Definitions
 * -----------------------------------------
 */

/**
 * The main configuration shape from `parrot.config.json`.
 */
interface ParrotConfig {
  languages: string[];
  defaultLanguage: string;
  outputDir: string;
  ymlDir: string;
}

/**
 * A node in the blueprint.
 * Extend or refine types if you have stricter schemas.
 */
interface BlueprintNode {
  desc?: string;
  value?: string;
  // can be either "foo,bar" or ["foo", "bar"]
  placeholders?: string;
  parrotHolders?: string;
  conditions?: Record<string, string>;
  variants?: Record<string, string>;
}

/**
 * A blueprint is an object whose keys are "groups,"
 * each containing a map of "key => BlueprintNode".
 */
interface Blueprint {
  [group: string]: Record<string, BlueprintNode>;
}

/**
 * The flattened structure separates placeholders (Dynamic) from simple strings (Static).
 */
interface FlattenedResult {
  Static: Record<string, Record<string, any>>;
  Dynamic: Record<string, Record<string, any>>;
}

/**
 * -----------------------------------------
 *  1. Configuration & Setup
 * -----------------------------------------
 */

/**
 * Safely loads and returns the user config from `parrot.config.json`.
 * If not found or invalid, returns a default config.
 */
const configPath = "./parrot.config.json";

async function loadUserConfig(): Promise<ParrotConfig> {
  const config = await readFile(configPath);
  return JSON.parse(config);
  //   try {
  //     // Dynamically require to handle potential file absence:
  //     // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   } catch (err) {
  //     throw err;
  //     // console.warn("Warning: `parrot.config.json` not found or invalid. Using defaults.");
  //     // return {
  //     //   languages: ["en", "ar"],
  //     //   defaultLanguage: "en",
  //     //   outputDir: "./parrot",
  //     //   ymlDir: "./yml",
  //     // };
  //   }
}

/**
 * Ensures the output directory exists. Creates it if not found.
 */
function ensureOutputDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * -----------------------------------------
 *  2. YAML Loading & Merging
 * -----------------------------------------
 */

/**
 * Reads `.yml` / `.yaml` files from the given directory,
 * parses them, and returns an array of blueprint objects.
 */
function loadYamlFiles(directory: string): Array<Record<string, any>> {
  const yamlFiles = fs.readdirSync(directory).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

  const blueprints: Array<Record<string, any>> = [];
  for (const file of yamlFiles) {
    const filePath = path.join(directory, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const data = yaml.load(content) as Record<string, any>;
      if (data) {
        blueprints.push({ [file.replace(/\.(yml|yaml)$/, "")]: data });
      }
    } catch (err) {
      console.error(`\x1b[31mError reading file "${file}":\x1b[0m`, err);
    }
  }
  return blueprints;
}

/**
 * Merges an array of blueprint objects into a single `Blueprint`.
 */
function mergeBlueprints(blueprints: Array<Record<string, any>>): Blueprint {
  const merged: Record<string, any> = {};
  for (const bp of blueprints) {
    for (const group in bp) {
      if (!merged[group]) {
        merged[group] = {};
      }
      Object.assign(merged[group], bp[group]);
    }
  }
  return merged;
}

/**
 * -----------------------------------------
 *  3. Transformation Logic
 * -----------------------------------------
 */

/**
 * Returns the text if `lang` is the default language, or an empty string otherwise.
 */
function transformText(text: string, lang: string, defaultLang: string): string {
  return lang === defaultLang ? text : "";
}

/**
 * Processes a node and returns a language-specific version.
 */
function processNode(node: BlueprintNode, lang: string, defaultLang: string): any {
  let result: any = {};

  // Handle conditions
  if (node.conditions) {
    result.conditions = {};
    for (const [condKey, condVal] of Object.entries(node.conditions)) {
      result.conditions[condKey] = transformText(condVal, lang, defaultLang);
    }
  }

  // Handle variants
  if (node.variants) {
    result.variants = {};
    for (const [varKey, varVal] of Object.entries(node.variants)) {
      result.variants[varKey] = transformText(varVal, lang, defaultLang);
    }
  }

  // Handle placeholders / parrotHolders
  if (node.placeholders) {
    result.placeholders = node.placeholders.replace(/\s/g, "").split(",");
    if (node.parrotHolders) {
      result.parrotHolders = node.parrotHolders.replace(/\s/g, "").split(",");
    }
    result.value = transformText(node.value ?? "", lang, defaultLang);
  } else if (node.parrotHolders) {
    result.parrotHolders = node.parrotHolders.replace(/\s/g, "").split(",");
    result.value = transformText(node.value ?? "", lang, defaultLang);
  } else {
    // No placeholders or parrotHolders => likely a simple string
    result = transformText(node.value ?? "", lang, defaultLang);
  }

  return result;
}

/**
 * -----------------------------------------
 *  4. Flattening Blueprint
 * -----------------------------------------
 */

/**
 * Converts a merged `Blueprint` into a `FlattenedResult`
 * keyed by (group -> key) and separates them into Static/Dynamic.
 */
let _allPlaceholdersKeys = {};
let _allVariantsKeys = {};

function flattenBlueprint(blueprint: Blueprint, lang: string, defaultLang: string): FlattenedResult {
  const processedResult: Record<string, Record<string, any>> = {};

  // Process each group
  for (const group in blueprint) {
    for (const key in blueprint[group]) {
      const node: BlueprintNode = blueprint[group][key];
      const transformed = processNode(node, lang, defaultLang);

      if (transformed !== null) {
        processedResult[group] = processedResult[group] || {};
        processedResult[group][key] = transformed;
      } else {
        console.warn(`Warning: Unable to process key "${key}" in group "${group}".`);
      }
    }
  }

  // Separate static vs dynamic
  const dynamic: Record<string, Record<string, any>> = {};
  const staticPart: Record<string, Record<string, any>> = {};

  for (const group in processedResult) {
    for (const key in processedResult[group]) {
      const item = processedResult[group][key];
      const hasPlaceholders = item?.placeholders || item?.parrotHolders;

      if (hasPlaceholders) {
        dynamic[group] = dynamic[group] || {};
        dynamic[group][key] = item;
      } else {
        staticPart[group] = staticPart[group] || {};
        staticPart[group][key] = item;
      }
    }
  }

  if (lang === defaultLang && Object.keys(dynamic)?.length) {
    // loop thro the dynamic
    Object.values(dynamic).forEach((groups) => {
      Object.entries(groups).forEach(
        ([key, node]: [
          string,
          {
            value: string;
            placeholders: string[];
            parrotHolders: string[];
            variants: { [key: string]: string };
            conditions: { [key: string]: string };
          }
        ]) => {
          if (node.placeholders) {
            node.placeholders.forEach((phKey, i) => {
              if (i === 0 && node.variants?.length) _allVariantsKeys[phKey] = true;
              else _allPlaceholdersKeys[phKey] = true;
            });
          }
        }
      );
    });
  }

  return {
    Static: sortKeys(staticPart),
    Dynamic: sortKeys(dynamic),
  };
}

/**
 * Sorts the top-level keys of an object (by group, then subkeys).
 */
function sortKeys(obj: Record<string, Record<string, any>>): Record<string, Record<string, any>> {
  const sorted: Record<string, Record<string, any>> = {};

  for (const group of Object.keys(obj).sort()) {
    const groupValues = obj[group];
    const sortedGroup: Record<string, any> = {};

    for (const key of Object.keys(groupValues).sort()) {
      sortedGroup[key] = groupValues[key];
    }
    sorted[group] = sortedGroup;
  }
  return sorted;
}

/**
 * -----------------------------------------
 *  5. Existing Config Merge
 * -----------------------------------------
 */

interface GeneratedConfig {
  Static: Record<string, Record<string, any>>;
  Dynamic: Record<string, Record<string, any>>;
}

/**
 * Merges an old config with a new config, preserving existing values
 * while removing keys not present in the new config.
 */
function mergeConfigs(oldConfig: GeneratedConfig, newConfig: GeneratedConfig): GeneratedConfig {
  const merged: GeneratedConfig = { Static: {}, Dynamic: {} };

  for (const section of ["Static", "Dynamic"] as const) {
    const currentNew = newConfig[section];
    if (currentNew) {
      for (const group in currentNew) {
        merged[section][group] = {};
        for (const key in currentNew[group]) {
          let node = currentNew[group][key];

          // If key exists in oldConfig, preserve or merge old values
          if (oldConfig && oldConfig[section] && oldConfig[section][group] && key in oldConfig[section][group]) {
            const oldNode = oldConfig[section][group][key];
            if (oldNode) {
              node = mergeNodeValues(node, oldNode);
            }
          }
          merged[section][group][key] = node;
        }
      }
    }
  }

  return merged;
}

/**
 * Selectively merges node values if present in the old node.
 */
function mergeNodeValues(newNode: any, oldNode: any): any {
  if (typeof oldNode !== "object" && typeof newNode !== "object") {
    return oldNode || newNode;
  }
  if (oldNode.value) {
    newNode.value = oldNode.value;
  }
  if (oldNode.conditions && newNode.conditions) {
    for (const condition in newNode.conditions) {
      if (oldNode.conditions[condition]) {
        newNode.conditions[condition] = oldNode.conditions[condition];
      }
    }
  }
  if (oldNode.variants && newNode.variants) {
    for (const variant in newNode.variants) {
      if (oldNode.variants[variant]) {
        newNode.variants[variant] = oldNode.variants[variant];
      }
    }
  }
  return newNode;
}

/**
 * -----------------------------------------
 *  6. Type Definitions Generation
 * -----------------------------------------
 */

/**
 * Generates a `Types.ts` file to define TypeScript interfaces
 * for static and dynamic keys (including JSDoc comments).
 */
function generateTypes(blueprint) {
  let output = `// This file is generated automatically\n\n`;
  let staticType = "";
  let dynamicType = "";
  const extraMapping = {};

  // Helper: convert comma-separated string to an array of trimmed strings.
  const toArray = (s) => (s ? s.split(",").map((x) => x.trim()) : []);

  for (const group in blueprint) {
    for (const key in blueprint[group]) {
      const node = blueprint[group][key];
      const { desc, placeholders, parrotHolders, value, conditions, variants } = node;
      // Fixed keys from placeholders and generic keys from parrotHolders.
      const fixedKeys = toArray(placeholders);
      const genericKeys = toArray(parrotHolders);

      // Build JSDoc.
      let jsDoc = "  /**\n";
      if (desc) jsDoc += `   * ${desc}\n`;
      if (placeholders) jsDoc += `   *\n   * Placeholders: ${placeholders}\n`;
      if (typeof value === "string") jsDoc += `   *\n   * Value: ${value}\n`;
      if (conditions) {
        const condStr = Object.entries(conditions)
          .map(([condKey, condVal]) => `\n   * if (${condKey}) ${condVal}`)
          .join("");
        jsDoc += `   *\n   *${condStr}\n`;
      }
      if (variants) {
        const variantList = Object.keys(variants).join(" | ");
        jsDoc += `   *\n   * Variant: ${variantList}\n`;
      }
      jsDoc += "   */\n";

      let isDynamic = false;
      let typeContent = "";

      // If there are fixed (placeholders) or generic (parrotHolders) keys, generate a dynamic signature.
      if (fixedKeys.length > 0 || genericKeys.length > 0) {
        isDynamic = true;
        // For fixed keys:
        // - If variants exist, treat the first fixed key as an enum and mark it optional.
        const fixedParams = fixedKeys.map((k, i) => {
          if (i === 0 && variants) {
            const variantsUnion = Object.keys(variants)
              .map((v) => `"${v}"`)
              .join(" | ");
            return `${k}?: ${variantsUnion}`;
          }
          return `${k}: _ParrotStaticValue`;
        });

        // For generic keys (from parrotHolders), use generic parameters.
        const genericParamsObj = genericKeys.map((k) => `${k}: ${k}`);
        const paramObjParts = [...fixedParams, ...genericParamsObj];
        const paramObj = paramObjParts.join("; ");
        // Build generic type parameter list from genericKeys.
        const genericParams = genericKeys.length > 0 ? genericKeys.map((k) => `${k} extends ParrotKey`).join(", ") : "";

        // use the generi keys as parrot key
        extraMapping[key] = `  ${key}: { ${genericKeys.map((ph) => `${ph}: ParrotKey`).join(";")}${
          genericKeys.length > 0 && fixedKeys.length > 0 ? "; " : ""
        }${fixedParams.map((ph) => `${ph}`).join("; ")}};\n`;

        // Build the ExtraParams intersection only for generic keys.
        const extraParamsParts = genericKeys.map((k) => `ExtraParams<${k}>`);
        const extraParams = extraParamsParts.length > 0 ? extraParamsParts.join(" & ") : "{}";
        if (genericParams) {
          typeContent = `  ${key}: <${genericParams}>(params: { ${paramObj} } & ${extraParams}) => string;\n`;
        } else {
          typeContent = `  ${key}: (params: { ${paramObj} } & ${extraParams}) => string;\n`;
        }
      } else if (typeof value === "string") {
        typeContent = `  ${key}: _ParrotStaticValue;\n`;
      } else {
        typeContent = `  ${key}: any;\n`;
      }

      if (isDynamic) {
        dynamicType += jsDoc + typeContent;
      } else {
        staticType += jsDoc + typeContent;
      }
    }
  }

  // Build ExtraParamsMapping.
  let extraMappingStr = "export interface ExtraParamsMapping {\n";
  for (const dynKey in extraMapping) {
    // const combined = Array.from(new Set(extraMapping[dynKey]));
    // extraMappingStr += `  ${dynKey}: { ${combined.map((ph) => `${ph}: _ParrotStaticValue`).join("; ")} };\n`;
    extraMappingStr += extraMapping[dynKey];
  }
  extraMappingStr += "}\n\n";

  output += extraMappingStr;
  output += `export type ExtraParams<K extends ParrotKey> = [K] extends [keyof ExtraParamsMapping] ? ExtraParamsMapping[K] : {};\n\n`;
  output += `type _ParrotStaticValue = string | number;\n\n`;
  output += `export interface ParrotStatic {\n${staticType}}\n\n`;
  output += `export interface ParrotDynamic {\n${dynamicType}}\n\n`;
  output += `export interface ParrotConfig extends ParrotStatic, ParrotDynamic {}\n\n`;
  output += `export type ParrotKey = keyof ParrotConfig;\n`;
  output += `export type PlaceholderKey = "${Object.keys(_allPlaceholdersKeys).join('"|"')}";\n`;
  output += `export type VariantKey = "${Object.keys(_allVariantsKeys).join('"|"')}";\n`;

  return output;
}
// Generate index content
function generateIndexContent(config): string {
  return `${config.languages.map((lang) => `import ${lang}Config from "./${lang}.json";`).join("\n")}
    const GetLanguageConfig = (lang: ${config.languages.map((lang) => `"${lang}"`).join(" | ")}) => {
       switch (lang) {
          ${config.languages.map((lang) => `case "${lang}": return ${lang}Config;`).join("\n")}
          default: return ${config.defaultLanguage}Config;
        }      
    };

    export default GetLanguageConfig;
    `;
}

// Generate eze-lang.d.ts
const ezeLangTypes = `import "eze-lang";
import { ParrotConfig as PC, ParrotStatic as PS ,PlaceholderKey PK} from "./Parrot.Types";

declare module "eze-lang" {
  export interface ParrotConfig extends PC {}
  export interface ParrotStatic extends PS {}
  export interface PlaceholderKey extends PK {}
}
`;

/**
 * -----------------------------------------
 *  7. Main Process
 * -----------------------------------------
 */

async function main(): Promise<void> {
  try {
    // Load config and ensure output directory
    const config = await loadUserConfig();
    ensureOutputDir(config.outputDir);

    // 1) Load and merge YAML blueprints
    const yamlDir = path.join(config.outputDir, "yml");
    const blueprints = loadYamlFiles(yamlDir);
    const mergedBlueprint = mergeBlueprints(blueprints);

    // 2) Generate JSON files for each language
    for (const lang of config.languages) {
      const flattened = flattenBlueprint(mergedBlueprint, lang, config.defaultLanguage);
      const outputPath = path.join(config.outputDir, `${lang}.json`);

      let finalConfig: GeneratedConfig = flattened;
      if (fs.existsSync(outputPath)) {
        try {
          const existingData = fs.readFileSync(outputPath, "utf8");
          const oldConfig = JSON.parse(existingData) as GeneratedConfig;
          finalConfig = mergeConfigs(oldConfig, flattened);
        } catch (err) {
          console.error(`\x1b[31mError reading existing config at "${outputPath}":\x1b[0m`, err);
        }
      }

      fs.writeFileSync(outputPath, JSON.stringify(finalConfig, null, 2), "utf8");
      console.log(`Generated: ${outputPath}`);
    }

    // 3) Generate `Types.ts` file
    const typesContent = generateTypes(mergedBlueprint);
    // const typesPath = path.join(config.outputDir, "Parrot.Types.ts");
    const typesPath = path.join("Parrot.Types.ts");
    fs.writeFileSync(typesPath, typesContent, "utf8");

    const indexContent = generateIndexContent(config);
    const indexPath = path.join(config.outputDir, "index.ts");
    fs.writeFileSync(indexPath, indexContent);

    // 4) Generate eze-lang.d.ts
    // const ezeLangPath = path.join(config.outputDir, "eze-lang.d.ts");
    // fs.writeFileSync(ezeLangPath, ezeLangTypes, "utf8");

    // 4) Format output directory with Prettier (optional)
    try {
      execSync(`npx prettier --write ${config.outputDir} --ignore-path ${config.outputDir}/yml`, { stdio: "inherit" });
    } catch (err: any) {
      console.warn("Prettier formatting skipped or failed:", err.message);
    }

    console.log("Generated Types.ts");
  } catch (err) {
    console.error("\x1b[31mError during generation process:\x1b[0m", err);
    process.exit(1);
  }
}

// Execute main function
void main();
