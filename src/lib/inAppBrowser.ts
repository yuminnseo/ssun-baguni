const IN_APP_BROWSER_PATTERNS = [
  /Instagram/i,
  /Threads/i,
  /Barcelona/i,
  /KAKAOTALK/i,
  /FBAN/i,
  /FBAV/i,
  /FB_IAB/i,
];

export const isInAppBrowser = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return IN_APP_BROWSER_PATTERNS.some((pattern) =>
    pattern.test(navigator.userAgent),
  );
};
