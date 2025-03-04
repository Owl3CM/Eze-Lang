import { Group, GroupObject } from "./types";
import { ParrotConfig, PlaceholderKey, ParrotDynamic, ParrotKey, ParrotStatic, VariantKey } from "../Parrot.Types";

const Parrot = {} as ParrotConfig;
export default Parrot;

let _defaultPlaceholders = {} as {
  [key: PlaceholderKey]: string | number;
};
export const DefaultPlaceholders = {
  replace: (params: { [key: PlaceholderKey]: string | number }) => {
    _defaultPlaceholders = params;
  },
  get: () => {
    return _defaultPlaceholders;
  },
  clear: () => {
    _defaultPlaceholders = {};
  },
  update: (params: { [key: PlaceholderKey]: string | number }) => {
    _defaultPlaceholders = { ..._defaultPlaceholders, ...params };
  },
  set: (key: PlaceholderKey, value: string | number) => {
    _defaultPlaceholders[key] = value;
  },
  delete: (key: PlaceholderKey) => {
    delete _defaultPlaceholders[key];
  },
};

let _defaultVariants = {} as {
  [key: VariantKey]: string;
};

export const DefaultVariants = {
  replace: (params: { [key: VariantKey]: string }) => {
    _defaultVariants = params;
  },
  get: () => {
    return _defaultVariants;
  },
  clear: () => {
    _defaultVariants = {};
  },
  update: (params: { [key: VariantKey]: string }) => {
    _defaultVariants = { ..._defaultVariants, ...params };
  },
  set: (key: VariantKey, value: string) => {
    _defaultVariants[key] = value;
  },
  delete: (key: VariantKey) => {
    delete _defaultVariants[key];
  },
};

type DynamicKeys = keyof ParrotDynamic;
type StaticKeys = keyof ParrotStatic;

export function SetLanguage(config: {
  Static: {
    [key: string]: {
      [key: string]: string | number;
    };
  };
  Dynamic: GroupObject;
}): ParrotConfig {
  let parrot = {} as any;

  Object.values(config.Static).forEach((groups) => {
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
            const found = node.variants[params[node.placeholders[0]] ?? _defaultVariants[node.placeholders[0]]];
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
  Object.keys(Parrot).forEach((key) => {
    //@ts-ignore
    Parrot[key] = parrot[key];
  });
  return Parrot;
}

// function interpolate(template: string, params: { [key: string]: string | number }): string {
//   return template.replace(/{(.*?)}/g, (_, key) => {
//     const trimmedKey = key.trim() as string;
//     let val = params[trimmedKey];
//     return val !== undefined ? String(val) : `{${trimmedKey}}`;
//   });
// }
function interpolate(template: string, params: { [key: string]: string | number }): string {
  return template.replace(/{(.*?)}/g, (_, key) => {
    const trimmedKey = key.trim() as string;

    let val = params[trimmedKey];

    if (val === undefined) val = _defaultPlaceholders[trimmedKey];
    if (val !== undefined) return String(val);

    return `{${trimmedKey}}`;
  });
}

type ParrotTextProps<K extends ParrotKey> = K extends DynamicKeys
  ? {
      /** The Parrot key to render. */
      k: K;
    } & Parameters<ParrotDynamic[K]>[0] // The parameter object from the dynamic function
  : {
      /** The Parrot key to render. */
      k: K;
    };

/**
 * A single component that renders either static or dynamic Parrot values.
 */

export function ParrotMixedComponent<K extends ParrotKey>(props: ParrotTextProps<K>) {
  const { k, ...rest } = props as any;
  //   @ts-ignore
  const parrotEntry = Parrot[k];

  if (typeof parrotEntry === "function") {
    return parrotEntry(rest);
  } else {
    return parrotEntry;
  }
}

export function ParrotStaticComponent<K extends StaticKeys>({ k }: { k: K }) {
  return Parrot[k];
}

export function ParrotDynamicComponent<K extends DynamicKeys>(props: Parameters<ParrotDynamic[K]>[0]) {
  const { k, ...rest } = props as any;
  // @ts-ignore
  return Parrot[k](rest);
}

// export function ParrotP<K extends ParrotKey>(props: ParrotTextProps<K>) {
//   return <p>{ParrotText(props)}</p>;
// }

// export function ParrotSpan<K extends ParrotKey>(props: ParrotTextProps<K>) {
//   return <span>{ParrotText(props)}</span>;
// }
