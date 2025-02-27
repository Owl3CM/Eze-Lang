import { ParrotConfig } from "../Parrot.Types";

// Simple interpolation: replaces {key} with params[key]
function interpolate(template: string, params: { [key: string]: string | number }): string {
  return template.replace(/{(.*?)}/g, (_, key) => {
    const trimmedKey = key.trim();
    return params[trimmedKey] !== undefined ? String(params[trimmedKey]) : `{${trimmedKey}}`;
  });
}

type Group = {
  [key: string]: {
    value: string;
    placeholders: string[];
    parrotHolders: string[];
    variants: { [key: string]: string };
    conditions: { [key: string]: string };
  };
};

type GroupObject = {
  [key: string]: Group;
};

const Parrot = {
  create: (config: { Static: GroupObject; Dynamic: GroupObject }): ParrotConfig => {
    // const config = lang === "en" ? enConfig : arConfig;
    let parrot = {} as any;

    Object.values(config.Static).forEach((groups: Group) => {
      parrot = { ...parrot, ...groups };
    });

    Object.values(config.Dynamic).forEach((groups: Group) => {
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
          if (!node.value) node.value = "";
          if (node.variants) {
            parrot[key] = (params: any) => {
              const found = node.variants[params[node.placeholders[0]]];
              return interpolate(found ?? node.value, params);
            };
          } else if (node.conditions) {
            let conditionsFunctions = [] as any[];
            Object.entries(node.conditions).forEach(([condition, template]) => {
              try {
                conditionsFunctions.push(
                  new Function(`params`, `return ${condition.replace(/{(.*?)}/g, (_, key) => `params.${key.trim()}`)} ? \`${template}\` : null`)
                );
              } catch (e) {
                console.error(e);
              }
            });
            parrot[key] = (params: any) => {
              for (const func of conditionsFunctions) {
                const f = func(params);
                if (f) return interpolate(f, params);
              }
              return interpolate(node.value, params);
            };
          } else if (node.parrotHolders) {
            parrot[key] = (params: any) => {
              node.parrotHolders.forEach((k) => {
                const val = parrot[params[k]];
                params[k] = typeof val === "function" ? val(params) : val;
              });
              return interpolate(node.value, params);
            };
          } else
            parrot[key] = (params: any) => {
              return interpolate(node.value, params);
            };
        }
      );
    });

    return parrot as ParrotConfig;
  },
};

export default Parrot;

// // CreateParrot.ts

// import { LanguageKey, Translations, translations } from "@/translations";

// // Existing helper to replace placeholders in strings
// function resolvePlaceholders(translation: string, params: Record<string, any>) {
//   return Object.entries(params).reduce((result, [param, value]) => {
//     return result.replace(new RegExp(`{${param}}`, "g"), String(value));
//   }, translation);
// }

// // New helper to choose the right variant and then replace placeholders
// function resolveDynamicValue(value: string | Record<string, string>, params: Record<string, any>, lang: LanguageKey): string {
//   if (typeof value === "string") {
//     return resolvePlaceholders(value, params);
//   }

//   // If a numeric count is provided, use Intl.PluralRules
//   if (params.count !== undefined) {
//     const count = Number(params.count);
//     const pluralRules = new Intl.PluralRules(lang);
//     const category = pluralRules.select(count);
//     const variantValue = value[category] || value["other"] || value["default"];
//     return resolvePlaceholders(variantValue, { ...params, count });
//   }

//   // For non-plural variants (like gender), check a generic "variant" parameter
//   if (params.variant !== undefined) {
//     const variant = String(params.variant);
//     const variantValue = value[variant] || value["default"];
//     return resolvePlaceholders(variantValue, params);
//   }

//   // Fallback to the "default" variant if available
//   return resolvePlaceholders(value["default"], params);
// }

// // Updated dynamic type; note that we’re loosening the type for params
// type ParrotType<T extends Translations> = {
//   [K in keyof T["Static"]]: T["Static"][K];
// } & {
//   [K in keyof T["Dynamic"]]: (params: Record<string, any>) => string;
// };

// export function createParrot<T extends Translations>(lang: LanguageKey): ParrotType<T> {
//   const langTranslations = translations[lang] as T;
//   const dynamicEntries = Object.entries(langTranslations.Dynamic).reduce((acc, [key, value]) => {
//     acc[key as keyof T["Dynamic"]] = (params: Record<string, any>) => {
//       return resolveDynamicValue(value, params, lang);
//     };
//     return acc;
//   }, {} as any);

//   return {
//     ...langTranslations.Static,
//     ...dynamicEntries,
//   };
// }
