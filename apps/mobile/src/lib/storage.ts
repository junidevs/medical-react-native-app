interface KeyValueStorage {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: string | boolean) => void;
  remove: (key: string) => void;
}

const memory = new Map<string, string | boolean>();

function createMemoryStorage(): KeyValueStorage {
  return {
    getString: (key) => {
      const value = memory.get(key);
      return typeof value === "string" ? value : undefined;
    },
    getBoolean: (key) => {
      const value = memory.get(key);
      return typeof value === "boolean" ? value : undefined;
    },
    set: (key, value) => {
      memory.set(key, value);
    },
    remove: (key) => {
      memory.delete(key);
    }
  };
}

function createStorage(): KeyValueStorage {
  try {
    // MMKV is available only after a native rebuild. Keep older dev builds usable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkv = require("react-native-mmkv") as typeof import("react-native-mmkv");
    return mmkv.createMMKV({ id: "medconnect.ui" });
  } catch {
    return createMemoryStorage();
  }
}

export const appStorage = createStorage();

export function getString(key: string) {
  return appStorage.getString(key) ?? null;
}

export function setString(key: string, value: string | null) {
  if (value === null) {
    appStorage.remove(key);
    return;
  }
  appStorage.set(key, value);
}

export function getBoolean(key: string, fallback = false) {
  return appStorage.getBoolean(key) ?? fallback;
}

export function setBoolean(key: string, value: boolean) {
  appStorage.set(key, value);
}
