const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const WEB_SHIMS = {
  "expo-location":       path.resolve(__dirname, "src/mocks/expo-location.web.ts"),
  "expo-screen-capture": path.resolve(__dirname, "src/mocks/expo-screen-capture.web.ts"),
  "expo-image-picker":   path.resolve(__dirname, "src/mocks/expo-image-picker.web.ts"),
};

const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (platform === "web" && WEB_SHIMS[moduleName]) {
    return { filePath: WEB_SHIMS[moduleName], type: "sourceFile" };
  }
  if (originalResolve) {
    return originalResolve(ctx, moduleName, platform);
  }
  return ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
