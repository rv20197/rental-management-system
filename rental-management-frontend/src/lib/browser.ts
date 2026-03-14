export function isBrowser() {
  return typeof window !== "undefined";
}

export function getSessionToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.sessionStorage.getItem("token");
}

export function setSessionToken(token: string) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem("token", token);
}

export function clearSessionToken() {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem("token");
}

export function getLocalStorageItem(key: string) {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function setLocalStorageItem(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, value);
}
