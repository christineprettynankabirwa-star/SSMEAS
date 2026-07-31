"use client";

const eventName = "ssmeas:data-refresh";
const storageKey = "ssmeas_data_refresh";

export const announceDataRefresh = (): void => {
  window.dispatchEvent(new Event(eventName));
  localStorage.setItem(storageKey, String(Date.now()));
};

export const subscribeDataRefresh = (listener: () => void): (() => void) => {
  const local = () => listener();
  const storage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener(eventName, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(eventName, local);
    window.removeEventListener("storage", storage);
  };
};
