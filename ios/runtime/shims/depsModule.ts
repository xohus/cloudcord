import { findByPropsLazy } from "@metro/wrappers";

module.exports = {
    "react": findByPropsLazy("createElement"),
    "react-native": findByPropsLazy("AppRegistry"),
    "util": findByPropsLazy("inspect", "isNullOrUndefined"),
    "lodash": findByPropsLazy("forEachRight"),
};
