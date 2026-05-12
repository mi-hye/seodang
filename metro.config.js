const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const distPath = path.resolve(__dirname, "dist");
const distPattern = new RegExp(`^${escapeRegExp(distPath)}\\/.*$`);
const currentBlockList = config.resolver.blockList;

config.resolver.blockList = Array.isArray(currentBlockList)
  ? [...currentBlockList, distPattern]
  : currentBlockList
    ? [currentBlockList, distPattern]
    : [distPattern];

module.exports = config;
