export type Group = {
  [key: string]: {
    value: string;
    placeholders: string[];
    parrotHolders: string[];
    variants: { [key: string]: string };
    conditions: { [key: string]: string };
  };
};

export type GroupObject = {
  [key: string]: Group;
};
