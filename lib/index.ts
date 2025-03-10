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

export function SetLanguage(config: {
  Static: {
    [key: string]: {
      [key: string]: string | number;
    };
  };
  Dynamic: GroupObject;
}): ParrotConfig {
  Object.keys(Parrot).forEach((key) => {
    //@ts-ignore
    delete Parrot[key];
  });

  Object.values(config.Static).forEach((groups) => {
    // parrot = { ...parrot, ...groups };
    Object.entries(groups).forEach(([key, node]: any) => {
      // @ts-ignore
      Parrot[key] = node;
    });
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

        let applyParrotHolders =
          node.parrotHolders && node.parrotHolders.length > 0
            ? (params: any) => {
                node.parrotHolders.forEach((k) => {
                  // @ts-ignore
                  const val = Parrot[params[k]];
                  params[k] = typeof val === "function" ? val(params) : val;
                });
                return params;
              }
            : (params: any) => params;

        if (node.variants) {
          // @ts-ignore
          if (node.placeholders) {
            // @ts-ignore
            Parrot[key] = (params: any) => {
              params = applyParrotHolders(params);
              const found = node.variants[params[node.placeholders[0]] ?? _defaultVariants[node.placeholders[0]]];
              return interpolate(found ?? node.value, params);
            };
          } else {
            // @ts-ignore
            Parrot[key] = (params: any) => node.variants[params[node.placeholders[0]] ?? _defaultVariants[node.placeholders[0]]] ?? node.value;
          }
        } else if (node.conditions) {
          const conditionsFunctions = [] as any[];
          Object.entries(node.conditions).forEach(([condition, template]) => {
            try {
              conditionsFunctions.push(
                new Function(`params`, `return ${condition.replace(/{(.*?)}/g, (_, key) => `params.${key.trim()}`)} ? \`${template}\` : null`)
              );
            } catch (e) {
              console.error(e);
            }
          });
          // @ts-ignore
          Parrot[key] = (params: any) => {
            params = applyParrotHolders(params);
            for (const func of conditionsFunctions) {
              const condValue = func(params);
              if (condValue) return interpolate(condValue, params);
            }
            return interpolate(node.value, params);
          };
        } else if (node.parrotHolders) {
          // @ts-ignore
          Parrot[key] = (params: any) => interpolate(node.value, applyParrotHolders(params));
        } else {
          // @ts-ignore
          Parrot[key] = (params: any) => interpolate(node.value, params);
        }
      }
    );
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

type DynamicKeys = keyof ParrotDynamic;
type StaticKeys = keyof ParrotStatic;

type ParrotTextProps<K extends ParrotKey> = K extends DynamicKeys ? { k: K } & Parameters<ParrotDynamic[K]>[0] : { k: K };

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
