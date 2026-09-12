"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function")
      for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
        key = keys[i];
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: ((k) => from[k]).bind(null, key), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // shims/asyncIteratorSymbol.js
  var asyncIteratorSymbol;
  var init_asyncIteratorSymbol = __esm({
    "shims/asyncIteratorSymbol.js"() {
      "use strict";
      asyncIteratorSymbol = Symbol("Symbol.asyncIterator");
    }
  });

  // shims/promiseAllSettled.js
  var allSettledFulfill, allSettledReject, mapAllSettled, allSettled;
  var init_promiseAllSettled = __esm({
    "shims/promiseAllSettled.js"() {
      "use strict";
      allSettledFulfill = (value) => ({
        status: "fulfilled",
        value
      });
      allSettledReject = (reason) => ({
        status: "rejected",
        reason
      });
      mapAllSettled = (item) => Promise.resolve(item).then(allSettledFulfill, allSettledReject);
      allSettled = Promise.allSettled ??= (iterator) => {
        return Promise.all(Array.from(iterator).map(mapAllSettled));
      };
    }
  });

  // node_modules/@swc/helpers/esm/_async_to_generator.js
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }
    if (info.done)
      resolve(value);
    else
      Promise.resolve(value).then(_next, _throw);
  }
  function _async_to_generator(fn) {
    return function() {
      var self = this, args = arguments;
      return new Promise(function(resolve, reject) {
        var gen = fn.apply(self, args);
        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }
        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }
        _next(void 0);
      });
    };
  }
  var init_async_to_generator = __esm({
    "node_modules/@swc/helpers/esm/_async_to_generator.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/spitroast/dist/cjs.js
  var require_cjs = __commonJS({
    "node_modules/spitroast/dist/cjs.js"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      var __defProp2 = Object.defineProperty;
      var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames2 = Object.getOwnPropertyNames;
      var __hasOwnProp2 = Object.prototype.hasOwnProperty;
      var __export2 = (target, all) => {
        for (var name in all)
          __defProp2(target, name, {
            get: all[name],
            enumerable: true
          });
      };
      var __copyProps2 = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          var _loop2 = function(key2) {
            if (!__hasOwnProp2.call(to, key2) && key2 !== except)
              __defProp2(to, key2, {
                get: () => from[key2],
                enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable
              });
          };
          for (var key of __getOwnPropNames2(from))
            _loop2(key);
        }
        return to;
      };
      var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", {
        value: true
      }), mod);
      var src_exports2 = {};
      __export2(src_exports2, {
        after: () => after2,
        before: () => before3,
        instead: () => instead4,
        unpatchAll: () => unpatchAll
      });
      module.exports = __toCommonJS2(src_exports2);
      var patchTypes = [
        "a",
        "b",
        "i"
      ];
      var patchedObjects = /* @__PURE__ */ new Map();
      function hook_default(funcName, funcParent, funcArgs, ctxt, isConstruct) {
        var patch = patchedObjects.get(funcParent)?.[funcName];
        if (!patch)
          return isConstruct ? Reflect.construct(funcParent[funcName], funcArgs, ctxt) : funcParent[funcName].apply(ctxt, funcArgs);
        for (var hook of patch.b.values()) {
          var maybefuncArgs = hook.call(ctxt, funcArgs);
          if (Array.isArray(maybefuncArgs))
            funcArgs = maybefuncArgs;
        }
        var workingRetVal = [
          ...patch.i.values()
        ].reduce(
          (prev, current) => (...args) => current.call(ctxt, args, prev),
          // This calls the original function
          (...args) => isConstruct ? Reflect.construct(patch.o, args, ctxt) : patch.o.apply(ctxt, args)
        )(...funcArgs);
        for (var hook1 of patch.a.values())
          workingRetVal = hook1.call(ctxt, funcArgs, workingRetVal) ?? workingRetVal;
        return workingRetVal;
      }
      function unpatch(funcParent, funcName, hookId, type) {
        var patchedObject = patchedObjects.get(funcParent);
        var patch = patchedObject?.[funcName];
        if (!patch?.[type].has(hookId))
          return false;
        patch[type].delete(hookId);
        if (patchTypes.every((t) => patch[t].size === 0)) {
          var success = Reflect.defineProperty(funcParent, funcName, {
            value: patch.o,
            writable: true,
            configurable: true
          });
          if (!success)
            funcParent[funcName] = patch.o;
          delete patchedObject[funcName];
        }
        if (Object.keys(patchedObject).length == 0)
          patchedObjects.delete(funcParent);
        return true;
      }
      function unpatchAll() {
        for (var [parentObject, patchedObject] of patchedObjects.entries())
          for (var funcName in patchedObject)
            for (var hookType of patchTypes)
              for (var hookId of patchedObject[funcName]?.[hookType].keys() ?? [])
                unpatch(parentObject, funcName, hookId, hookType);
      }
      var getPatchFunc_default = (patchType) => (funcName, funcParent, callback, oneTime = false) => {
        if (typeof funcParent[funcName] !== "function")
          throw new Error(`${funcName} is not a function in ${funcParent.constructor.name}`);
        if (!patchedObjects.has(funcParent))
          patchedObjects.set(funcParent, /* @__PURE__ */ Object.create(null));
        var parentInjections = patchedObjects.get(funcParent);
        if (!parentInjections[funcName]) {
          var origFunc = funcParent[funcName];
          parentInjections[funcName] = {
            o: origFunc,
            b: /* @__PURE__ */ new Map(),
            i: /* @__PURE__ */ new Map(),
            a: /* @__PURE__ */ new Map()
          };
          var runHook = (ctxt, args, construct) => {
            var ret = hook_default(funcName, funcParent, args, ctxt, construct);
            if (oneTime)
              unpatchThisPatch();
            return ret;
          };
          var replaceProxy = new Proxy(origFunc, {
            apply: (_2, ctxt, args) => runHook(ctxt, args, false),
            construct: (_2, args) => runHook(origFunc, args, true),
            get: (target, prop, receiver) => prop == "toString" ? origFunc.toString.bind(origFunc) : Reflect.get(target, prop, receiver)
          });
          var success = Reflect.defineProperty(funcParent, funcName, {
            value: replaceProxy,
            configurable: true,
            writable: true
          });
          if (!success)
            funcParent[funcName] = replaceProxy;
        }
        var hookId = Symbol();
        var unpatchThisPatch = () => unpatch(funcParent, funcName, hookId, patchType);
        parentInjections[funcName][patchType].set(hookId, callback);
        return unpatchThisPatch;
      };
      var before3 = getPatchFunc_default("b");
      var instead4 = getPatchFunc_default("i");
      var after2 = getPatchFunc_default("a");
    }
  });

  // src/lib/api/native/modules/index.ts
  var modules_exports = {};
  __export(modules_exports, {
    BundleUpdaterManager: () => BundleUpdaterManager,
    ImageLoader: () => ImageLoader,
    NativeCacheModule: () => NativeCacheModule,
    NativeClientInfoModule: () => NativeClientInfoModule,
    NativeDeviceModule: () => NativeDeviceModule,
    NativeFileModule: () => NativeFileModule,
    NativeThemeModule: () => NativeThemeModule
  });
  function getNativeModule(...names) {
    for (var name of names) {
      if (globalThis.__turboModuleProxy) {
        var module = globalThis.__turboModuleProxy(name);
        if (module)
          return module;
      }
      if (nmp[name])
        return nmp[name];
    }
    return void 0;
  }
  var nmp, NativeCacheModule, NativeFileModule, NativeClientInfoModule, NativeDeviceModule, NativeThemeModule, BundleUpdaterManager, ImageLoader;
  var init_modules = __esm({
    "src/lib/api/native/modules/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      nmp = globalThis.nativeModuleProxy;
      NativeCacheModule = getNativeModule("NativeCacheModule", "MMKVManager");
      NativeFileModule = getNativeModule("NativeFileModule", "RTNFileManager", "DCDFileManager");
      NativeClientInfoModule = getNativeModule("NativeClientInfoModule", "RTNClientInfoManager", "InfoDictionaryManager");
      NativeDeviceModule = getNativeModule("NativeDeviceModule", "RTNDeviceManager", "DCDDeviceManager");
      NativeThemeModule = getNativeModule("NativeThemeModule", "RTNThemeManager", "DCDTheme");
      BundleUpdaterManager = getNativeModule("BundleUpdaterManager");
      ImageLoader = getNativeModule("ImageLoader");
    }
  });

  // src/lib/api/native/fs.ts
  var fs_exports = {};
  __export(fs_exports, {
    clearFolder: () => clearFolder,
    downloadFile: () => downloadFile,
    fileExists: () => fileExists,
    readFile: () => readFile,
    removeCacheFile: () => removeCacheFile,
    removeFile: () => removeFile,
    writeFile: () => writeFile
  });
  function clearFolder(_0) {
    return _async_to_generator(function* (path, { prefix = "pyoncord/" } = {}) {
      if (typeof NativeFileModule.clearFolder !== "function")
        throw new Error("'fs.clearFolder' is not supported");
      return void (yield NativeFileModule.clearFolder("documents", `${prefix}${path}`));
    }).apply(this, arguments);
  }
  function removeFile(_0) {
    return _async_to_generator(function* (path, { prefix = "pyoncord/" } = {}) {
      if (typeof NativeFileModule.removeFile !== "function")
        throw new Error("'fs.removeFile' is not supported");
      return void (yield NativeFileModule.removeFile("documents", `${prefix}${path}`));
    }).apply(this, arguments);
  }
  function removeCacheFile(path, prefix = "pyoncord/") {
    return _async_to_generator(function* () {
      if (typeof NativeFileModule.removeFile !== "function")
        throw new Error("'fs.removeFile' is not supported");
      return void (yield NativeFileModule.removeFile("cache", `${prefix}${path}`));
    })();
  }
  function fileExists(_0) {
    return _async_to_generator(function* (path, { prefix = "pyoncord/" } = {}) {
      return yield NativeFileModule.fileExists(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`);
    }).apply(this, arguments);
  }
  function writeFile(_0, _1) {
    return _async_to_generator(function* (path, data, { prefix = "pyoncord/" } = {}) {
      if (typeof data !== "string")
        throw new Error("Argument 'data' must be a string");
      return void (yield NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "utf8"));
    }).apply(this, arguments);
  }
  function readFile(_0) {
    return _async_to_generator(function* (path, { prefix = "pyoncord/" } = {}) {
      try {
        return yield NativeFileModule.readFile(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`, "utf8");
      } catch (err) {
        throw new Error(`An error occured while writing to '${path}'`, {
          cause: err
        });
      }
    }).apply(this, arguments);
  }
  function downloadFile(_0, _1) {
    return _async_to_generator(function* (url2, path, { prefix = "pyoncord/" } = {}) {
      var response = yield fetch(url2);
      if (!response.ok) {
        throw new Error(`Failed to download file from ${url2}: ${response.status}`);
      }
      var arrayBuffer = yield response.arrayBuffer();
      var data = Buffer.from(arrayBuffer).toString("base64");
      yield NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "base64");
    }).apply(this, arguments);
  }
  var init_fs = __esm({
    "src/lib/api/native/fs.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_modules();
    }
  });

  // node_modules/@swc/helpers/esm/_get_prototype_of.js
  function _get_prototype_of(o) {
    _get_prototype_of = Object.setPrototypeOf ? Object.getPrototypeOf : function getPrototypeOf(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _get_prototype_of(o);
  }
  var init_get_prototype_of = __esm({
    "node_modules/@swc/helpers/esm/_get_prototype_of.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_is_native_reflect_construct.js
  function _is_native_reflect_construct() {
    try {
      var result = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (_2) {
    }
    return (_is_native_reflect_construct = function _is_native_reflect_construct2() {
      return !!result;
    })();
  }
  var init_is_native_reflect_construct = __esm({
    "node_modules/@swc/helpers/esm/_is_native_reflect_construct.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_assert_this_initialized.js
  function _assert_this_initialized(self) {
    if (self === void 0)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return self;
  }
  var init_assert_this_initialized = __esm({
    "node_modules/@swc/helpers/esm/_assert_this_initialized.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_type_of.js
  function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
  }
  var init_type_of = __esm({
    "node_modules/@swc/helpers/esm/_type_of.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_possible_constructor_return.js
  function _possible_constructor_return(self, call) {
    if (call && (_type_of(call) === "object" || typeof call === "function"))
      return call;
    return _assert_this_initialized(self);
  }
  var init_possible_constructor_return = __esm({
    "node_modules/@swc/helpers/esm/_possible_constructor_return.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_assert_this_initialized();
      init_type_of();
    }
  });

  // node_modules/@swc/helpers/esm/_call_super.js
  function _call_super(_this, derived, args) {
    derived = _get_prototype_of(derived);
    return _possible_constructor_return(_this, _is_native_reflect_construct() ? Reflect.construct(derived, args || [], _get_prototype_of(_this).constructor) : derived.apply(_this, args));
  }
  var init_call_super = __esm({
    "node_modules/@swc/helpers/esm/_call_super.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_get_prototype_of();
      init_is_native_reflect_construct();
      init_possible_constructor_return();
    }
  });

  // node_modules/@swc/helpers/esm/_class_call_check.js
  function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor))
      throw new TypeError("Cannot call a class as a function");
  }
  var init_class_call_check = __esm({
    "node_modules/@swc/helpers/esm/_class_call_check.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_set_prototype_of.js
  function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _set_prototype_of(o, p);
  }
  var init_set_prototype_of = __esm({
    "node_modules/@swc/helpers/esm/_set_prototype_of.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_inherits.js
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass)
      _set_prototype_of(subClass, superClass);
  }
  var init_inherits = __esm({
    "node_modules/@swc/helpers/esm/_inherits.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_set_prototype_of();
    }
  });

  // node_modules/es-toolkit/dist/function/debounce.mjs
  function debounce(func, debounceMs, { signal, edges } = {}) {
    var pendingThis = void 0;
    var pendingArgs = null;
    var leading = edges != null && edges.includes("leading");
    var trailing = edges == null || edges.includes("trailing");
    var invoke = () => {
      if (pendingArgs !== null) {
        func.apply(pendingThis, pendingArgs);
        pendingThis = void 0;
        pendingArgs = null;
      }
    };
    var onTimerEnd = () => {
      if (trailing) {
        invoke();
      }
      cancel();
    };
    var timeoutId = null;
    var schedule = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        timeoutId = null;
        onTimerEnd();
      }, debounceMs);
    };
    var cancelTimer = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    var cancel = () => {
      cancelTimer();
      pendingThis = void 0;
      pendingArgs = null;
    };
    var flush = () => {
      invoke();
    };
    var debounced = function debounced2(...args) {
      if (signal?.aborted) {
        return;
      }
      pendingThis = this;
      pendingArgs = args;
      var isFirstCall = timeoutId == null;
      schedule();
      if (leading && isFirstCall) {
        invoke();
      }
    };
    debounced.schedule = schedule;
    debounced.cancel = cancel;
    debounced.flush = flush;
    signal?.addEventListener("abort", cancel, {
      once: true
    });
    return debounced;
  }
  var init_debounce = __esm({
    "node_modules/es-toolkit/dist/function/debounce.mjs"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/es-toolkit/dist/object/omit.mjs
  function omit(obj, keys) {
    var result = {
      ...obj
    };
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      delete result[key];
    }
    return result;
  }
  var init_omit = __esm({
    "node_modules/es-toolkit/dist/object/omit.mjs"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_create_class.js
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    return Constructor;
  }
  var init_create_class = __esm({
    "node_modules/@swc/helpers/esm/_create_class.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_define_property.js
  function _define_property(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else
      obj[key] = value;
    return obj;
  }
  var init_define_property = __esm({
    "node_modules/@swc/helpers/esm/_define_property.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/es-toolkit/dist/index.mjs
  var init_dist = __esm({
    "node_modules/es-toolkit/dist/index.mjs"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_debounce();
      init_omit();
    }
  });

  // src/metro/internals/enums.ts
  var ModuleFlags, ModulesMapInternal;
  var init_enums = __esm({
    "src/metro/internals/enums.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      ModuleFlags = /* @__PURE__ */ function(ModuleFlags2) {
        ModuleFlags2[ModuleFlags2["EXISTS"] = 1] = "EXISTS";
        ModuleFlags2[ModuleFlags2["BLACKLISTED"] = 2] = "BLACKLISTED";
        ModuleFlags2[ModuleFlags2["ASSET"] = 4] = "ASSET";
        return ModuleFlags2;
      }({});
      ModulesMapInternal = /* @__PURE__ */ function(ModulesMapInternal2) {
        ModulesMapInternal2[ModulesMapInternal2["FULL_LOOKUP"] = 0] = "FULL_LOOKUP";
        ModulesMapInternal2[ModulesMapInternal2["NOT_FOUND"] = 1] = "NOT_FOUND";
        return ModulesMapInternal2;
      }({});
    }
  });

  // src/lib/api/patcher.ts
  var patcher_exports = {};
  __export(patcher_exports, {
    _patcherDelaySymbol: () => _patcherDelaySymbol,
    after: () => after,
    before: () => before,
    default: () => patcher_default,
    instead: () => instead
  });
  function create(fn) {
    function patchFn(...args) {
      if (typeof args[1][_patcherDelaySymbol] === "function") {
        var delayCallback = args[1][_patcherDelaySymbol];
        var cancel = false;
        var unpatch = () => cancel = true;
        delayCallback((target) => {
          if (cancel)
            return;
          args[1] = target;
          unpatch = fn.apply(this, args);
        });
        return () => unpatch();
      }
      return fn.apply(this, args);
    }
    function promisePatchFn(...args) {
      var thenable = args[1];
      if (!thenable || !("then" in thenable))
        throw new Error("target is not a then-able object");
      var cancel = false;
      var unpatch = () => cancel = true;
      thenable.then((target) => {
        if (cancel)
          return;
        args[1] = target;
        unpatch = patchFn.apply(this, args);
      });
      return () => unpatch();
    }
    return Object.assign(patchFn, {
      await: promisePatchFn
    });
  }
  var _after, _before, _instead, _patcherDelaySymbol, after, before, instead, patcher_default;
  var init_patcher = __esm({
    "src/lib/api/patcher.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      ({ after: _after, before: _before, instead: _instead } = require_cjs());
      _patcherDelaySymbol = Symbol.for("bunny.api.patcher.delay");
      after = create(_after);
      before = create(_before);
      instead = create(_instead);
      patcher_default = {
        after,
        before,
        instead
      };
    }
  });

  // src/lib/api/assets/patches.ts
  var patches_exports = {};
  __export(patches_exports, {
    assetsModule: () => assetsModule,
    patchAssets: () => patchAssets
  });
  function patchAssets(module) {
    if (assetsModule)
      return;
    assetsModule = module;
    var unpatch = after("registerAsset", assetsModule, () => {
      var moduleId = getImportingModuleId();
      if (moduleId !== -1)
        indexAssetModuleFlag(moduleId);
    });
    return unpatch;
  }
  var assetsModule;
  var init_patches = __esm({
    "src/lib/api/assets/patches.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_patcher();
      init_caches();
      init_modules2();
    }
  });

  // src/core/vendetta/Emitter.ts
  var Events, Emitter;
  var init_Emitter = __esm({
    "src/core/vendetta/Emitter.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_class_call_check();
      init_create_class();
      init_define_property();
      Events = /* @__PURE__ */ function(Events2) {
        Events2["GET"] = "GET";
        Events2["SET"] = "SET";
        Events2["DEL"] = "DEL";
        return Events2;
      }({});
      Emitter = /* @__PURE__ */ function() {
        "use strict";
        function Emitter2() {
          _class_call_check(this, Emitter2);
          _define_property(this, "listeners", Object.values(Events).reduce((acc, val) => (acc[val] = /* @__PURE__ */ new Set(), acc), {}));
        }
        _create_class(Emitter2, [
          {
            key: "on",
            value: function on(event, listener) {
              if (!this.listeners[event].has(listener))
                this.listeners[event].add(listener);
            }
          },
          {
            key: "off",
            value: function off(event, listener) {
              this.listeners[event].delete(listener);
            }
          },
          {
            key: "once",
            value: function once(event, listener) {
              var once2 = (event2, data) => {
                this.off(event2, once2);
                listener(event2, data);
              };
              this.on(event, once2);
            }
          },
          {
            key: "emit",
            value: function emit(event, data) {
              for (var listener of this.listeners[event])
                listener(event, data);
            }
          }
        ]);
        return Emitter2;
      }();
    }
  });

  // src/metro/factories.ts
  var factories_exports = {};
  __export(factories_exports, {
    createFilterDefinition: () => createFilterDefinition,
    createSimpleFilter: () => createSimpleFilter
  });
  function createFilterDefinition(fn, uniqMaker) {
    function createHolder(func, args, raw) {
      return Object.assign(func, {
        filter: fn,
        raw,
        uniq: [
          raw && "raw::",
          uniqMaker(args)
        ].filter(Boolean).join("")
      });
    }
    var curry = (raw) => (...args) => {
      return createHolder((m2, id, defaultCheck) => {
        return fn(args, m2, id, defaultCheck);
      }, args, raw);
    };
    return Object.assign(curry(false), {
      byRaw: curry(true),
      uniqMaker
    });
  }
  function createSimpleFilter(filter, uniq) {
    return createFilterDefinition((_2, m2) => filter(m2), () => `dynamic::${uniq}`)();
  }
  var init_factories = __esm({
    "src/metro/factories.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/metro/filters.ts
  var filters_exports = {};
  __export(filters_exports, {
    byDisplayName: () => byDisplayName,
    byFilePath: () => byFilePath,
    byMutableProp: () => byMutableProp,
    byName: () => byName,
    byProps: () => byProps,
    byStoreName: () => byStoreName,
    byTypeName: () => byTypeName
  });
  var byProps, byName, byDisplayName, byTypeName, byStoreName, byFilePath, byMutableProp;
  var init_filters = __esm({
    "src/metro/filters.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_factories();
      init_modules2();
      byProps = createFilterDefinition((props, m2) => props.length === 0 ? m2[props[0]] : props.every((p) => m2[p]), (props) => `bunny.metro.byProps(${props.join(",")})`);
      byName = createFilterDefinition(([name], m2) => m2.name === name, (name) => `bunny.metro.byName(${name})`);
      byDisplayName = createFilterDefinition(([displayName], m2) => m2.displayName === displayName, (name) => `bunny.metro.byDisplayName(${name})`);
      byTypeName = createFilterDefinition(([typeName], m2) => m2.type?.name === typeName, (name) => `bunny.metro.byTypeName(${name})`);
      byStoreName = createFilterDefinition(([name], m2) => m2.getName?.length === 0 && m2.getName() === name, (name) => `bunny.metro.byStoreName(${name})`);
      byFilePath = createFilterDefinition(
        // module return depends on defaultCheck. if true, it'll return module.default, otherwise the whole module
        // unlike filters like byName, defaultCheck doesn't affect the return since we don't rely on exports, but only its ID
        // one could say that this is technically a hack, since defaultCheck is meant for filtering exports
        ([path, exportDefault], _2, id, defaultCheck) => exportDefault === defaultCheck && metroModules[id]?.__filePath === path,
        ([path, exportDefault]) => `bunny.metro.byFilePath(${path},${exportDefault})`
      );
      byMutableProp = createFilterDefinition(([prop], m2) => m2?.[prop] && !Object.getOwnPropertyDescriptor(m2, prop)?.get, (prop) => `bunny.metro.byMutableProp(${prop})`);
    }
  });

  // src/metro/finders.ts
  function filterExports(moduleExports, moduleId, filter) {
    if (moduleExports.default && moduleExports.__esModule && filter(moduleExports.default, moduleId, true)) {
      return {
        exports: filter.raw ? moduleExports : moduleExports.default,
        defaultExport: !filter.raw
      };
    }
    if (!filter.raw && filter(moduleExports, moduleId, false)) {
      return {
        exports: moduleExports,
        defaultExport: false
      };
    }
    return {};
  }
  function findModule(filter) {
    var { cacheId, finish } = getCacherForUniq(filter.uniq, false);
    for (var [id, moduleExports] of getModules(filter.uniq, false)) {
      var { exports: testedExports, defaultExport } = filterExports(moduleExports, id, filter);
      if (testedExports !== void 0) {
        cacheId(id, testedExports);
        return {
          id,
          defaultExport
        };
      }
    }
    finish(true);
    return {};
  }
  function findModuleId(filter) {
    return findModule(filter)?.id;
  }
  function findExports(filter) {
    var { id, defaultExport } = findModule(filter);
    if (id == null)
      return;
    return defaultExport ? requireModule(id).default : requireModule(id);
  }
  function findAllModule(filter) {
    var { cacheId, finish } = getCacherForUniq(filter.uniq, true);
    var foundExports = [];
    for (var [id, moduleExports] of getModules(filter.uniq, true)) {
      var { exports: testedExports, defaultExport } = filterExports(moduleExports, id, filter);
      if (testedExports !== void 0 && typeof defaultExport === "boolean") {
        foundExports.push({
          id,
          defaultExport
        });
        cacheId(id, testedExports);
      }
    }
    finish(foundExports.length === 0);
    return foundExports;
  }
  function findAllModuleId(filter) {
    return findAllModule(filter).map((e) => e.id);
  }
  function findAllExports(filter) {
    return findAllModule(filter).map((ret) => {
      if (!ret.id)
        return;
      var { id, defaultExport } = ret;
      return defaultExport ? requireModule(id).default : requireModule(id);
    });
  }
  var init_finders = __esm({
    "src/metro/finders.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_caches();
      init_modules2();
    }
  });

  // src/lib/utils/lazy.ts
  var lazy_exports = {};
  __export(lazy_exports, {
    getProxyFactory: () => getProxyFactory,
    lazyDestructure: () => lazyDestructure,
    proxyLazy: () => proxyLazy
  });
  function proxyLazy(factory, opts = {}) {
    var cache;
    var dummy = opts.hint !== "object" ? function dummy2() {
    } : {};
    var proxyFactory = () => cache ??= factory();
    var proxy = new Proxy(dummy, lazyHandler);
    factories.set(proxy, proxyFactory);
    proxyContextHolder.set(dummy, {
      factory,
      options: opts
    });
    return proxy;
  }
  function lazyDestructure(factory, opts = {}) {
    var proxiedObject = proxyLazy(factory);
    return new Proxy({}, {
      get(_2, property) {
        if (property === Symbol.iterator) {
          return function* () {
            yield proxiedObject;
            yield new Proxy({}, {
              get: (_3, p) => proxyLazy(() => proxiedObject[p], opts)
            });
            throw new Error("This is not a real iterator, this is likely used incorrectly");
          };
        }
        return proxyLazy(() => proxiedObject[property], opts);
      }
    });
  }
  function getProxyFactory(obj) {
    return factories.get(obj);
  }
  var unconfigurable, isUnconfigurable, factories, proxyContextHolder, lazyHandler;
  var init_lazy = __esm({
    "src/lib/utils/lazy.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      unconfigurable = /* @__PURE__ */ new Set([
        "arguments",
        "caller",
        "prototype"
      ]);
      isUnconfigurable = (key) => typeof key === "string" && unconfigurable.has(key);
      factories = /* @__PURE__ */ new WeakMap();
      proxyContextHolder = /* @__PURE__ */ new WeakMap();
      lazyHandler = {
        ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map((fnName) => {
          return [
            fnName,
            (target, ...args) => {
              var contextHolder = proxyContextHolder.get(target);
              var resolved = contextHolder?.factory();
              if (!resolved)
                throw new Error(`Trying to Reflect.${fnName} of ${typeof resolved}`);
              return Reflect[fnName](resolved, ...args);
            }
          ];
        })),
        has(target, p) {
          var contextHolder = proxyContextHolder.get(target);
          if (contextHolder?.options) {
            var { exemptedEntries: isolatedEntries } = contextHolder.options;
            if (isolatedEntries && p in isolatedEntries)
              return true;
          }
          var resolved = contextHolder?.factory();
          if (!resolved)
            throw new Error(`Trying to Reflect.has of ${typeof resolved}`);
          return Reflect.has(resolved, p);
        },
        get(target, p, receiver) {
          if (p === "__IS_BUNNY_LAZY_PROXY__")
            return true;
          var contextHolder = proxyContextHolder.get(target);
          if (contextHolder?.options) {
            var { exemptedEntries: isolatedEntries } = contextHolder.options;
            if (isolatedEntries?.[p])
              return isolatedEntries[p];
          }
          var resolved = contextHolder?.factory();
          if (!resolved)
            throw new Error(`Trying to Reflect.get of ${typeof resolved}`);
          return Reflect.get(resolved, p, receiver);
        },
        ownKeys: (target) => {
          var contextHolder = proxyContextHolder.get(target);
          var resolved = contextHolder?.factory();
          if (!resolved)
            throw new Error(`Trying to Reflect.ownKeys of ${typeof resolved}`);
          var cacheKeys = Reflect.ownKeys(resolved);
          unconfigurable.forEach((key) => !cacheKeys.includes(key) && cacheKeys.push(key));
          return cacheKeys;
        },
        getOwnPropertyDescriptor: (target, p) => {
          if (isUnconfigurable(p))
            return Reflect.getOwnPropertyDescriptor(target, p);
          var contextHolder = proxyContextHolder.get(target);
          var resolved = contextHolder?.factory();
          if (!resolved)
            throw new Error(`Trying to getOwnPropertyDescriptor of ${typeof resolved}`);
          var descriptor = Reflect.getOwnPropertyDescriptor(resolved, p);
          if (descriptor)
            Object.defineProperty(target, p, descriptor);
          return descriptor;
        }
      };
    }
  });

  // src/metro/lazy.ts
  var lazy_exports2 = {};
  __export(lazy_exports2, {
    _lazyContextSymbol: () => _lazyContextSymbol,
    createLazyModule: () => createLazyModule,
    getLazyContext: () => getLazyContext
  });
  function getIndexedFind(filter) {
    var modulesMap = getMetroCache().findIndex[filter.uniq];
    if (!modulesMap)
      return void 0;
    for (var k in modulesMap)
      if (k[0] !== "_")
        return Number(k);
  }
  function subscribeLazyModule(proxy, callback) {
    var info = getLazyContext(proxy);
    if (!info)
      throw new Error("Subscribing a module for non-proxy-find");
    if (!info.indexed)
      throw new Error("Attempting to subscribe to a non-indexed find");
    return subscribeModule(info.moduleId, () => {
      callback(findExports(info.filter));
    });
  }
  function getLazyContext(proxy) {
    return _lazyContexts.get(proxy);
  }
  function createLazyModule(filter) {
    var cache = void 0;
    var moduleId = getIndexedFind(filter);
    var context = {
      filter,
      indexed: !!moduleId,
      moduleId,
      getExports(cb) {
        if (!moduleId || metroModules[moduleId]?.isInitialized) {
          cb(this.forceLoad());
          return () => void 0;
        }
        return this.subscribe(cb);
      },
      subscribe(cb) {
        return subscribeLazyModule(proxy, cb);
      },
      get cache() {
        return cache;
      },
      forceLoad() {
        cache ??= findExports(filter);
        if (!cache)
          throw new Error(`${filter.uniq} is ${typeof cache}! (id ${context.moduleId ?? "unknown"})`);
        return cache;
      }
    };
    var proxy = proxyLazy(() => context.forceLoad(), {
      exemptedEntries: {
        [_lazyContextSymbol]: context,
        [_patcherDelaySymbol]: (cb) => context.getExports(cb)
      }
    });
    _lazyContexts.set(proxy, context);
    return proxy;
  }
  var _lazyContextSymbol, _lazyContexts;
  var init_lazy2 = __esm({
    "src/metro/lazy.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_patcher();
      init_lazy();
      init_finders();
      init_caches();
      init_modules2();
      _lazyContextSymbol = Symbol.for("bunny.metro.lazyContext");
      _lazyContexts = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/metro/wrappers.ts
  var findByProps, findByPropsLazy, findByPropsAll, findByName, findByNameLazy, findByNameAll, findByDisplayName, findByDisplayNameLazy, findByDisplayNameAll, findByTypeName, findByTypeNameLazy, findByTypeNameAll, findByStoreName, findByStoreNameLazy, findByFilePath, findByFilePathLazy;
  var init_wrappers = __esm({
    "src/metro/wrappers.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_filters();
      init_finders();
      init_lazy2();
      findByProps = (...props) => findExports(byProps(...props));
      findByPropsLazy = (...props) => createLazyModule(byProps(...props));
      findByPropsAll = (...props) => findAllExports(byProps(...props));
      findByName = (name, expDefault = true) => findExports(expDefault ? byName(name) : byName.byRaw(name));
      findByNameLazy = (name, expDefault = true) => createLazyModule(expDefault ? byName(name) : byName.byRaw(name));
      findByNameAll = (name, expDefault = true) => findAllExports(expDefault ? byName(name) : byName.byRaw(name));
      findByDisplayName = (name, expDefault = true) => findExports(expDefault ? byDisplayName(name) : byDisplayName.byRaw(name));
      findByDisplayNameLazy = (name, expDefault = true) => createLazyModule(expDefault ? byDisplayName(name) : byDisplayName.byRaw(name));
      findByDisplayNameAll = (name, expDefault = true) => findAllExports(expDefault ? byDisplayName(name) : byDisplayName.byRaw(name));
      findByTypeName = (name, expDefault = true) => findExports(expDefault ? byTypeName(name) : byTypeName.byRaw(name));
      findByTypeNameLazy = (name, expDefault = true) => createLazyModule(expDefault ? byTypeName(name) : byTypeName.byRaw(name));
      findByTypeNameAll = (name, expDefault = true) => findAllExports(expDefault ? byTypeName(name) : byTypeName.byRaw(name));
      findByStoreName = (name) => findExports(byStoreName(name));
      findByStoreNameLazy = (name) => createLazyModule(byStoreName(name));
      findByFilePath = (path, expDefault = false) => findExports(byFilePath(path, expDefault));
      findByFilePathLazy = (path, expDefault = false) => createLazyModule(byFilePath(path, expDefault));
    }
  });

  // shims/depsModule.ts
  var require_depsModule = __commonJS({
    "shims/depsModule.ts"(exports, module) {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_wrappers();
      module.exports = {
        "react": findByPropsLazy("createElement"),
        "react-native": findByPropsLazy("AppRegistry"),
        "util": findByPropsLazy("inspect", "isNullOrUndefined"),
        "moment": findByPropsLazy("isMoment"),
        "chroma-js": findByPropsLazy("brewer"),
        "lodash": findByPropsLazy("forEachRight")
      };
    }
  });

  // globals:react-native
  var require_react_native = __commonJS({
    "globals:react-native"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["react-native"];
    }
  });

  // src/core/vendetta/storage.ts
  function createProxy(target = {}) {
    var emitter = new Emitter();
    var childrens = /* @__PURE__ */ new WeakMap();
    var proxiedChildrenSet = /* @__PURE__ */ new WeakSet();
    function createProxy1(target2, path) {
      return new Proxy(target2, {
        get(target3, prop) {
          if (prop === emitterSymbol)
            return emitter;
          var newPath = [
            ...path,
            prop
          ];
          var value = target3[prop];
          if (value !== void 0 && value !== null) {
            emitter.emit("GET", {
              path: newPath,
              value
            });
            if (typeof value === "object") {
              if (proxiedChildrenSet.has(value))
                return value;
              if (childrens.has(value))
                return childrens.get(value);
              var childrenProxy = createProxy1(value, newPath);
              childrens.set(value, childrenProxy);
              return childrenProxy;
            }
            return value;
          }
          return value;
        },
        set(target3, prop, value) {
          if (typeof value === "object") {
            if (childrens.has(value)) {
              target3[prop] = childrens.get(value);
            } else {
              var childrenProxy = createProxy1(value, [
                ...path,
                prop
              ]);
              childrens.set(value, childrenProxy);
              proxiedChildrenSet.add(value);
              target3[prop] = childrenProxy;
            }
          } else {
            target3[prop] = value;
          }
          emitter.emit("SET", {
            path: [
              ...path,
              prop
            ],
            value: target3[prop]
          });
          return true;
        },
        deleteProperty(target3, prop) {
          var value = typeof target3[prop] === "object" ? childrens.get(target3[prop]) : target3[prop];
          var success = delete target3[prop];
          if (success)
            emitter.emit("DEL", {
              value,
              path: [
                ...path,
                prop
              ]
            });
          return success;
        }
      });
    }
    return {
      proxy: createProxy1(target, []),
      emitter
    };
  }
  function useProxy(storage) {
    var emitter = storage?.[emitterSymbol];
    if (!emitter)
      throw new Error("storage?.[emitterSymbol] is undefined");
    var [, forceUpdate] = React.useReducer((n) => ~n, 0);
    React.useEffect(() => {
      var listener = (event, data) => {
        if (event === "DEL" && data.value === storage)
          return;
        forceUpdate();
      };
      emitter.on("SET", listener);
      emitter.on("DEL", listener);
      return () => {
        emitter.off("SET", listener);
        emitter.off("DEL", listener);
      };
    }, []);
    return storage;
  }
  function createStorage(backend) {
    return _async_to_generator(function* () {
      var data = yield backend.get();
      var { proxy, emitter } = createProxy(data);
      var handler = () => backend.set(proxy);
      emitter.on("SET", handler);
      emitter.on("DEL", handler);
      return proxy;
    })();
  }
  function wrapSync(store) {
    var awaited = void 0;
    var awaitQueue = [];
    var awaitInit = (cb) => awaited ? cb() : awaitQueue.push(cb);
    store.then((v2) => {
      awaited = v2;
      awaitQueue.forEach((cb) => cb());
    });
    return new Proxy({}, {
      ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map((k) => [
        k,
        (t, ...a) => Reflect[k](awaited ?? t, ...a)
      ])),
      get(target, prop, recv) {
        if (prop === syncAwaitSymbol)
          return awaitInit;
        return Reflect.get(awaited ?? target, prop, recv);
      }
    });
  }
  function awaitStorage(...stores) {
    return Promise.all(stores.map((store) => new Promise((res) => store[syncAwaitSymbol](res))));
  }
  var import_react_native, emitterSymbol, syncAwaitSymbol, ILLEGAL_CHARS_REGEX, filePathFixer, getMMKVPath, purgeStorage, createMMKVBackend, createFileBackend;
  var init_storage = __esm({
    "src/core/vendetta/storage.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_Emitter();
      init_modules();
      import_react_native = __toESM(require_react_native());
      emitterSymbol = Symbol.for("vendetta.storage.emitter");
      syncAwaitSymbol = Symbol.for("vendetta.storage.accessor");
      ILLEGAL_CHARS_REGEX = /[<>:"/\\|?*]/g;
      filePathFixer = (file) => import_react_native.Platform.select({
        default: file,
        ios: NativeFileModule.saveFileToGallery ? file : `Documents/${file}`
      });
      getMMKVPath = (name) => {
        if (ILLEGAL_CHARS_REGEX.test(name)) {
          name = name.replace(ILLEGAL_CHARS_REGEX, "-").replace(/-+/g, "-");
        }
        return `vd_mmkv/${name}`;
      };
      purgeStorage = (store) => _async_to_generator(function* () {
        if (yield NativeCacheModule.getItem(store)) {
          NativeCacheModule.removeItem(store);
        }
        var mmkvPath = getMMKVPath(store);
        if (yield NativeFileModule.fileExists(`${NativeFileModule.getConstants().DocumentsDirPath}/${mmkvPath}`)) {
          yield NativeFileModule.removeFile?.("documents", mmkvPath);
        }
      })();
      createMMKVBackend = (store, defaultData = {}) => {
        var mmkvPath = getMMKVPath(store);
        var defaultStr = JSON.stringify(defaultData);
        return createFileBackend(mmkvPath, defaultData, (() => _async_to_generator(function* () {
          var path = `${NativeFileModule.getConstants().DocumentsDirPath}/${mmkvPath}`;
          if (yield NativeFileModule.fileExists(path))
            return;
          var oldData = (yield NativeCacheModule.getItem(store)) ?? defaultStr;
          if (oldData === "!!LARGE_VALUE!!") {
            var cachePath = `${NativeFileModule.getConstants().CacheDirPath}/mmkv/${store}`;
            if (yield NativeFileModule.fileExists(cachePath)) {
              oldData = yield NativeFileModule.readFile(cachePath, "utf8");
            } else {
              console.log(`${store}: Experienced data loss :(`);
              oldData = defaultStr;
            }
          }
          try {
            JSON.parse(oldData);
          } catch (e) {
            console.error(`${store} had an unparseable data while migrating`);
            oldData = defaultStr;
          }
          yield NativeFileModule.writeFile("documents", filePathFixer(mmkvPath), oldData, "utf8");
          if ((yield NativeCacheModule.getItem(store)) !== null) {
            NativeCacheModule.removeItem(store);
            console.log(`Successfully migrated ${store} store from MMKV storage to fs`);
          }
        })())());
      };
      createFileBackend = (file, defaultData = {}, migratePromise) => {
        return {
          get: () => _async_to_generator(function* () {
            yield migratePromise;
            var path = `${NativeFileModule.getConstants().DocumentsDirPath}/${file}`;
            if (yield NativeFileModule.fileExists(path)) {
              var content = yield NativeFileModule.readFile(path, "utf8");
              try {
                return JSON.parse(content);
              } catch (e) {
              }
            }
            yield NativeFileModule.writeFile("documents", filePathFixer(file), JSON.stringify(defaultData), "utf8");
            return JSON.parse(yield NativeFileModule.readFile(path, "utf8"));
          })(),
          set: (data) => _async_to_generator(function* () {
            yield migratePromise;
            yield NativeFileModule.writeFile("documents", filePathFixer(file), JSON.stringify(data), "utf8");
          })()
        };
      };
    }
  });

  // node_modules/@gullerya/object-observer/dist/object-observer.min.js
  var m, x, E, T, K, c, $, N, Y, I, B, D, R, z, y, g, q, H, G, J, F, P, L, C, Q, X, Z, _, b, S, V, U, W, v;
  var init_object_observer_min = __esm({
    "node_modules/@gullerya/object-observer/dist/object-observer.min.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_call_super();
      init_class_call_check();
      init_create_class();
      init_inherits();
      m = "insert";
      x = "update";
      E = "delete";
      T = "reverse";
      K = "shuffle";
      c = Symbol.for("object-observer-meta-key-0");
      $ = {
        async: 1
      };
      N = (o) => {
        if (!o || typeof o != "object")
          return null;
        var t = {}, e = [];
        for (var [r, n] of Object.entries(o))
          if (r === "path") {
            if (typeof n != "string" || n === "")
              throw new Error('"path" option, if/when provided, MUST be a non-empty string');
            t[r] = n;
          } else if (r === "pathsOf") {
            if (o.path)
              throw new Error('"pathsOf" option MAY NOT be specified together with "path" option');
            if (typeof n != "string")
              throw new Error('"pathsOf" option, if/when provided, MUST be a string (MAY be empty)');
            t[r] = o.pathsOf.split(".").filter(Boolean);
          } else if (r === "pathsFrom") {
            if (o.path || o.pathsOf)
              throw new Error('"pathsFrom" option MAY NOT be specified together with "path"/"pathsOf" option/s');
            if (typeof n != "string" || n === "")
              throw new Error('"pathsFrom" option, if/when provided, MUST be a non-empty string');
            t[r] = n;
          } else
            e.push(r);
        if (e.length)
          throw new Error(`'${e.join(", ")}' is/are not a valid observer option/s`);
        return t;
      };
      Y = (o, t, e) => {
        var r = {};
        r[c] = t;
        for (var n in o)
          r[n] = g(o[n], n, t, e);
        return r;
      };
      I = (o, t, e) => {
        var r = o.length;
        var n = new Array(r);
        n[c] = t;
        for (var i = 0; i < r; i++)
          n[i] = g(o[i], i, t, e);
        return n;
      };
      B = (o, t) => (o[c] = t, o);
      D = (o, t) => {
        if (o === null)
          return t;
        var e = t;
        if (o.path) {
          var r = o.path;
          e = t.filter((n2) => n2.path.join(".") === r);
        } else if (o.pathsOf) {
          var r1 = o.pathsOf, n = r1.join(".");
          e = t.filter((i) => (i.path.length === r1.length + 1 || i.path.length === r1.length && (i.type === T || i.type === K)) && i.path.join(".").startsWith(n));
        } else if (o.pathsFrom) {
          var r2 = o.pathsFrom;
          e = t.filter((n2) => n2.path.join(".").startsWith(r2));
        }
        return e;
      };
      R = (o, t) => {
        try {
          o(t);
        } catch (e) {
          console.error(`failed to notify listener ${o} with ${t}`, e);
        }
      };
      z = function z2() {
        var t = this.batches;
        this.batches = [];
        for (var [e, r] of t)
          R(e, r);
      };
      y = (o, t) => {
        var e = o, r, n, i, l, h, s;
        var u = t.length;
        do {
          for (r = e.options.async, n = e.observers, s = n.length; s--; )
            if ([i, l] = n[s], h = D(l, t), h.length)
              if (r) {
                e.batches.length === 0 && queueMicrotask(z.bind(e));
                var a = void 0;
                for (var p of e.batches)
                  if (p[0] === i) {
                    a = p;
                    break;
                  }
                a || (a = [
                  i,
                  []
                ], e.batches.push(a)), Array.prototype.push.apply(a[1], h);
              } else
                R(i, h);
          var f = e.parent;
          if (f) {
            for (var a1 = 0; a1 < u; a1++) {
              var p1 = t[a1];
              t[a1] = new b(p1.type, [
                e.ownKey,
                ...p1.path
              ], p1.value, p1.oldValue, p1.object);
            }
            e = f;
          } else
            e = null;
        } while (e);
      };
      g = (o, t, e, r) => r !== void 0 && r.has(o) ? null : typeof o != "object" || o === null ? o : Array.isArray(o) ? new U({
        target: o,
        ownKey: t,
        parent: e,
        visited: r
      }).proxy : ArrayBuffer.isView(o) ? new W({
        target: o,
        ownKey: t,
        parent: e
      }).proxy : o instanceof Date ? o : new V({
        target: o,
        ownKey: t,
        parent: e,
        visited: r
      }).proxy;
      q = function q2() {
        var t = this[c], e = t.target, r = e.length - 1;
        var n = e.pop();
        if (n && typeof n == "object") {
          var l = n[c];
          l && (n = l.detach());
        }
        var i = [
          new b(E, [
            r
          ], void 0, n, this)
        ];
        return y(t, i), n;
      };
      H = function H2() {
        var t = this[c], e = t.target, r = arguments.length, n = new Array(r), i = e.length;
        for (var s = 0; s < r; s++)
          n[s] = g(arguments[s], i + s, t);
        var l = Reflect.apply(e.push, e, n), h = [];
        for (var s1 = i, u = e.length; s1 < u; s1++)
          h[s1 - i] = new b(m, [
            s1
          ], e[s1], void 0, this);
        return y(t, h), l;
      };
      G = function G2() {
        var t = this[c], e = t.target;
        var r, n, i, l, h;
        for (r = e.shift(), r && typeof r == "object" && (h = r[c], h && (r = h.detach())), n = 0, i = e.length; n < i; n++)
          l = e[n], l && typeof l == "object" && (h = l[c], h && (h.ownKey = n));
        var s = [
          new b(E, [
            0
          ], void 0, r, this)
        ];
        return y(t, s), r;
      };
      J = function J2() {
        var t = this[c], e = t.target, r = arguments.length, n = new Array(r);
        for (var s = 0; s < r; s++)
          n[s] = g(arguments[s], s, t);
        var i = Reflect.apply(e.unshift, e, n);
        for (var s1 = 0, u = e.length, f; s1 < u; s1++)
          if (f = e[s1], f && typeof f == "object") {
            var a = f[c];
            a && (a.ownKey = s1);
          }
        var l = n.length, h = new Array(l);
        for (var s2 = 0; s2 < l; s2++)
          h[s2] = new b(m, [
            s2
          ], e[s2], void 0, this);
        return y(t, h), i;
      };
      F = function F2() {
        var t = this[c], e = t.target;
        var r, n, i;
        for (e.reverse(), r = 0, n = e.length; r < n; r++)
          if (i = e[r], i && typeof i == "object") {
            var h = i[c];
            h && (h.ownKey = r);
          }
        var l = [
          new b(T, [], void 0, void 0, this)
        ];
        return y(t, l), this;
      };
      P = function P2(t) {
        var e = this[c], r = e.target;
        var n, i, l;
        for (r.sort(t), n = 0, i = r.length; n < i; n++)
          if (l = r[n], l && typeof l == "object") {
            var s = l[c];
            s && (s.ownKey = n);
          }
        var h = [
          new b(K, [], void 0, void 0, this)
        ];
        return y(e, h), this;
      };
      L = function L2(t, e, r) {
        var n = this[c], i = n.target, l = [], h = i.length, s = i.slice(0);
        if (e = e === void 0 ? 0 : e < 0 ? Math.max(h + e, 0) : Math.min(e, h), r = r === void 0 ? h : r < 0 ? Math.max(h + r, 0) : Math.min(r, h), e < h && r > e) {
          i.fill(t, e, r);
          var u;
          for (var f = e, a, p; f < r; f++)
            a = i[f], i[f] = g(a, f, n), f in s ? (p = s[f], p && typeof p == "object" && (u = p[c], u && (p = u.detach())), l.push(new b(x, [
              f
            ], i[f], p, this))) : l.push(new b(m, [
              f
            ], i[f], void 0, this));
          y(n, l);
        }
        return this;
      };
      C = function C2(t, e, r) {
        var n = this[c], i = n.target, l = i.length;
        t = t < 0 ? Math.max(l + t, 0) : t, e = e === void 0 ? 0 : e < 0 ? Math.max(l + e, 0) : Math.min(e, l), r = r === void 0 ? l : r < 0 ? Math.max(l + r, 0) : Math.min(r, l);
        var h = Math.min(r - e, l - t);
        if (t < l && t !== e && h > 0) {
          var s = i.slice(0), u = [];
          i.copyWithin(t, e, r);
          for (var f = t, a, p, O; f < t + h; f++)
            a = i[f], a && typeof a == "object" && (a = g(a, f, n), i[f] = a), p = s[f], p && typeof p == "object" && (O = p[c], O && (p = O.detach())), !(typeof a != "object" && a === p) && u.push(new b(x, [
              f
            ], a, p, this));
          y(n, u);
        }
        return this;
      };
      Q = function Q2() {
        var t = this[c], e = t.target, r = arguments.length, n = new Array(r), i = e.length;
        for (var w = 0; w < r; w++)
          n[w] = g(arguments[w], w, t);
        var l = r === 0 ? 0 : n[0] < 0 ? i + n[0] : n[0], h = r < 2 ? i - l : n[1], s = Math.max(r - 2, 0), u = Reflect.apply(e.splice, e, n), f = e.length;
        var a;
        for (var w1 = 0, A; w1 < f; w1++)
          A = e[w1], A && typeof A == "object" && (a = A[c], a && (a.ownKey = w1));
        var p, O, j;
        for (p = 0, O = u.length; p < O; p++)
          j = u[p], j && typeof j == "object" && (a = j[c], a && (u[p] = a.detach()));
        var M = [];
        var d;
        for (d = 0; d < h; d++)
          d < s ? M.push(new b(x, [
            l + d
          ], e[l + d], u[d], this)) : M.push(new b(E, [
            l + d
          ], void 0, u[d], this));
        for (; d < s; d++)
          M.push(new b(m, [
            l + d
          ], e[l + d], void 0, this));
        return y(t, M), u;
      };
      X = function X2(t, e) {
        var r = this[c], n = r.target, i = t.length, l = n.slice(0);
        e = e || 0, n.set(t, e);
        var h = new Array(i);
        for (var s = e; s < i + e; s++)
          h[s - e] = new b(x, [
            s
          ], n[s], l[s], this);
        y(r, h);
      };
      Z = {
        pop: q,
        push: H,
        shift: G,
        unshift: J,
        reverse: F,
        sort: P,
        fill: L,
        copyWithin: C,
        splice: Q
      };
      _ = {
        reverse: F,
        sort: P,
        fill: L,
        copyWithin: C,
        set: X
      };
      b = function b2(t, e, r, n, i) {
        "use strict";
        _class_call_check(this, b2);
        this.type = t, this.path = e, this.value = r, this.oldValue = n, this.object = i;
      };
      S = /* @__PURE__ */ function() {
        "use strict";
        function S2(t, e) {
          _class_call_check(this, S2);
          var { target: r, parent: n, ownKey: i, visited: l = /* @__PURE__ */ new Set() } = t;
          n && i !== void 0 ? (this.parent = n, this.ownKey = i) : (this.parent = null, this.ownKey = null), l.add(r);
          var h = e(r, this, l);
          l.delete(r), this.observers = [], this.revocable = Proxy.revocable(h, this), this.proxy = this.revocable.proxy, this.target = h, this.options = this.processOptions(t.options), this.options.async && (this.batches = []);
        }
        _create_class(S2, [
          {
            key: "processOptions",
            value: function processOptions(t) {
              if (t) {
                if (typeof t != "object")
                  throw new Error(`Observable options if/when provided, MAY only be an object, got '${t}'`);
                var e = Object.keys(t).filter((r) => !(r in $));
                if (e.length)
                  throw new Error(`'${e.join(", ")}' is/are not a valid Observable option/s`);
                return Object.assign({}, t);
              } else
                return {};
            }
          },
          {
            key: "detach",
            value: function detach() {
              return this.parent = null, this.target;
            }
          },
          {
            key: "set",
            value: function set(t, e, r) {
              var n = t[e];
              if (r !== n) {
                var i = g(r, e, this);
                if (t[e] = i, n && typeof n == "object") {
                  var h = n[c];
                  h && (n = h.detach());
                }
                var l = n === void 0 ? [
                  new b(m, [
                    e
                  ], i, void 0, this.proxy)
                ] : [
                  new b(x, [
                    e
                  ], i, n, this.proxy)
                ];
                y(this, l);
              }
              return true;
            }
          },
          {
            key: "deleteProperty",
            value: function deleteProperty(t, e) {
              var r = t[e];
              if (delete t[e], r && typeof r == "object") {
                var i = r[c];
                i && (r = i.detach());
              }
              var n = [
                new b(E, [
                  e
                ], void 0, r, this.proxy)
              ];
              return y(this, n), true;
            }
          }
        ]);
        return S2;
      }();
      V = /* @__PURE__ */ function(S2) {
        "use strict";
        _inherits(V2, S2);
        function V2(t) {
          _class_call_check(this, V2);
          return _call_super(this, V2, [
            t,
            Y
          ]);
        }
        return V2;
      }(S);
      U = /* @__PURE__ */ function(S2) {
        "use strict";
        _inherits(U2, S2);
        function U2(t) {
          _class_call_check(this, U2);
          return _call_super(this, U2, [
            t,
            I
          ]);
        }
        _create_class(U2, [
          {
            key: "get",
            value: function get(t, e) {
              return Z[e] || t[e];
            }
          }
        ]);
        return U2;
      }(S);
      W = /* @__PURE__ */ function(S2) {
        "use strict";
        _inherits(W2, S2);
        function W2(t) {
          _class_call_check(this, W2);
          return _call_super(this, W2, [
            t,
            B
          ]);
        }
        _create_class(W2, [
          {
            key: "get",
            value: function get(t, e) {
              return _[e] || t[e];
            }
          }
        ]);
        return W2;
      }(S);
      v = Object.freeze({
        from: (o, t) => {
          if (!o || typeof o != "object")
            throw new Error("observable MAY ONLY be created from a non-null object");
          if (o[c])
            return o;
          if (Array.isArray(o))
            return new U({
              target: o,
              ownKey: null,
              parent: null,
              options: t
            }).proxy;
          if (ArrayBuffer.isView(o))
            return new W({
              target: o,
              ownKey: null,
              parent: null,
              options: t
            }).proxy;
          if (o instanceof Date)
            throw new Error(`${o} found to be one of a non-observable types`);
          return new V({
            target: o,
            ownKey: null,
            parent: null,
            options: t
          }).proxy;
        },
        isObservable: (o) => !!(o && o[c]),
        observe: (o, t, e) => {
          if (!v.isObservable(o))
            throw new Error("invalid observable parameter");
          if (typeof t != "function")
            throw new Error(`observer MUST be a function, got '${t}'`);
          var r = o[c].observers;
          r.some((n) => n[0] === t) ? console.warn("observer may be bound to an observable only once; will NOT rebind") : r.push([
            t,
            N(e)
          ]);
        },
        unobserve: (o, ...t) => {
          if (!v.isObservable(o))
            throw new Error("invalid observable parameter");
          var e = o[c].observers;
          var r = e.length;
          if (r) {
            if (!t.length) {
              e.splice(0);
              return;
            }
            for (; r; )
              t.indexOf(e[--r][0]) >= 0 && e.splice(r, 1);
          }
        }
      });
    }
  });

  // src/lib/api/storage/index.ts
  var storage_exports = {};
  __export(storage_exports, {
    awaitStorage: () => awaitStorage2,
    createStorage: () => createStorage2,
    createStorageAndCallback: () => createStorageAndCallback,
    createStorageAsync: () => createStorageAsync,
    getPreloadedStorage: () => getPreloadedStorage,
    preloadStorageIfExists: () => preloadStorageIfExists,
    purgeStorage: () => purgeStorage2,
    updateStorage: () => updateStorage,
    useObservable: () => useObservable
  });
  function createFileBackend2(filePath) {
    var write = debounce((data) => {
      writeFile(filePath, JSON.stringify(data));
    }, 500);
    return {
      get: () => _async_to_generator(function* () {
        try {
          return JSON.parse(yield readFile(filePath));
        } catch (e) {
          throw new Error(`Failed to parse storage from '${filePath}'`, {
            cause: e
          });
        }
      })(),
      set: (data) => _async_to_generator(function* () {
        if (!data || typeof data !== "object") {
          throw new Error("data needs to be an object");
        }
        write(data);
      })(),
      exists: () => _async_to_generator(function* () {
        return yield fileExists(filePath);
      })()
    };
  }
  function useObservable(observables, opts) {
    if (observables.some((o) => o?.[storageInitErrorSymbol]))
      throw new Error("An error occured while initializing the storage");
    if (observables.some((o) => !v.isObservable(o))) {
      throw new Error("Argument passed isn't an Observable");
    }
    var [, forceUpdate] = React.useReducer((n) => ~n, 0);
    React.useEffect(() => {
      var listener = () => forceUpdate();
      observables.forEach((o) => v.observe(o, listener, opts));
      return () => {
        observables.forEach((o) => v.unobserve(o, listener));
      };
    }, []);
  }
  function updateStorage(path, value) {
    return _async_to_generator(function* () {
      _loadedStorage[path] = value;
      createFileBackend2(path).set(value);
    })();
  }
  function createStorageAndCallback(path, cb, { dflt = {}, nullIfEmpty = false } = {}) {
    var emitter;
    var callback = (data) => {
      var proxy = new Proxy(v.from(data), {
        get(target, prop, receiver) {
          if (prop === Symbol.for("vendetta.storage.emitter")) {
            if (emitter)
              return emitter;
            emitter = new Emitter();
            v.observe(target, (changes) => {
              for (var change of changes) {
                emitter.emit(change.type !== "delete" ? "SET" : "DEL", {
                  path: change.path,
                  value: change.value
                });
              }
            });
            return emitter;
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      var handler = () => backend.set(proxy);
      v.observe(proxy, handler);
      cb(proxy);
    };
    var backend = createFileBackend2(path);
    if (_loadedStorage[path]) {
      callback(_loadedStorage[path]);
    } else {
      backend.exists().then((exists) => _async_to_generator(function* () {
        if (!exists) {
          if (nullIfEmpty) {
            callback(_loadedStorage[path] = null);
          } else {
            _loadedStorage[path] = dflt;
            yield backend.set(dflt);
            callback(dflt);
          }
        } else {
          callback(_loadedStorage[path] = yield backend.get());
        }
      })());
    }
  }
  function createStorageAsync(_0) {
    return _async_to_generator(function* (path, opts = {}) {
      return new Promise((r) => createStorageAndCallback(path, r, opts));
    }).apply(this, arguments);
  }
  function preloadStorageIfExists(path) {
    return _async_to_generator(function* () {
      if (_loadedStorage[path])
        return true;
      var backend = createFileBackend2(path);
      if (yield backend.exists()) {
        _loadedStorage[path] = yield backend.get();
        return true;
      }
      return false;
    })();
  }
  function purgeStorage2(path) {
    return _async_to_generator(function* () {
      yield removeFile(path);
      delete _loadedStorage[path];
    })();
  }
  function awaitStorage2(...proxies) {
    return Promise.all(proxies.map((proxy) => proxy[storagePromiseSymbol]));
  }
  function getPreloadedStorage(path) {
    return _loadedStorage[path];
  }
  var storageInitErrorSymbol, storagePromiseSymbol, _loadedStorage, createStorage2;
  var init_storage2 = __esm({
    "src/lib/api/storage/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_Emitter();
      init_object_observer_min();
      init_fs();
      init_dist();
      storageInitErrorSymbol = Symbol.for("bunny.storage.initError");
      storagePromiseSymbol = Symbol.for("bunny.storage.promise");
      _loadedStorage = {};
      createStorage2 = (path, opts = {}) => {
        var promise = new Promise((r) => resolvePromise = r);
        var awaited, resolved, error, resolvePromise;
        createStorageAndCallback(path, (proxy) => {
          awaited = proxy;
          resolved = true;
          resolvePromise();
        }, opts);
        var check = () => {
          if (resolved)
            return true;
          throw new Error(`Attempted to access storage without initializing: ${path}`);
        };
        return new Proxy({}, {
          ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map((k) => [
            k,
            (t, ...a) => {
              return check() && Reflect[k](awaited, ...a);
            }
          ])),
          get(target, prop, recv) {
            if (prop === storageInitErrorSymbol)
              return error;
            if (prop === storagePromiseSymbol)
              return promise;
            return check() && Reflect.get(awaited ?? target, prop, recv);
          }
        });
      };
    }
  });

  // src/lib/utils/constants.ts
  var constants_exports = {};
  __export(constants_exports, {
    BUNNY_PROXY_PREFIX: () => BUNNY_PROXY_PREFIX,
    CODEBERG: () => CODEBERG,
    DISCORD_SERVER: () => DISCORD_SERVER,
    GITHUB: () => GITHUB,
    HTTP_REGEX: () => HTTP_REGEX,
    HTTP_REGEX_MULTI: () => HTTP_REGEX_MULTI,
    KETTU_DISCORD_SERVER_ID: () => KETTU_DISCORD_SERVER_ID,
    KETTU_PLUGINS_CHANNEL_ID: () => KETTU_PLUGINS_CHANNEL_ID,
    KETTU_THEMES_CHANNEL_ID: () => KETTU_THEMES_CHANNEL_ID,
    NEXPID_PLUGINS_REPO_URL: () => NEXPID_PLUGINS_REPO_URL,
    OFFICIAL_PLUGINS_REPO_URL: () => OFFICIAL_PLUGINS_REPO_URL,
    VD_DISCORD_SERVER_ID: () => VD_DISCORD_SERVER_ID,
    VD_PLUGINS_CHANNEL_ID: () => VD_PLUGINS_CHANNEL_ID,
    VD_PROXY_PREFIX: () => VD_PROXY_PREFIX,
    VD_THEMES_CHANNEL_ID: () => VD_THEMES_CHANNEL_ID
  });
  var DISCORD_SERVER, CODEBERG, GITHUB, HTTP_REGEX, HTTP_REGEX_MULTI, BUNNY_PROXY_PREFIX, NEXPID_PLUGINS_REPO_URL, OFFICIAL_PLUGINS_REPO_URL, VD_PROXY_PREFIX, VD_DISCORD_SERVER_ID, VD_PLUGINS_CHANNEL_ID, VD_THEMES_CHANNEL_ID, KETTU_DISCORD_SERVER_ID, KETTU_PLUGINS_CHANNEL_ID, KETTU_THEMES_CHANNEL_ID;
  var init_constants = __esm({
    "src/lib/utils/constants.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      DISCORD_SERVER = "https://discord.gg/5naTPJYemX";
      CODEBERG = "";
      GITHUB = "https://github.com/xohus/cloudcord";
      HTTP_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
      HTTP_REGEX_MULTI = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
      BUNNY_PROXY_PREFIX = "https://bn-plugins.github.io/vd-proxy";
      NEXPID_PLUGINS_REPO_URL = "https://revenge.nexpid.xyz";
      OFFICIAL_PLUGINS_REPO_URL = "https://bn-plugins.github.io/dist/repo.json";
      VD_PROXY_PREFIX = "https://vd-plugins.github.io/proxy";
      VD_DISCORD_SERVER_ID = "1015931589865246730";
      VD_PLUGINS_CHANNEL_ID = "1091880384561684561";
      VD_THEMES_CHANNEL_ID = "1091880434939482202";
      KETTU_DISCORD_SERVER_ID = "1368145952266911755";
      KETTU_PLUGINS_CHANNEL_ID = "1432796541210333284";
      KETTU_THEMES_CHANNEL_ID = "1408405946434195540";
    }
  });

  // src/lib/utils/cyrb64.ts
  function cyrb64(str, seed = 0) {
    var h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507);
    h1 ^= Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507);
    h2 ^= Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return [
      h2 >>> 0,
      h1 >>> 0
    ];
  }
  function cyrb64Hash(str, seed = 0) {
    var [h2, h1] = cyrb64(str, seed);
    return h2.toString(36).padStart(7, "0") + h1.toString(36).padStart(7, "0");
  }
  var init_cyrb64 = __esm({
    "src/lib/utils/cyrb64.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/lib/utils/findInReactTree.ts
  function findInReactTree(tree, filter) {
    return findInTree(tree, filter, {
      walkable: [
        "props",
        "children",
        "child",
        "sibling"
      ]
    });
  }
  var init_findInReactTree = __esm({
    "src/lib/utils/findInReactTree.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_utils();
    }
  });

  // src/lib/utils/findInTree.ts
  function treeSearch(tree, filter, opts, depth) {
    if (depth > opts.maxDepth)
      return;
    if (!tree)
      return;
    try {
      if (filter(tree))
        return tree;
    } catch (e) {
    }
    if (Array.isArray(tree)) {
      for (var item of tree) {
        if (typeof item !== "object" || item === null)
          continue;
        try {
          var found = treeSearch(item, filter, opts, depth + 1);
          if (found)
            return found;
        } catch (e) {
        }
      }
    } else if (typeof tree === "object") {
      for (var key of Object.keys(tree)) {
        if (typeof tree[key] !== "object" || tree[key] === null)
          continue;
        if (opts.walkable.length && !opts.walkable.includes(key))
          continue;
        if (opts.ignore.includes(key))
          continue;
        try {
          var found1 = treeSearch(tree[key], filter, opts, depth + 1);
          if (found1)
            return found1;
        } catch (e) {
        }
      }
    }
  }
  function findInTree(tree, filter, { walkable = [], ignore = [], maxDepth = 100 } = {}) {
    return treeSearch(tree, filter, {
      walkable,
      ignore,
      maxDepth
    }, 0);
  }
  var init_findInTree = __esm({
    "src/lib/utils/findInTree.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/lib/utils/hookDefineProperty.ts
  function hookDefineProperty(target, property, cb) {
    var targetAsAny = target;
    if (property in target) {
      return void cb(targetAsAny[property]);
    }
    var value;
    Object.defineProperty(targetAsAny, property, {
      get: () => value,
      set(v2) {
        value = cb(v2) ?? v2;
      },
      configurable: true,
      enumerable: false
    });
    return () => {
      delete targetAsAny[property];
      targetAsAny[property] = value;
    };
  }
  var init_hookDefineProperty = __esm({
    "src/lib/utils/hookDefineProperty.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/lib/utils/invariant.ts
  function invariant(condition, message) {
    if (condition)
      return;
    var resolvedMessage = typeof message === "function" ? message() : message;
    var prefix = "[Invariant Violation]";
    var value = resolvedMessage ? `${prefix}: ${resolvedMessage}` : prefix;
    throw new Error(value);
  }
  var init_invariant = __esm({
    "src/lib/utils/invariant.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/lib/utils/logger.ts
  var logger_exports = {};
  __export(logger_exports, {
    LoggerClass: () => LoggerClass,
    connectToDebugger: () => connectToDebugger,
    disconnectFromDebugger: () => disconnectFromDebugger,
    isConnectedToDebugger: () => isConnectedToDebugger,
    logger: () => logger
  });
  function serializeMessage(msg) {
    return JSON.stringify(msg);
  }
  function sendLog(level, ...args) {
    if (socket?.readyState === WebSocket.OPEN) {
      var message = {
        type: "log",
        data: {
          level,
          message: args
        }
      };
      socket.send(serializeMessage(message));
    }
  }
  function patchConsoleAndLogger() {
    originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      sendLog("default", ...args);
    };
    originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      sendLog("error", ...args);
    };
    originalConsoleWarn = console.warn;
    console.warn = function(...args) {
      originalConsoleWarn.apply(console, args);
      sendLog("warn", ...args);
    };
    if (logger) {
      originalLoggerLog = logger.log;
      logger.log = function(...args) {
        originalLoggerLog.apply(logger, args);
        sendLog("default", ...args);
      };
      originalLoggerError = logger.error;
      logger.error = function(...args) {
        originalLoggerError.apply(logger, args);
        sendLog("error", ...args);
      };
      originalLoggerWarn = logger.warn;
      logger.warn = function(...args) {
        originalLoggerWarn.apply(logger, args);
        sendLog("warn", ...args);
      };
    }
  }
  function unpatchConsoleAndLogger() {
    if (originalConsoleLog) {
      console.log = originalConsoleLog;
      originalConsoleLog = void 0;
    }
    if (originalConsoleError) {
      console.error = originalConsoleError;
      originalConsoleError = void 0;
    }
    if (originalConsoleWarn) {
      console.warn = originalConsoleWarn;
      originalConsoleWarn = void 0;
    }
    if (logger) {
      if (originalLoggerLog) {
        logger.log = originalLoggerLog;
        originalLoggerLog = void 0;
      }
      if (originalLoggerError) {
        logger.error = originalLoggerError;
        originalLoggerError = void 0;
      }
      if (originalLoggerWarn) {
        logger.warn = originalLoggerWarn;
        originalLoggerWarn = void 0;
      }
    }
  }
  function connectToDebugger(url2) {
    if (socket !== void 0 && socket.readyState !== WebSocket.CLOSED) {
      unpatchConsoleAndLogger();
      socket.close();
    }
    if (!url2) {
      console.error("Invalid debugger URL!");
      return;
    }
    try {
      socket = new WebSocket(`ws://${url2}`);
      socket.addEventListener("open", () => {
        console.log("Connected to debugger.");
        var hello = {
          type: "hello",
          data: {
            version: VERSION
          }
        };
        socket?.send(serializeMessage(hello));
        patchConsoleAndLogger();
      });
      socket.addEventListener("message", (message) => {
        try {
          var data = JSON.parse(message.data);
          if (data.type === "run" && data.data?.code) {
            try {
              (0, eval)(data.data.code);
            } catch (e) {
              console.error("Error executing remote code:", e);
            }
          }
        } catch (e) {
          console.error("Error processing message:", e);
        }
      });
      socket.addEventListener("close", () => {
        console.log("Disconnected from debugger.");
        unpatchConsoleAndLogger();
      });
      socket.addEventListener("error", (err) => {
        console.error(`Debugger error: ${err.message}`);
        unpatchConsoleAndLogger();
      });
    } catch (e) {
      console.error("Failed to connect to debugger:", e);
    }
  }
  function disconnectFromDebugger() {
    if (socket) {
      unpatchConsoleAndLogger();
      socket.close();
      socket = void 0;
    }
  }
  function isConnectedToDebugger() {
    return socket?.readyState === WebSocket.OPEN;
  }
  var LoggerClass, logger, socket, originalConsoleLog, originalConsoleError, originalConsoleWarn, originalLoggerLog, originalLoggerError, originalLoggerWarn, VERSION;
  var init_logger = __esm({
    "src/lib/utils/logger.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_wrappers();
      LoggerClass = findByNameLazy("Logger");
      logger = new LoggerClass("CloudCord");
      VERSION = 1;
    }
  });

  // src/lib/utils/safeFetch.ts
  function safeFetch(input, options, timeout = 1e4) {
    return _async_to_generator(function* () {
      var req = yield fetch(input, {
        signal: timeoutSignal(timeout),
        ...options
      });
      if (!req.ok)
        throw new Error(`Request returned non-ok: ${req.status} ${req.statusText}`);
      return req;
    })();
  }
  function timeoutSignal(ms) {
    var controller = new AbortController();
    setTimeout(() => controller.abort(`Timed out after ${ms}ms`), ms);
    return controller.signal;
  }
  var init_safeFetch = __esm({
    "src/lib/utils/safeFetch.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
    }
  });

  // src/lib/utils/index.ts
  var utils_exports = {};
  __export(utils_exports, {
    constants: () => constants_exports,
    cyrb64: () => cyrb64,
    findInReactTree: () => findInReactTree,
    findInTree: () => findInTree,
    hookDefineProperty: () => hookDefineProperty,
    invariant: () => invariant,
    lazy: () => lazy_exports,
    logger: () => logger_exports,
    safeFetch: () => safeFetch
  });
  var init_utils = __esm({
    "src/lib/utils/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_constants();
      init_cyrb64();
      init_findInReactTree();
      init_findInTree();
      init_hookDefineProperty();
      init_invariant();
      init_lazy();
      init_logger();
      init_safeFetch();
    }
  });

  // src/lib/addons/themes/colors/patches/background.tsx
  function patchChatBackground() {
    return () => {
    };
  }
  var init_background = __esm({
    "src/lib/addons/themes/colors/patches/background.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/metro/common/components.ts
  var components_exports = {};
  __export(components_exports, {
    ActionSheet: () => ActionSheet,
    ActionSheetRow: () => ActionSheetRow,
    AlertActionButton: () => AlertActionButton,
    AlertActions: () => AlertActions,
    AlertModal: () => AlertModal,
    Avatar: () => Avatar,
    AvatarPile: () => AvatarPile,
    BottomSheetTitleHeader: () => BottomSheetTitleHeader,
    Button: () => Button,
    Card: () => Card,
    CompatButton: () => CompatButton,
    CompatSegmentedControl: () => CompatSegmentedControl,
    ContextMenu: () => ContextMenu,
    FlashList: () => FlashList,
    FloatingActionButton: () => FloatingActionButton,
    FormCheckbox: () => FormCheckbox,
    FormRadio: () => FormRadio,
    FormSwitch: () => FormSwitch,
    Forms: () => Forms,
    HelpMessage: () => HelpMessage,
    IconButton: () => IconButton,
    LegacyAlert: () => LegacyAlert,
    LegacyForm: () => LegacyForm,
    LegacyFormArrow: () => LegacyFormArrow,
    LegacyFormCTA: () => LegacyFormCTA,
    LegacyFormCTAButton: () => LegacyFormCTAButton,
    LegacyFormCardSection: () => LegacyFormCardSection,
    LegacyFormCheckbox: () => LegacyFormCheckbox,
    LegacyFormCheckboxRow: () => LegacyFormCheckboxRow,
    LegacyFormCheckmark: () => LegacyFormCheckmark,
    LegacyFormDivider: () => LegacyFormDivider,
    LegacyFormHint: () => LegacyFormHint,
    LegacyFormIcon: () => LegacyFormIcon,
    LegacyFormInput: () => LegacyFormInput,
    LegacyFormLabel: () => LegacyFormLabel,
    LegacyFormRadio: () => LegacyFormRadio,
    LegacyFormRadioGroup: () => LegacyFormRadioGroup,
    LegacyFormRadioRow: () => LegacyFormRadioRow,
    LegacyFormRow: () => LegacyFormRow,
    LegacyFormSection: () => LegacyFormSection,
    LegacyFormSelect: () => LegacyFormSelect,
    LegacyFormSliderRow: () => LegacyFormSliderRow,
    LegacyFormSubLabel: () => LegacyFormSubLabel,
    LegacyFormSwitch: () => LegacyFormSwitch,
    LegacyFormSwitchRow: () => LegacyFormSwitchRow,
    LegacyFormTernaryCheckBox: () => LegacyFormTernaryCheckBox,
    LegacyFormText: () => LegacyFormText,
    LegacyFormTitle: () => LegacyFormTitle,
    PressableScale: () => PressableScale,
    RedesignCompat: () => RedesignCompat,
    RowButton: () => RowButton,
    SafeAreaProvider: () => SafeAreaProvider,
    SafeAreaView: () => SafeAreaView,
    SegmentedControl: () => SegmentedControl,
    SegmentedControlPages: () => SegmentedControlPages,
    Stack: () => Stack,
    TableCheckbox: () => TableCheckbox,
    TableCheckboxRow: () => TableCheckboxRow,
    TableRadio: () => TableRadio,
    TableRadioGroup: () => TableRadioGroup,
    TableRadioRow: () => TableRadioRow,
    TableRow: () => TableRow,
    TableRowGroup: () => TableRowGroup,
    TableRowIcon: () => TableRowIcon,
    TableRowTrailingText: () => TableRowTrailingText,
    TableSwitch: () => TableSwitch,
    TableSwitchRow: () => TableSwitchRow,
    Text: () => Text,
    TextArea: () => TextArea,
    TextInput: () => TextInput,
    TwinButtons: () => TwinButtons,
    useSafeAreaInsets: () => useSafeAreaInsets,
    useSegmentedControlState: () => useSegmentedControlState
  });
  var bySingularProp, findSingular, findProp, LegacyAlert, CompatButton, HelpMessage, SafeAreaView, SafeAreaProvider, useSafeAreaInsets, ActionSheetRow, Button, TwinButtons, IconButton, RowButton, PressableScale, TableRow, TableRowIcon, TableRowTrailingText, TableRowGroup, TableRadioGroup, TableRadioRow, TableSwitchRow, TableCheckboxRow, TableSwitch, TableRadio, TableCheckbox, FormSwitch, FormRadio, FormCheckbox, Card, RedesignCompat, AlertModal, AlertActionButton, AlertActions, AvatarPile, ContextMenu, Stack, Avatar, TextInput, TextArea, SegmentedControl, SegmentedControlPages, useSegmentedControlState, CompatSegmentedControl, FloatingActionButton, ActionSheet, BottomSheetTitleHeader, textsModule, Text, Forms, LegacyForm, LegacyFormArrow, LegacyFormCTA, LegacyFormCTAButton, LegacyFormCardSection, LegacyFormCheckbox, LegacyFormCheckboxRow, LegacyFormCheckmark, LegacyFormDivider, LegacyFormHint, LegacyFormIcon, LegacyFormInput, LegacyFormLabel, LegacyFormRadio, LegacyFormRadioGroup, LegacyFormRadioRow, LegacyFormRow, LegacyFormSection, LegacyFormSelect, LegacyFormSliderRow, LegacyFormSubLabel, LegacyFormSwitch, LegacyFormSwitchRow, LegacyFormTernaryCheckBox, LegacyFormText, LegacyFormTitle, FlashList;
  var init_components = __esm({
    "src/metro/common/components.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_factories();
      init_finders();
      init_wrappers();
      bySingularProp = createFilterDefinition(([prop], m2) => m2[prop] && Object.keys(m2).length === 1, (prop) => `bunny.metro.common.components.bySingularProp(${prop})`);
      findSingular = (prop) => proxyLazy(() => findExports(bySingularProp(prop))?.[prop]);
      findProp = (...props) => proxyLazy(() => findByProps(...props)[props[0]]);
      LegacyAlert = findByDisplayNameLazy("FluxContainer(Alert)");
      CompatButton = findByPropsLazy("Looks", "Colors", "Sizes");
      HelpMessage = findByNameLazy("HelpMessage");
      ({ SafeAreaView, SafeAreaProvider, useSafeAreaInsets } = lazyDestructure(() => findByProps("useSafeAreaInsets")));
      ActionSheetRow = findProp("ActionSheetRow");
      Button = findSingular("Button");
      TwinButtons = findProp("TwinButtons");
      IconButton = findSingular("IconButton");
      RowButton = findProp("RowButton");
      PressableScale = findProp("PressableScale");
      TableRow = findProp("TableRow");
      TableRowIcon = findProp("TableRowIcon");
      TableRowTrailingText = findProp("TableRowTrailingText");
      TableRowGroup = findProp("TableRowGroup");
      TableRadioGroup = findProp("TableRadioGroup");
      TableRadioRow = findProp("TableRadioRow");
      TableSwitchRow = findProp("TableSwitchRow");
      TableCheckboxRow = findProp("TableCheckboxRow");
      TableSwitch = findSingular("FormSwitch");
      TableRadio = findSingular("FormRadio");
      TableCheckbox = findSingular("FormCheckbox");
      FormSwitch = findSingular("FormSwitch");
      FormRadio = findSingular("FormRadio");
      FormCheckbox = findSingular("FormCheckbox");
      Card = findProp("Card");
      RedesignCompat = proxyLazy(() => findByProps("RedesignCompat").RedesignCompat);
      AlertModal = findProp("AlertModal");
      AlertActionButton = findProp("AlertActionButton");
      AlertActions = findProp("AlertActions");
      AvatarPile = findSingular("AvatarPile");
      ContextMenu = findProp("ContextMenu");
      Stack = findProp("Stack");
      Avatar = findProp("default", "AvatarSizes", "getStatusSize");
      TextInput = findSingular("TextInput");
      TextArea = findSingular("TextArea");
      SegmentedControl = findProp("SegmentedControl");
      SegmentedControlPages = findProp("SegmentedControlPages");
      useSegmentedControlState = findSingular("useSegmentedControlState");
      CompatSegmentedControl = findProp("CompatSegmentedControl");
      FloatingActionButton = findProp("FloatingActionButton");
      ActionSheet = findProp("ActionSheet");
      BottomSheetTitleHeader = findProp("BottomSheetTitleHeader");
      textsModule = findByPropsLazy("Text", "LegacyText");
      Text = proxyLazy(() => textsModule.Text);
      Forms = findByPropsLazy("Form", "FormSection");
      ({ Form: LegacyForm, FormArrow: LegacyFormArrow, FormCTA: LegacyFormCTA, FormCTAButton: LegacyFormCTAButton, FormCardSection: LegacyFormCardSection, FormCheckbox: LegacyFormCheckbox, FormCheckboxRow: LegacyFormCheckboxRow, FormCheckmark: LegacyFormCheckmark, FormDivider: LegacyFormDivider, FormHint: LegacyFormHint, FormIcon: LegacyFormIcon, FormInput: LegacyFormInput, FormLabel: LegacyFormLabel, FormRadio: LegacyFormRadio, FormRadioGroup: LegacyFormRadioGroup, FormRadioRow: LegacyFormRadioRow, FormRow: LegacyFormRow, FormSection: LegacyFormSection, FormSelect: LegacyFormSelect, FormSliderRow: LegacyFormSliderRow, FormSubLabel: LegacyFormSubLabel, FormSwitch: LegacyFormSwitch, FormSwitchRow: LegacyFormSwitchRow, FormTernaryCheckBox: LegacyFormTernaryCheckBox, FormText: LegacyFormText, FormTitle: LegacyFormTitle } = lazyDestructure(() => Forms));
      FlashList = findProp("FlashList");
    }
  });

  // src/metro/common/index.ts
  var common_exports = {};
  __export(common_exports, {
    Flux: () => Flux,
    FluxDispatcher: () => FluxDispatcher,
    FluxUtils: () => FluxUtils,
    NavigationNative: () => NavigationNative,
    React: () => React2,
    ReactNative: () => ReactNative,
    assets: () => assets,
    channels: () => channels,
    clipboard: () => clipboard,
    commands: () => commands,
    components: () => components_exports,
    constants: () => constants,
    i18n: () => i18n,
    invites: () => invites,
    messageUtil: () => messageUtil,
    navigation: () => navigation,
    navigationStack: () => navigationStack,
    semver: () => semver,
    toasts: () => toasts,
    tokens: () => tokens,
    url: () => url,
    useToken: () => useToken
  });
  var import_react_native2, constants, channels, i18n, clipboard, assets, invites, commands, navigation, toasts, messageUtil, navigationStack, NavigationNative, semver, tokens, useToken, openURL, url, Flux, FluxDispatcher, FluxUtils, React2, ReactNative;
  var init_common = __esm({
    "src/metro/common/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_wrappers();
      import_react_native2 = __toESM(require_react_native());
      init_components();
      constants = findByPropsLazy("Fonts", "Permissions");
      channels = findByPropsLazy("getVoiceChannelId");
      i18n = findByPropsLazy("Messages");
      clipboard = findByPropsLazy("setString", "getString", "hasString");
      assets = findByPropsLazy("registerAsset");
      invites = findByPropsLazy("acceptInviteAndTransitionToInviteChannel");
      commands = findByPropsLazy("getBuiltInCommands");
      navigation = findByPropsLazy("pushLazy");
      toasts = findByFilePathLazy("modules/toast/native/ToastActionCreators.tsx", true);
      messageUtil = findByPropsLazy("sendBotMessage");
      navigationStack = findByPropsLazy("createStackNavigator");
      NavigationNative = findByPropsLazy("NavigationContainer");
      semver = findByPropsLazy("parse", "clean");
      tokens = findByPropsLazy("unsafe_rawColors", "colors");
      ({ useToken } = lazyDestructure(() => findByProps("useToken")));
      openURL = (url2) => import_react_native2.Linking.openURL(url2);
      url = nativeModuleProxy.NativeLinkingModule || nativeModuleProxy.DCDLinkingManager ? {
        openURL,
        openDeeplink: openURL,
        handleSupportedURL: openURL,
        isDiscordConnectOauth2Deeplink: () => {
          console.warn("url.isDiscordConnectOauth2Deeplink is not implemented and will always return false");
          return false;
        },
        showLongPressUrlActionSheet: () => console.warn("url.showLongPressUrlActionSheet is not implemented"),
        handleMessageLinking: findByFilePathLazy("modules/links/native/handleContentLinking.tsx", true)
      } : findByPropsLazy("openURL", "openDeeplink");
      Flux = findByPropsLazy("connectStores");
      FluxDispatcher = findByProps("_interceptors");
      FluxUtils = findByProps("useStateFromStores");
      React2 = globalThis.React = findByPropsLazy("createElement");
      ReactNative = globalThis.ReactNative = findByPropsLazy("AppRegistry");
    }
  });

  // src/metro/index.ts
  var metro_exports = {};
  __export(metro_exports, {
    common: () => common_exports,
    factories: () => factories_exports,
    filters: () => filters_exports,
    findAllExports: () => findAllExports,
    findAllModule: () => findAllModule,
    findAllModuleId: () => findAllModuleId,
    findByDisplayName: () => findByDisplayName,
    findByDisplayNameAll: () => findByDisplayNameAll,
    findByDisplayNameLazy: () => findByDisplayNameLazy,
    findByFilePath: () => findByFilePath,
    findByFilePathLazy: () => findByFilePathLazy,
    findByName: () => findByName,
    findByNameAll: () => findByNameAll,
    findByNameLazy: () => findByNameLazy,
    findByProps: () => findByProps,
    findByPropsAll: () => findByPropsAll,
    findByPropsLazy: () => findByPropsLazy,
    findByStoreName: () => findByStoreName,
    findByStoreNameLazy: () => findByStoreNameLazy,
    findByTypeName: () => findByTypeName,
    findByTypeNameAll: () => findByTypeNameAll,
    findByTypeNameLazy: () => findByTypeNameLazy,
    findExports: () => findExports,
    findModule: () => findModule,
    findModuleId: () => findModuleId,
    lazy: () => lazy_exports2
  });
  var init_metro = __esm({
    "src/metro/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_common();
      init_factories();
      init_filters();
      init_finders();
      init_lazy2();
      init_wrappers();
    }
  });

  // globals:chroma-js
  var require_chroma_js = __commonJS({
    "globals:chroma-js"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["chroma-js"];
    }
  });

  // src/lib/addons/themes/colors/preferences.ts
  var colorsPref;
  var init_preferences = __esm({
    "src/lib/addons/themes/colors/preferences.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_storage2();
      colorsPref = createStorage2("themes/colors/preferences.json", {
        dflt: {
          selected: null,
          customBackground: null
        }
      });
    }
  });

  // src/lib/addons/themes/colors/parser.ts
  function parseColorManifest(manifest) {
    var resolveType = (type2 = "dark") => (colorsPref.type ?? type2) === "dark" ? "darker" : "light";
    if (manifest.spec === 3) {
      var semanticColorDefinitions = {};
      for (var [semanticColorKey, semanticColorValue] of Object.entries(manifest.main.semantic ?? {})) {
        if (typeof semanticColorValue === "object") {
          var { type, value, opacity: semanticColorOpacity } = semanticColorValue;
          if (type === "raw") {
            semanticColorDefinitions[semanticColorKey] = {
              value,
              opacity: semanticColorOpacity ?? 1
            };
          } else {
            var rawColorValue = tokenRef.RawColor[value];
            semanticColorDefinitions[semanticColorKey] = {
              value: rawColorValue,
              opacity: semanticColorOpacity ?? 1
            };
          }
        } else if (typeof semanticColorValue === "string") {
          if (semanticColorValue.startsWith("#")) {
            semanticColorDefinitions[semanticColorKey] = {
              value: import_chroma_js.default.hex(semanticColorValue).hex(),
              opacity: 1
            };
          } else {
            semanticColorDefinitions[semanticColorKey] = {
              value: tokenRef.RawColor[semanticColorValue],
              opacity: 1
            };
          }
        } else {
          throw new Error(`Invalid semantic definitions: ${semanticColorValue}`);
        }
      }
      if (import_react_native3.Platform.OS === "android")
        applyAndroidAlphaKeys(manifest.main.raw);
      return {
        spec: 3,
        reference: resolveType(manifest.type),
        semantic: semanticColorDefinitions,
        raw: manifest.main.raw ?? {},
        background: manifest.main.background
      };
    }
    if (manifest.spec === 2) {
      var semanticDefinitions = {};
      var background = manifest.background ? {
        ...omit(manifest.background, [
          "alpha"
        ]),
        opacity: manifest.background.alpha
      } : void 0;
      if (manifest.semanticColors) {
        for (var key in manifest.semanticColors) {
          var values = manifest.semanticColors[key].map((c2) => c2 || void 0).slice(0, 2);
          if (!values[0])
            continue;
          semanticDefinitions[key] = {
            value: normalizeToHex(values[resolveType() === "light" ? 1 : 0]),
            opacity: 1
          };
        }
      }
      if (manifest.rawColors) {
        var draft = {};
        for (var key1 in manifest.rawColors) {
          var value1 = manifest.rawColors[key1];
          if (!value1)
            continue;
          draft[key1] = normalizeToHex(value1);
        }
        if (import_react_native3.Platform.OS === "android")
          applyAndroidAlphaKeys(draft);
        manifest.rawColors = draft;
      }
      return {
        spec: 2,
        reference: resolveType(),
        semantic: semanticDefinitions,
        raw: manifest.rawColors ?? {},
        background
      };
    }
    if (manifest.spec === 1 || manifest.theme_color_map && !manifest.spec) {
      var semanticDefinitions1 = {};
      var rawDefinitions = {};
      var themeIndex = resolveType() === "light" ? 1 : 0;
      if (manifest.theme_color_map) {
        for (var [key2, colorArray] of Object.entries(manifest.theme_color_map)) {
          if (!Array.isArray(colorArray) || colorArray.length < 2) {
            console.warn(`[Parser] Invalid color array for ${key2}:`, colorArray);
            continue;
          }
          var colorValue = colorArray[themeIndex];
          if (!colorValue) {
            console.warn(`[Parser] Missing color value for ${key2} at index ${themeIndex}`);
            continue;
          }
          var normalized = normalizeToHex(colorValue);
          if (normalized) {
            semanticDefinitions1[key2] = {
              value: normalized,
              opacity: 1
            };
          }
        }
      }
      var rawColors2 = manifest.colours || manifest.colors;
      if (rawColors2) {
        for (var [key3, colorValue1] of Object.entries(rawColors2)) {
          if (typeof colorValue1 !== "string")
            continue;
          var normalized1 = normalizeToHex(colorValue1);
          if (normalized1) {
            var discordKey = convertEnmityToDiscordRawKey(key3);
            rawDefinitions[discordKey] = normalized1;
            if (discordKey !== key3) {
              rawDefinitions[key3] = normalized1;
            }
          }
        }
      }
      if (manifest.unsafe_colors) {
        for (var [key4, colorValue2] of Object.entries(manifest.unsafe_colors)) {
          if (typeof colorValue2 !== "string")
            continue;
          var normalized2 = normalizeToHex(colorValue2);
          if (normalized2) {
            rawDefinitions[key4] = normalized2;
          }
        }
      }
      if (import_react_native3.Platform.OS === "android")
        applyAndroidAlphaKeys(rawDefinitions);
      return {
        spec: 2,
        reference: resolveType(),
        semantic: semanticDefinitions1,
        raw: rawDefinitions,
        background: manifest.background
      };
    }
    throw new Error("Invalid theme spec");
  }
  function convertEnmityToDiscordRawKey(enmityKey) {
    var conversions = {
      "PRIMARY_DARK": "PRIMARY_100",
      "PRIMARY_DARK_100": "PRIMARY_100",
      "PRIMARY_DARK_200": "PRIMARY_200",
      "PRIMARY_DARK_300": "PRIMARY_300",
      "PRIMARY_DARK_360": "PRIMARY_360",
      "PRIMARY_DARK_400": "PRIMARY_400",
      "PRIMARY_DARK_500": "PRIMARY_500",
      "PRIMARY_DARK_600": "PRIMARY_600",
      "PRIMARY_DARK_630": "PRIMARY_630",
      "PRIMARY_DARK_700": "PRIMARY_700",
      "PRIMARY_DARK_800": "PRIMARY_800",
      "PRIMARY_DARK_900": "PRIMARY_900"
    };
    return conversions[enmityKey] || enmityKey;
  }
  function applyAndroidAlphaKeys(rawColors2) {
    if (!rawColors2)
      return;
    var alphaMap = {
      "BLACK_ALPHA_60": [
        "BLACK",
        0.6
      ],
      "BRAND_NEW_360_ALPHA_20": [
        "BRAND_360",
        0.2
      ],
      "BRAND_NEW_360_ALPHA_25": [
        "BRAND_360",
        0.25
      ],
      "BRAND_NEW_500_ALPHA_20": [
        "BRAND_500",
        0.2
      ],
      "PRIMARY_DARK_500_ALPHA_20": [
        "PRIMARY_500",
        0.2
      ],
      "PRIMARY_DARK_700_ALPHA_60": [
        "PRIMARY_700",
        0.6
      ],
      "STATUS_GREEN_500_ALPHA_20": [
        "GREEN_500",
        0.2
      ],
      "STATUS_RED_500_ALPHA_20": [
        "RED_500",
        0.2
      ]
    };
    for (var key in alphaMap) {
      var [colorKey, alpha] = alphaMap[key];
      if (!rawColors2[colorKey])
        continue;
      rawColors2[key] = (0, import_chroma_js.default)(rawColors2[colorKey]).alpha(alpha).hex();
    }
    return rawColors2;
  }
  function normalizeToHex(colorString) {
    if (colorString === void 0)
      return void 0;
    if (colorString.toLowerCase() === "transparent") {
      return "#00000000";
    }
    if (import_chroma_js.default.valid(colorString))
      return (0, import_chroma_js.default)(colorString).hex();
    var color2 = Number((0, import_react_native3.processColor)(colorString));
    return import_chroma_js.default.rgb(
      color2 >> 16 & 255,
      color2 >> 8 & 255,
      color2 & 255,
      color2 >> 24 & 255
      // alpha
    ).hex();
  }
  var import_chroma_js, import_react_native3, tokenRef;
  var init_parser = __esm({
    "src/lib/addons/themes/colors/parser.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_metro();
      import_chroma_js = __toESM(require_chroma_js());
      init_dist();
      import_react_native3 = __toESM(require_react_native());
      init_preferences();
      tokenRef = findByProps("SemanticColor");
    }
  });

  // src/lib/addons/themes/colors/updater.ts
  function updateBunnyColor(colorManifest, { update = true }) {
    if (settings.safeMode?.enabled)
      return;
    var internalDef = colorManifest ? parseColorManifest(colorManifest) : null;
    var ref = Object.assign(_colorRef, {
      current: internalDef,
      key: `bn-theme-${++_inc}`,
      lastSetDiscordTheme: !ThemeStore.theme.startsWith("bn-theme-") ? ThemeStore.theme : _colorRef.lastSetDiscordTheme
    });
    if (internalDef != null) {
      tokenRef2.Theme[ref.key.toUpperCase()] = ref.key;
      FormDivider.DIVIDER_COLORS[ref.key] = FormDivider.DIVIDER_COLORS[ref.current.reference];
      Object.keys(tokenRef2.Shadow).forEach((k) => tokenRef2.Shadow[k][ref.key] = tokenRef2.Shadow[k][ref.current.reference]);
      Object.keys(tokenRef2.SemanticColor).forEach((k) => {
        tokenRef2.SemanticColor[k][ref.key] = {
          ...tokenRef2.SemanticColor[k][ref.current.reference]
        };
      });
    }
    if (update) {
      AppearanceManager.setShouldSyncAppearanceSettings(false);
      AppearanceManager.updateTheme(internalDef != null ? ref.key : ref.lastSetDiscordTheme);
    }
  }
  var tokenRef2, origRawColor, AppearanceManager, ThemeStore, FormDivider, _inc, _colorRef;
  var init_updater = __esm({
    "src/lib/addons/themes/colors/updater.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_settings();
      init_metro();
      init_parser();
      tokenRef2 = findByProps("SemanticColor");
      origRawColor = {
        ...tokenRef2.RawColor
      };
      AppearanceManager = findByPropsLazy("updateTheme");
      ThemeStore = findByStoreNameLazy("ThemeStore");
      FormDivider = findByPropsLazy("DIVIDER_COLORS");
      _inc = 1;
      _colorRef = {
        current: null,
        key: `bn-theme-${_inc}`,
        origRaw: origRawColor,
        lastSetDiscordTheme: "darker"
      };
    }
  });

  // src/lib/addons/themes/colors/patches/resolver.ts
  function patchDefinitionAndResolver() {
    var callback = ([theme]) => theme === _colorRef.key ? [
      _colorRef.current.reference
    ] : void 0;
    Object.defineProperty(themeTypes, "DARKER", {
      configurable: true,
      enumerable: true,
      get: () => _colorRef.current?.reference === "darker" ? _colorRef.key : origDarker
    });
    Object.defineProperty(themeTypes, "LIGHT", {
      configurable: true,
      enumerable: true,
      get: () => _colorRef.current?.reference === "light" ? _colorRef.key : origLight
    });
    Object.keys(tokenReference.RawColor).forEach((key) => {
      Object.defineProperty(tokenReference.RawColor, key, {
        configurable: true,
        enumerable: true,
        get: () => {
          var ret = _colorRef.current?.raw[key];
          if (ret)
            return ret;
          return origRawColor2[key];
        }
      });
    });
    var unpatches = [
      before("updateTheme", NativeThemeModule, callback),
      instead("resolveSemanticColor", tokenReference.default.meta ?? tokenReference.default.internal, (args, orig) => {
        if (!_colorRef.current)
          return orig(...args);
        if (args[0] !== _colorRef.key)
          return orig(...args);
        args[0] = _colorRef.current.reference;
        var [name, colorDef] = extractInfo(_colorRef.current.reference, args[1]);
        var semanticDef = _colorRef.current.semantic[name];
        if (!semanticDef && _colorRef.current.spec === 2 && name in SEMANTIC_FALLBACK_MAP) {
          semanticDef = _colorRef.current.semantic[SEMANTIC_FALLBACK_MAP[name]];
        }
        if (semanticDef?.value) {
          return semanticDef.opacity === 1 ? semanticDef.value : (0, import_chroma_js2.default)(semanticDef.value).alpha(semanticDef.opacity).hex();
        }
        var rawValue = _colorRef.current.raw[colorDef.raw];
        if (rawValue) {
          return colorDef.opacity === 1 ? rawValue : (0, import_chroma_js2.default)(rawValue).alpha(colorDef.opacity).hex();
        }
        return orig(...args);
      }),
      () => {
        Object.defineProperty(themeTypes, "DARKER", {
          configurable: true,
          writable: true,
          value: origDarker
        });
        Object.defineProperty(themeTypes, "LIGHT", {
          configurable: true,
          writable: true,
          value: origLight
        });
        Object.defineProperty(tokenReference, "RawColor", {
          configurable: true,
          writable: true,
          value: origRawColor2
        });
      }
    ];
    return () => unpatches.forEach((p) => p());
  }
  function extractInfo(themeName, colorObj) {
    var propName = colorObj[extractInfo._sym ??= Object.getOwnPropertySymbols(colorObj)[0]];
    var colorDef = tokenReference.SemanticColor[propName];
    return [
      propName,
      colorDef[themeName]
    ];
  }
  var import_chroma_js2, tokenReference, themeTypes, origRawColor2, origDarker, origLight, SEMANTIC_FALLBACK_MAP;
  var init_resolver = __esm({
    "src/lib/addons/themes/colors/patches/resolver.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_updater();
      init_modules();
      init_patcher();
      init_metro();
      import_chroma_js2 = __toESM(require_chroma_js());
      tokenReference = findByProps("SemanticColor");
      themeTypes = findByProps("ThemeTypes")?.ThemeTypes;
      origRawColor2 = {
        ...tokenReference.RawColor
      };
      origDarker = themeTypes.DARKER;
      origLight = themeTypes.LIGHT;
      SEMANTIC_FALLBACK_MAP = {
        "BG_BACKDROP": "BACKGROUND_FLOATING",
        "BG_BASE_PRIMARY": "BACKGROUND_PRIMARY",
        "BG_BASE_SECONDARY": "BACKGROUND_SECONDARY",
        "BG_BASE_TERTIARY": "BACKGROUND_SECONDARY_ALT",
        "BG_MOD_FAINT": "BACKGROUND_MODIFIER_ACCENT",
        "BG_MOD_STRONG": "BACKGROUND_MODIFIER_ACCENT",
        "BG_MOD_SUBTLE": "BACKGROUND_MODIFIER_ACCENT",
        "BG_SURFACE_OVERLAY": "BACKGROUND_FLOATING",
        "BG_SURFACE_OVERLAY_TMP": "BACKGROUND_FLOATING",
        "BG_SURFACE_RAISED": "BACKGROUND_MOBILE_PRIMARY"
      };
    }
  });

  // src/lib/addons/themes/colors/patches/storage.ts
  function patchStorage() {
    var patchedKeys = /* @__PURE__ */ new Set([
      "ThemeStore",
      "SelectivelySyncedUserSettingsStore"
    ]);
    var patches3 = [
      after("get", mmkvStorage, ([key], ret) => {
        if (!_colorRef.current || !patchedKeys.has(key))
          return;
        var state = findInTree(ret._state, (s) => typeof s.theme === "string");
        if (state)
          state.theme = _colorRef.key;
      }),
      before("set", mmkvStorage, ([key, value]) => {
        if (!patchedKeys.has(key))
          return;
        var json = JSON.stringify(value);
        var lastSetDiscordTheme = _colorRef.lastSetDiscordTheme ?? "darker";
        var replaced = json.replace(/"theme":"bn-theme-\d+"/, `"theme":${JSON.stringify(lastSetDiscordTheme)}`);
        return [
          key,
          JSON.parse(replaced)
        ];
      })
    ];
    return () => patches3.forEach((p) => p());
  }
  var mmkvStorage;
  var init_storage3 = __esm({
    "src/lib/addons/themes/colors/patches/storage.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_updater();
      init_patcher();
      init_utils();
      init_lazy();
      init_metro();
      mmkvStorage = proxyLazy(() => {
        var newModule = findByProps("impl");
        if (typeof newModule?.impl === "object")
          return newModule.impl;
        return findByProps("storage");
      });
    }
  });

  // src/lib/addons/themes/colors/index.ts
  function initColors(manifest) {
    if (manifest)
      updateBunnyColor(manifest, {
        update: false
      });
    var patches3 = [
      patchStorage(),
      patchDefinitionAndResolver(),
      patchChatBackground()
    ];
    return () => patches3.forEach((p) => p());
  }
  var init_colors = __esm({
    "src/lib/addons/themes/colors/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_background();
      init_resolver();
      init_storage3();
      init_updater();
    }
  });

  // src/lib/addons/themes/index.ts
  var themes_exports = {};
  __export(themes_exports, {
    fetchTheme: () => fetchTheme,
    getCurrentTheme: () => getCurrentTheme,
    getThemeFromLoader: () => getThemeFromLoader,
    initThemes: () => initThemes,
    installTheme: () => installTheme,
    removeTheme: () => removeTheme,
    selectTheme: () => selectTheme,
    themes: () => themes,
    updateThemes: () => updateThemes,
    writeThemeToNative: () => writeThemeToNative
  });
  function writeThemeToNative(theme) {
    return _async_to_generator(function* () {
      if (typeof theme !== "object")
        throw new Error("Theme must be an object");
      yield createFileBackend(getThemeFilePath() || "theme.json").set(theme);
    })();
  }
  function processData(data) {
    if (data.semanticColors) {
      var { semanticColors: semanticColors2 } = data;
      for (var key in semanticColors2) {
        for (var index in semanticColors2[key]) {
          semanticColors2[key][index] &&= normalizeToHex(semanticColors2[key][index]) || false;
        }
      }
    }
    if (data.rawColors) {
      var { rawColors: rawColors2 } = data;
      for (var key1 in rawColors2) {
        var normalized = normalizeToHex(rawColors2[key1]);
        if (normalized)
          data.rawColors[key1] = normalized;
      }
      if (import_react_native4.Platform.OS === "android")
        applyAndroidAlphaKeys(rawColors2);
    }
    if (data.spec === void 0) {
      if (!("theme_color_map" in data)) {
        data.spec = 2;
      }
    }
    return data;
  }
  function validateTheme(themeJSON) {
    if (typeof themeJSON !== "object" || themeJSON === null)
      return false;
    if (themeJSON.spec === 3 && !themeJSON.main)
      return false;
    if (themeJSON.spec === 2)
      return true;
    if (themeJSON.theme_color_map)
      return true;
    return themeJSON.spec === 2 || themeJSON.spec === 3;
  }
  function fetchTheme(url2, selected = false) {
    return _async_to_generator(function* () {
      var themeJSON;
      try {
        themeJSON = yield (yield safeFetch(url2, {
          cache: "no-store"
        })).json();
      } catch (e) {
        throw new Error(`Failed to fetch theme at ${url2}`);
      }
      if (!validateTheme(themeJSON))
        throw new Error(`Invalid theme at ${url2}`);
      themes[url2] = {
        id: url2,
        selected,
        data: processData(themeJSON)
      };
      if (selected) {
        writeThemeToNative(themes[url2]);
        updateBunnyColor(themes[url2].data, {
          update: true
        });
      }
    })();
  }
  function installTheme(url2) {
    return _async_to_generator(function* () {
      if (typeof url2 !== "string" || url2 in themes)
        throw new Error("Theme already installed");
      yield fetchTheme(url2);
    })();
  }
  function selectTheme(theme, write = true) {
    if (theme)
      theme.selected = true;
    Object.keys(themes).forEach((k) => themes[k].selected = themes[k].id === theme?.id);
    if (theme == null && write) {
      updateBunnyColor(null, {
        update: true
      });
      return writeThemeToNative({});
    } else if (theme) {
      updateBunnyColor(theme.data, {
        update: true
      });
      return writeThemeToNative(theme);
    }
  }
  function removeTheme(id) {
    return _async_to_generator(function* () {
      var theme = themes[id];
      if (theme.selected)
        yield selectTheme(null);
      delete themes[id];
      return theme.selected;
    })();
  }
  function updateThemes() {
    return _async_to_generator(function* () {
      yield awaitStorage(themes);
      var currentTheme = getThemeFromLoader();
      yield allSettled(Object.keys(themes).map((id) => fetchTheme(id, currentTheme?.id === id)));
    })();
  }
  function getCurrentTheme() {
    return Object.values(themes).find((t) => t.selected) ?? null;
  }
  function getThemeFromLoader() {
    return getStoredTheme();
  }
  function initThemes() {
    return _async_to_generator(function* () {
      if (!isThemeSupported())
        return;
      if (settings.safeMode?.enabled)
        return;
      try {
        if (isPyonLoader()) {
          writeFile("../vendetta_theme.json", "null");
        }
        yield awaitStorage2(colorsPref);
        var currentTheme = getThemeFromLoader();
        initColors(currentTheme?.data ?? null);
        updateThemes().catch((e) => console.error("Failed to update themes", e));
      } catch (e) {
        console.error("Failed to initialize themes", e);
      }
    })();
  }
  var import_react_native4, themes;
  var init_themes = __esm({
    "src/lib/addons/themes/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_storage();
      init_fs();
      init_loader();
      init_storage2();
      init_utils();
      import_react_native4 = __toESM(require_react_native());
      init_settings();
      init_colors();
      init_parser();
      init_preferences();
      init_updater();
      themes = wrapSync(createStorage(createMMKVBackend("VENDETTA_THEMES")));
    }
  });

  // src/lib/api/native/loader.ts
  function isVendettaLoader() {
    return vendettaLoaderIdentity != null;
  }
  function isPyonLoader() {
    return pyonLoaderIdentity != null;
  }
  function isCloudCordLoader() {
    return cloudCordLoaderIdentity != null;
  }
  function isRa1nLoader() {
    return isCloudCordLoader();
  }
  function polyfillVendettaLoaderIdentity() {
    if (!isPyonLoader() || isVendettaLoader() || !isCloudCordLoader())
      return null;
    var loader;
    if (isCloudCordLoader() == true) {
      loader = {
        name: cloudCordLoaderIdentity.loaderName ?? "CloudCord",
        features: {}
      };
    } else {
      loader = {
        name: pyonLoaderIdentity.loaderName,
        features: {}
      };
    }
    if (isLoaderConfigSupported())
      loader.features.loaderConfig = true;
    if (isSysColorsSupported()) {
      loader.features.syscolors = {
        prop: "__vendetta_syscolors"
      };
      Object.defineProperty(globalThis, "__vendetta_syscolors", {
        get: () => getSysColors(),
        configurable: true
      });
    }
    if (isThemeSupported()) {
      loader.features.themes = {
        prop: "__vendetta_theme"
      };
      Object.defineProperty(globalThis, "__vendetta_theme", {
        // get: () => getStoredTheme(),
        get: () => {
          var id = getStoredTheme()?.id;
          if (!id)
            return null;
          var { themes: themes2 } = (init_themes(), __toCommonJS(themes_exports));
          return themes2[id] ?? getStoredTheme() ?? null;
        },
        configurable: true
      });
    }
    Object.defineProperty(globalThis, "__vendetta_loader", {
      get: () => loader,
      configurable: true
    });
    return loader;
  }
  function getVendettaLoaderIdentity() {
    if (globalThis.__vendetta_loader)
      return globalThis.__vendetta_loader;
    return polyfillVendettaLoaderIdentity();
  }
  function getLoaderName() {
    if (isCloudCordLoader())
      return cloudCordLoaderIdentity.loaderName ?? "CloudCord";
    if (isPyonLoader())
      return pyonLoaderIdentity.loaderName;
    if (isVendettaLoader())
      return vendettaLoaderIdentity.name;
    return "Unknown";
  }
  function getLoaderVersion() {
    if (isCloudCordLoader())
      return cloudCordLoaderIdentity.loaderVersion ?? String(cloudCordLoaderIdentity.cloudcordAutoUpdateVersion ?? "2");
    if (isPyonLoader())
      return pyonLoaderIdentity.loaderVersion;
    return null;
  }
  function isLoaderConfigSupported() {
    if (isCloudCordLoader())
      return true;
    if (isPyonLoader()) {
      return true;
    } else if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.loaderConfig;
    }
    return false;
  }
  function isThemeSupported() {
    if (isPyonLoader()) {
      return pyonLoaderIdentity.hasThemeSupport;
    } else if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.themes != null;
    } else if (isRa1nLoader()) {
      return false;
    }
    return false;
  }
  function getStoredTheme() {
    if (isCloudCordLoader() && cloudCordLoaderIdentity.storedTheme)
      return cloudCordLoaderIdentity.storedTheme;
    if (isPyonLoader()) {
      return pyonLoaderIdentity.storedTheme;
    } else if (isVendettaLoader()) {
      var themeProp = vendettaLoaderIdentity.features.themes?.prop;
      if (!themeProp)
        return null;
      return globalThis[themeProp] || null;
    }
    return null;
  }
  function getThemeFilePath() {
    if (isCloudCordLoader())
      return "cloudcord/current-theme.json";
    if (isPyonLoader()) {
      return "cloudcord/current-theme.json";
    } else if (isVendettaLoader()) {
      return "vendetta_theme.json";
    }
    return null;
  }
  function isReactDevToolsPreloaded() {
    if (isPyonLoader()) {
      return Boolean(globalThis.__REACT_DEVTOOLS__);
    }
    if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.devtools != null;
    }
    return false;
  }
  function getReactDevToolsProp() {
    if (!isReactDevToolsPreloaded())
      return null;
    if (isPyonLoader()) {
      globalThis.__cloudcord_rdt = globalThis.__REACT_DEVTOOLS__.exports;
      return "__cloudcord_rdt";
    }
    if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.devtools.prop;
    }
    return null;
  }
  function isSysColorsSupported() {
    return true;
  }
  function getSysColors() {
    if (!isSysColorsSupported())
      return null;
    if (isPyonLoader()) {
      return pyonLoaderIdentity.sysColors;
    } else if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.syscolors.prop;
    }
    return null;
  }
  function getLoaderConfigPath() {
    if (isCloudCordLoader())
      return "cloudcord/loader.json";
    if (isPyonLoader()) {
      return "cloudcord/loader.json";
    } else if (isVendettaLoader()) {
      return "vendetta_loader.json";
    }
    return "loader.json";
  }
  var pyonLoaderIdentity, cloudCordLoaderIdentity, vendettaLoaderIdentity;
  var init_loader = __esm({
    "src/lib/api/native/loader.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_fs();
      pyonLoaderIdentity = globalThis.__PYON_LOADER__;
      cloudCordLoaderIdentity = globalThis.__CLOUDCORD_LOADER__;
      vendettaLoaderIdentity = globalThis.__vendetta_loader;
      getVendettaLoaderIdentity();
    }
  });

  // src/lib/api/settings.ts
  var settings_exports = {};
  __export(settings_exports, {
    loaderConfig: () => loaderConfig,
    settings: () => settings
  });
  var settings, loaderConfig;
  var init_settings = __esm({
    "src/lib/api/settings.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_storage();
      init_loader();
      settings = wrapSync(createStorage(createMMKVBackend("VENDETTA_SETTINGS")));
      loaderConfig = wrapSync(createStorage(createFileBackend(getLoaderConfigPath(), {
        customLoadUrl: {
          enabled: false,
          url: "http://localhost:4040/cloudcord.js"
        }
      })));
    }
  });

  // src/metro/polyfills/redesign.ts
  var redesign_exports = {};
  __export(redesign_exports, {
    default: () => redesign_default
  });
  var redesignProps, _module, _source, cacher, actualExports, exportsKeysLength, prop, id, moduleExports, redesign_default;
  var init_redesign = __esm({
    "src/metro/polyfills/redesign.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_caches();
      redesignProps = /* @__PURE__ */ new Set([
        "AlertActionButton",
        "AlertModal",
        "AlertModalContainer",
        "AvatarDuoPile",
        "AvatarPile",
        "BACKDROP_OPAQUE_MAX_OPACITY",
        "Backdrop",
        "Button",
        "Card",
        "ContextMenu",
        "ContextMenuContainer",
        "FauxHeader",
        "FloatingActionButton",
        "GhostInput",
        "GuildIconPile",
        "HeaderActionButton",
        "HeaderButton",
        "HeaderSubmittingIndicator",
        "IconButton",
        "Input",
        "InputButton",
        "InputContainer",
        "LayerContext",
        "LayerScope",
        "Modal",
        "ModalActionButton",
        "ModalContent",
        "ModalDisclaimer",
        "ModalFloatingAction",
        "ModalFloatingActionSpacer",
        "ModalFooter",
        "ModalScreen",
        "ModalStepIndicator",
        "NAV_BAR_HEIGHT",
        "NAV_BAR_HEIGHT_MULTILINE",
        "Navigator",
        "NavigatorHeader",
        "NavigatorScreen",
        "Pile",
        "PileOverflow",
        "RedesignCompat",
        "RedesignCompatContext",
        "RowButton",
        "STATUS_BAR_HEIGHT",
        "SceneLoadingIndicator",
        "SearchField",
        "SegmentedControl",
        "SegmentedControlPages",
        "Slider",
        "Stack",
        "StepModal",
        "StickyContext",
        "StickyHeader",
        "StickyWrapper",
        "TABLE_ROW_CONTENT_HEIGHT",
        "TABLE_ROW_HEIGHT",
        "TableCheckboxRow",
        "TableRadioGroup",
        "TableRadioRow",
        "TableRow",
        "TableRowGroup",
        "TableRowGroupTitle",
        "TableRowIcon",
        "TableSwitchRow",
        "Tabs",
        "TextArea",
        "TextField",
        "TextInput",
        "Toast",
        "dismissAlerts",
        "getHeaderBackButton",
        "getHeaderCloseButton",
        "getHeaderConditionalBackButton",
        "getHeaderNoTitle",
        "getHeaderTextButton",
        "hideContextMenu",
        "navigatorShouldCrossfade",
        "openAlert",
        "useAccessibilityNativeStackOptions",
        "useAndroidNavScrim",
        "useCoachmark",
        "useFloatingActionButtonScroll",
        "useFloatingActionButtonState",
        "useNativeStackNavigation",
        "useNavigation",
        "useNavigationTheme",
        "useNavigatorBackPressHandler",
        "useNavigatorScreens",
        "useNavigatorShouldCrossfade",
        "useSegmentedControlState",
        "useStackNavigation",
        "useTabNavigation",
        "useTooltip"
      ]);
      _module = {};
      _source = {};
      cacher = getPolyfillModuleCacher("redesign_module");
      for ([id, moduleExports] of cacher.getModules()) {
        for (prop of redesignProps) {
          actualExports = void 0;
          if (moduleExports[prop]) {
            actualExports = moduleExports;
          } else if (moduleExports.default?.[prop]) {
            actualExports = moduleExports.default;
          } else {
            continue;
          }
          exportsKeysLength = Reflect.ownKeys(actualExports).length;
          if (_source[prop] && exportsKeysLength <= _source[prop]) {
            continue;
          }
          _module[prop] = actualExports[prop];
          _source[prop] = Reflect.ownKeys(actualExports).length;
          cacher.cacheId(id);
        }
      }
      cacher.finish();
      redesign_default = _module;
    }
  });

  // src/metro/internals/modules.ts
  var modules_exports2 = {};
  __export(modules_exports2, {
    getCachedPolyfillModules: () => getCachedPolyfillModules,
    getImportingModuleId: () => getImportingModuleId,
    getModules: () => getModules,
    metroModules: () => metroModules,
    requireModule: () => requireModule,
    subscribeModule: () => subscribeModule,
    waitFor: () => waitFor,
    waitForModule: () => waitForModule
  });
  function blacklistModule(id) {
    Object.defineProperty(metroModules, id, {
      enumerable: false
    });
    blacklistedIds.add(id);
    indexBlacklistFlag(Number(id));
  }
  function isBadExports(exports) {
    return !exports || exports === globalThis || exports["<!@ pylix was here :fuyusquish: \n Hi pylix! -cocobo1!@>"] === null || exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0 || exports.default?.[Symbol.toStringTag] === "IntlMessagesProxy";
  }
  function onModuleRequire(moduleExports, id) {
    indexExportsFlags(id, moduleExports);
    moduleExports.initSentry &&= () => void 0;
    if (moduleExports.default?.track && moduleExports.default.trackMaker)
      moduleExports.default.track = () => Promise.resolve();
    if (moduleExports.registerAsset) {
      (init_patches(), __toCommonJS(patches_exports)).patchAssets(moduleExports);
    }
    if (!patchedNativeComponentRegistry && [
      "customBubblingEventTypes",
      "customDirectEventTypes",
      "register",
      "get"
    ].every((x2) => moduleExports[x2])) {
      instead2("register", moduleExports, ([name, cb], origFunc) => {
        try {
          return origFunc(name, cb);
        } catch (e) {
          return name;
        }
      });
      patchedNativeComponentRegistry = true;
    }
    if (moduleExports?.default?.constructor?.displayName === "DeveloperExperimentStore") {
      moduleExports.default = new Proxy(moduleExports.default, {
        get(target, property, receiver) {
          if (property === "isDeveloper") {
            var { settings: settings2 } = (init_settings(), __toCommonJS(settings_exports));
            return settings2.enableDiscordDeveloperSettings ?? false;
          }
          return Reflect.get(target, property, receiver);
        }
      });
    }
    if (!patchedImportTracker && moduleExports.fileFinishedImporting) {
      before2("fileFinishedImporting", moduleExports, ([filePath]) => {
        if (_importingModuleId === -1 || !filePath)
          return;
        metroModules[_importingModuleId].__filePath = filePath;
      });
      patchedImportTracker = true;
    }
    if (!patchedInspectSource && globalThis["__core-js_shared__"]) {
      var inspect = (f) => typeof f === "function" && functionToString.apply(f, []);
      globalThis["__core-js_shared__"].inspectSource = inspect;
      patchedInspectSource = true;
    }
    if (moduleExports.findHostInstance_DEPRECATED) {
      var prevExports = metroModules[id - 1]?.publicModule.exports;
      var inc = prevExports.default?.reactProfilingEnabled ? 1 : -1;
      if (!metroModules[id + inc]?.isInitialized) {
        blacklistModule(id + inc);
      }
    }
    if (moduleExports.isMoment) {
      instead2("defineLocale", moduleExports, (args, orig) => {
        var origLocale = moduleExports.locale();
        orig(...args);
        moduleExports.locale(origLocale);
      });
    }
    var subs = moduleSubscriptions.get(Number(id));
    if (subs) {
      subs.forEach((s) => s());
      moduleSubscriptions.delete(Number(id));
    }
  }
  function getImportingModuleId() {
    return _importingModuleId;
  }
  function subscribeModule(id, cb) {
    var subs = moduleSubscriptions.get(id) ?? /* @__PURE__ */ new Set();
    subs.add(cb);
    moduleSubscriptions.set(id, subs);
    return () => subs.delete(cb);
  }
  function requireModule(id) {
    if (!metroModules[0]?.isInitialized)
      metroRequire(0);
    if (blacklistedIds.has(id))
      return void 0;
    if (Number(id) === -1)
      return init_redesign(), __toCommonJS(redesign_exports);
    if (metroModules[id]?.isInitialized && !metroModules[id]?.hasError) {
      return metroRequire(id);
    }
    var originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(noopHandler);
    var moduleExports;
    try {
      moduleExports = metroRequire(id);
    } catch (e) {
      blacklistModule(id);
      moduleExports = void 0;
    }
    ErrorUtils.setGlobalHandler(originalHandler);
    return moduleExports;
  }
  function* getModules(uniq, all = false) {
    yield [
      -1,
      (init_redesign(), __toCommonJS(redesign_exports))
    ];
    var cache = getMetroCache().findIndex[uniq];
    if (all && !cache?.[`_${ModulesMapInternal.FULL_LOOKUP}`])
      cache = void 0;
    if (cache?.[`_${ModulesMapInternal.NOT_FOUND}`])
      return;
    for (var id in cache) {
      if (id[0] === "_")
        continue;
      var exports = requireModule(Number(id));
      if (isBadExports(exports))
        continue;
      yield [
        id,
        exports
      ];
    }
    for (var id1 in metroModules) {
      var exports1 = requireModule(Number(id1));
      if (isBadExports(exports1))
        continue;
      yield [
        id1,
        exports1
      ];
    }
  }
  function* getCachedPolyfillModules(name) {
    var cache = getMetroCache().polyfillIndex[name];
    for (var id in cache) {
      var exports = requireModule(Number(id));
      if (isBadExports(exports))
        continue;
      yield [
        id,
        exports
      ];
    }
    if (!cache[`_${ModulesMapInternal.FULL_LOOKUP}`]) {
      for (var id1 in metroModules) {
        var exports1 = requireModule(Number(id1));
        if (isBadExports(exports1))
          continue;
        yield [
          id1,
          exports1
        ];
      }
    }
  }
  function waitFor(filter, callback, options = {}) {
    var { count = 1 } = options;
    var currentCount = 0;
    var unsubscribers = [];
    var isActive = true;
    var cleanup = () => {
      if (!isActive)
        return;
      isActive = false;
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
    };
    function checkModule(id3) {
      if (!isActive)
        return true;
      var exports = requireModule(id3);
      if (isBadExports(exports))
        return false;
      var result = filter(exports);
      if (!result)
        return false;
      callback(result, id3);
      if (++currentCount >= count) {
        cleanup();
        return true;
      }
      return false;
    }
    if (filter.key) {
      var cache = getMetroCache().findIndex[filter.key];
      if (cache) {
        var _loop2 = function(id3) {
          if (id3[0] === "_")
            return "continue";
          var numId2 = Number(id3);
          if (metroModules[numId2]?.isInitialized) {
            if (checkModule(numId2))
              return {
                v: cleanup
              };
          } else {
            var unsub = subscribeModule(numId2, () => {
              checkModule(numId2);
            });
            unsubscribers.push(unsub);
          }
        };
        for (var id in cache) {
          var _ret = _loop2(id);
          if (_type_of(_ret) === "object")
            return _ret.v;
        }
      }
    }
    for (var id1 in metroModules) {
      if (!isActive)
        break;
      var numId = Number(id1);
      if (metroModules[numId]?.isInitialized && !metroModules[numId]?.hasError) {
        if (checkModule(numId))
          return cleanup;
      }
    }
    if (isActive) {
      var _loop1 = function(id22) {
        var numId2 = Number(id22);
        if (!metroModules[numId2]?.isInitialized) {
          var unsub = subscribeModule(numId2, () => {
            checkModule(numId2);
          });
          unsubscribers.push(unsub);
        }
      };
      for (var id2 in metroModules)
        _loop1(id2);
    }
    return cleanup;
  }
  function waitForModule(filter, options = {}) {
    return new Promise((resolve) => {
      waitFor(filter, (exports) => resolve(exports), options);
    });
  }
  var _loop, before2, instead2, metroModules, metroRequire, moduleSubscriptions, blacklistedIds, noopHandler, functionToString, patchedInspectSource, patchedImportTracker, patchedNativeComponentRegistry, _importingModuleId, key;
  var init_modules2 = __esm({
    "src/metro/internals/modules.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_type_of();
      init_caches();
      init_enums();
      _loop = function(key) {
        var id = Number(key);
        var metroModule = metroModules[id];
        var cache = getMetroCache().flagsIndex[id];
        if (cache & ModuleFlags.BLACKLISTED) {
          blacklistModule(id);
          return "continue";
        }
        if (metroModule.factory) {
          instead2("factory", metroModule, (args, origFunc) => {
            var originalImportingId = _importingModuleId;
            _importingModuleId = id;
            var { 1: metroRequire2, 4: moduleObject } = args;
            args[
              2
              /* metroImportDefault */
            ] = (id2) => {
              var exps = metroRequire2(id2);
              return exps && exps.__esModule ? exps.default : exps;
            };
            args[
              3
              /* metroImportAll */
            ] = (id2) => {
              var exps = metroRequire2(id2);
              if (exps && exps.__esModule)
                return exps;
              var importAll = {};
              if (exps)
                Object.assign(importAll, exps);
              importAll.default = exps;
              return importAll;
            };
            origFunc(...args);
            if (!isBadExports(moduleObject.exports)) {
              onModuleRequire(moduleObject.exports, id);
            } else {
              blacklistModule(id);
            }
            _importingModuleId = originalImportingId;
          });
        }
      };
      ({ before: before2, instead: instead2 } = require_cjs());
      metroModules = globalThis.modules;
      metroRequire = (id) => globalThis.__r(+id);
      moduleSubscriptions = /* @__PURE__ */ new Map();
      blacklistedIds = /* @__PURE__ */ new Set();
      noopHandler = () => void 0;
      functionToString = Function.prototype.toString;
      patchedInspectSource = false;
      patchedImportTracker = false;
      patchedNativeComponentRegistry = false;
      _importingModuleId = -1;
      for (key in metroModules)
        _loop(key);
    }
  });

  // src/metro/internals/caches.ts
  var caches_exports = {};
  __export(caches_exports, {
    getCacherForUniq: () => getCacherForUniq,
    getMetroCache: () => getMetroCache,
    getPolyfillModuleCacher: () => getPolyfillModuleCacher,
    indexAssetModuleFlag: () => indexAssetModuleFlag,
    indexBlacklistFlag: () => indexBlacklistFlag,
    indexExportsFlags: () => indexExportsFlags,
    initMetroCache: () => initMetroCache
  });
  function buildInitCache() {
    var cache = {
      _v: CACHE_VERSION,
      _buildNumber: NativeClientInfoModule.getConstants().Build,
      _modulesCount: Object.keys(globalThis.modules).length,
      flagsIndex: {},
      findIndex: {},
      polyfillIndex: {}
    };
    setTimeout(() => {
      for (var id in globalThis.modules) {
        (init_modules2(), __toCommonJS(modules_exports2)).requireModule(id);
      }
    }, 100);
    _metroCache = cache;
    return cache;
  }
  function initMetroCache() {
    return _async_to_generator(function* () {
      if (!(yield fileExists(BUNNY_METRO_CACHE_PATH)))
        return void buildInitCache();
      var rawCache = yield readFile(BUNNY_METRO_CACHE_PATH);
      try {
        _metroCache = JSON.parse(rawCache);
        if (_metroCache._v !== CACHE_VERSION) {
          _metroCache = null;
          throw "cache invalidated; cache version outdated";
        }
        if (_metroCache._buildNumber !== NativeClientInfoModule.getConstants().Build) {
          _metroCache = null;
          throw "cache invalidated; version mismatch";
        }
        if (_metroCache._modulesCount !== Object.keys(globalThis.modules).length) {
          _metroCache = null;
          throw "cache invalidated; modules count mismatch";
        }
      } catch (e) {
        buildInitCache();
      }
    })();
  }
  function extractExportsFlags(moduleExports) {
    if (!moduleExports)
      return void 0;
    var bit = ModuleFlags.EXISTS;
    return bit;
  }
  function indexExportsFlags(moduleId, moduleExports) {
    var flags = extractExportsFlags(moduleExports);
    if (flags && flags !== ModuleFlags.EXISTS) {
      _metroCache.flagsIndex[moduleId] = flags;
    }
  }
  function indexBlacklistFlag(id) {
    _metroCache.flagsIndex[id] |= ModuleFlags.BLACKLISTED;
  }
  function indexAssetModuleFlag(id) {
    _metroCache.flagsIndex[id] |= ModuleFlags.ASSET;
  }
  function getCacherForUniq(uniq, allFind) {
    var indexObject = _metroCache.findIndex[uniq] ??= {};
    return {
      cacheId(moduleId, exports) {
        indexObject[moduleId] ??= extractExportsFlags(exports);
        saveCache();
      },
      // Finish may not be called by single find
      finish(notFound) {
        if (allFind)
          indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
        if (notFound)
          indexObject[`_${ModulesMapInternal.NOT_FOUND}`] = 1;
        saveCache();
      }
    };
  }
  function getPolyfillModuleCacher(name) {
    var indexObject = _metroCache.polyfillIndex[name] ??= {};
    return {
      getModules() {
        return (init_modules2(), __toCommonJS(modules_exports2)).getCachedPolyfillModules(name);
      },
      cacheId(moduleId) {
        indexObject[moduleId] = 1;
        saveCache();
      },
      finish() {
        indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
        saveCache();
      }
    };
  }
  var CACHE_VERSION, BUNNY_METRO_CACHE_PATH, _metroCache, getMetroCache, saveCache;
  var init_caches = __esm({
    "src/metro/internals/caches.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_fs();
      init_modules();
      init_dist();
      init_enums();
      CACHE_VERSION = 102;
      BUNNY_METRO_CACHE_PATH = "caches/metro_modules.json";
      _metroCache = null;
      getMetroCache = () => _metroCache;
      saveCache = debounce(() => {
        writeFile(BUNNY_METRO_CACHE_PATH, JSON.stringify(_metroCache));
      }, 1e3);
    }
  });

  // src/lib/api/native/legacyRuntimeRefresh.ts
  function invokeLegacyReload() {
    return _async_to_generator(function* () {
      var reader = import_react_native5.NativeModules.FileReaderModule ?? import_react_native5.NativeModules.RCTFileReaderModule;
      if (typeof reader?.readAsDataURL !== "function")
        return false;
      yield reader.readAsDataURL({
        rain: {
          method: "updater.reload",
          args: []
        }
      });
      return true;
    })();
  }
  function isCurrentCloudCordLoader() {
    var nativeLoader = globalThis.__CLOUDCORD_LOADER__;
    return Boolean(nativeLoader && Number(nativeLoader.cloudcordAutoUpdateVersion ?? 0) >= 2);
  }
  function initLegacyRuntimeRefresh() {
    return _async_to_generator(function* () {
      var nativeLoader = globalThis.__CLOUDCORD_LOADER__;
      if (!nativeLoader || isCurrentCloudCordLoader())
        return;
      yield awaitStorage(loaderConfig);
      var config = loaderConfig;
      config.customLoadUrl ??= {
        enabled: false,
        url: ""
      };
      if (config.customLoadUrl.enabled && config.customLoadUrl.url)
        return;
      config.customLoadUrl.url = CURRENT_RUNTIME_URL;
      config.customLoadUrl.enabled = true;
      try {
        yield invokeLegacyReload();
      } catch (e) {
      }
    })();
  }
  var import_react_native5, CURRENT_RUNTIME_URL;
  var init_legacyRuntimeRefresh = __esm({
    "src/lib/api/native/legacyRuntimeRefresh.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_storage();
      init_settings();
      import_react_native5 = __toESM(require_react_native());
      CURRENT_RUNTIME_URL = "https://cloudcord.xohus.lol/api/proxy/raw/dist/cc.js";
    }
  });

  // shims/jsxRuntime.ts
  var jsxRuntime_exports = {};
  __export(jsxRuntime_exports, {
    Fragment: () => Fragment,
    jsx: () => jsx,
    jsxs: () => jsxs
  });
  function unproxyFirstArg(args) {
    if (!args[0]) {
      throw new Error("The first argument (Component) is falsy. Ensure that you are passing a valid component.");
    }
    var factory = getProxyFactory(args[0]);
    if (factory)
      args[0] = factory();
    return args;
  }
  var jsxRuntime, Fragment, jsx, jsxs;
  var init_jsxRuntime = __esm({
    "shims/jsxRuntime.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_wrappers();
      jsxRuntime = findByPropsLazy("jsx", "jsxs", "Fragment");
      Fragment = Symbol.for("react.fragment");
      jsx = (...args) => jsxRuntime.jsx(...unproxyFirstArg(args));
      jsxs = (...args) => jsxRuntime.jsxs(...unproxyFirstArg(args));
    }
  });

  // globals:react
  var require_react = __commonJS({
    "globals:react"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["react"];
    }
  });

  // src/core/ui/settings/pages/CloudCordVerification/index.tsx
  function getRootBoundary() {
    return _async_to_generator(function* () {
      var context = findByNameLazy("ErrorBoundary")[_lazyContextSymbol];
      return new Promise((resolve) => context.getExports((exp) => resolve(exp.prototype)));
    })();
  }
  function CloudCordGate() {
    var [visible, setVisible] = (0, import_react.useState)(false);
    var [mode, setMode] = (0, import_react.useState)("join");
    var oauthState = (0, import_react.useRef)(void 0);
    var oauthStartedAt = (0, import_react.useRef)(0);
    var busy = (0, import_react.useRef)(false);
    (0, import_react.useEffect)(() => {
      var alive = true;
      var check = () => _async_to_generator(function* () {
        if (!alive || busy.current)
          return;
        busy.current = true;
        try {
          var configResponse = yield fetch(CONFIG_URL, {
            cache: "no-store"
          });
          if (!configResponse.ok) {
            setVisible(false);
            return;
          }
          var config = yield configResponse.json();
          if (config?.oauth2Off || !config?.enabled || !config?.guildId) {
            setVisible(false);
            return;
          }
          if (settings.cloudcordBlacklisted) {
            setMode("blacklisted");
            setVisible(true);
            return;
          }
          if (oauthState.current) {
            var response = yield fetch(`https://cloudcord.xohus.lol/api/cloudcord/onboarding/status/${encodeURIComponent(oauthState.current)}`, {
              cache: "no-store"
            });
            var result = response.ok ? yield response.json() : {
              status: "pending"
            };
            if (result.status === "complete") {
              oauthState.current = void 0;
              setVisible(false);
              return;
            }
            if (result.status === "blacklisted") {
              settings.cloudcordBlacklisted = true;
              oauthState.current = void 0;
              setMode("blacklisted");
              setVisible(true);
              return;
            }
            if (result.status !== "error" && Date.now() - oauthStartedAt.current < 6e4) {
              setVisible(false);
              return;
            }
            oauthState.current = void 0;
          }
          var guildStore = findByProps("getGuilds", "getGuild");
          if (guildStore?.getGuild?.(String(config.guildId))) {
            setVisible(false);
            return;
          }
          setMode("join");
          setVisible(true);
        } catch (e) {
          setVisible(false);
        } finally {
          busy.current = false;
        }
      })();
      void check();
      var timer = setInterval(() => void check(), 2e3);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, []);
    var authorize = () => _async_to_generator(function* () {
      if (busy.current)
        return;
      busy.current = true;
      setVisible(false);
      try {
        yield new Promise((resolve) => setTimeout(resolve, 350));
        var response = yield fetch(START_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            accepted: true,
            termsVersion: "2026-08-27"
          })
        });
        var result = yield response.json();
        if (!response.ok || !result?.authorizeUrl || !result?.state)
          throw new Error("OAuth unavailable");
        oauthState.current = String(result.state);
        oauthStartedAt.current = Date.now();
        var discordUrl = String(result.authorizeUrl).replace("https://discord.com/oauth2/authorize", "discord://-/oauth2/authorize");
        yield import_react_native6.Linking.openURL(discordUrl);
      } catch (e) {
        setMode("join");
        setVisible(true);
      } finally {
        busy.current = false;
      }
    })();
    return /* @__PURE__ */ jsx(import_react_native6.Modal, {
      visible,
      transparent: false,
      animationType: "fade",
      onRequestClose: () => {
      },
      statusBarTranslucent: true,
      children: /* @__PURE__ */ jsx(import_react_native6.SafeAreaView, {
        style: {
          flex: 1,
          backgroundColor: "#111214",
          justifyContent: "center",
          padding: 24
        },
        children: /* @__PURE__ */ jsxs(import_react_native6.View, {
          style: {
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            padding: 24,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#3f4147",
            backgroundColor: "#1e1f22"
          },
          children: [
            /* @__PURE__ */ jsx(import_react_native6.Text, {
              style: {
                color: "#f2f3f5",
                fontSize: 25,
                fontWeight: "800",
                marginBottom: 10,
                textAlign: "center"
              },
              children: mode === "blacklisted" ? "Access Blacklisted" : "Join CloudCord"
            }),
            /* @__PURE__ */ jsx(import_react_native6.Text, {
              style: {
                color: "#b5bac1",
                fontSize: 15,
                lineHeight: 22,
                marginBottom: mode === "join" ? 20 : 0,
                textAlign: "center"
              },
              children: mode === "blacklisted" ? "Discord authorization was denied, so this device cannot access CloudCord." : "Join the official CloudCord server to finish setup. By continuing, you accept the Terms of Service."
            }),
            mode === "join" && /* @__PURE__ */ jsx(import_react_native6.Pressable, {
              accessibilityRole: "button",
              onPress: () => void authorize(),
              style: ({ pressed }) => ({
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: pressed ? "#4752c4" : "#5865f2"
              }),
              children: /* @__PURE__ */ jsx(import_react_native6.Text, {
                style: {
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: "700"
                },
                children: "Accept Terms & Continue"
              })
            })
          ]
        })
      })
    });
  }
  function initializeCloudCordVerification() {
    if (initialized)
      return;
    initialized = true;
    after.await("render", getRootBoundary(), (_args, result) => /* @__PURE__ */ jsxs(Fragment, {
      children: [
        result,
        /* @__PURE__ */ jsx(CloudCordGate, {})
      ]
    }));
  }
  var import_react, import_react_native6, CONFIG_URL, START_URL, initialized;
  var init_CloudCordVerification = __esm({
    "src/core/ui/settings/pages/CloudCordVerification/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_settings();
      init_patcher();
      init_lazy2();
      init_wrappers();
      init_metro();
      import_react = __toESM(require_react());
      import_react_native6 = __toESM(require_react_native());
      CONFIG_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/config";
      START_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/start";
      initialized = false;
    }
  });

  // src/lib/api/react/jsx.ts
  var jsx_exports = {};
  __export(jsx_exports, {
    deleteJsxCreate: () => deleteJsxCreate,
    onJsxCreate: () => onJsxCreate,
    patchJsx: () => patchJsx
  });
  function onJsxCreate(Component, callback) {
    if (!callbacks.has(Component))
      callbacks.set(Component, []);
    callbacks.get(Component).push(callback);
  }
  function deleteJsxCreate(Component, callback) {
    if (!callbacks.has(Component))
      return;
    var cbs = callbacks.get(Component);
    cbs.splice(cbs.indexOf(callback), 1);
    if (cbs.length === 0)
      callbacks.delete(Component);
  }
  function patchJsx() {
    var callback = ([Component], ret) => {
      if (typeof ret.type === "undefined") {
        ret.type = "RCTView";
        return ret;
      }
      if (typeof Component === "function" && callbacks.has(Component.name)) {
        var cbs = callbacks.get(Component.name);
        for (var cb of cbs) {
          var _ret = cb(Component, ret);
          if (_ret !== void 0)
            ret = _ret;
        }
        return ret;
      }
    };
    var patches3 = [
      after("jsx", jsxRuntime2, callback),
      after("jsxs", jsxRuntime2, callback)
    ];
    return () => patches3.forEach((unpatch) => unpatch());
  }
  var callbacks, jsxRuntime2;
  var init_jsx = __esm({
    "src/lib/api/react/jsx.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_patcher();
      init_metro();
      callbacks = /* @__PURE__ */ new Map();
      jsxRuntime2 = findByPropsLazy("jsx", "jsxs");
    }
  });

  // src/core/i18n/default.json
  var default_default;
  var init_default = __esm({
    "src/core/i18n/default.json"() {
      default_default = {
        ABOUT: "About",
        ACTIONS: "Actions",
        ARE_YOU_SURE_TO_CLEAR_DATA: "Are you sure you wish to clear the data of {name}?",
        ARE_YOU_SURE_TO_DELETE_PLUGIN: "Are you sure you wish to delete {name}? This will clear all of the plugin's data.",
        ARE_YOU_SURE_TO_DELETE_THEME: "Are you sure you wish to delete {name}?",
        ASSET_BROWSER: "Asset Browser",
        BRAND: "Brand",
        PUPU: "CloudCord",
        PUPU_URL: "CloudCord URL",
        BROWSER: "Addon Browser",
        BYTECODE: "Bytecode",
        CANCEL: "Cancel",
        CLEAR: "Clear",
        CLEAR_BUNDLE: "Clear JS Bundle",
        CLEAR_BUNDLE_DESC: "Clear the cached bundle. This will force a re-download of the bundle next app launch.",
        CLEAR_DATA: "Clear data",
        CLEAR_DATA_FAILED: "Failed to clear data for {name}",
        CLEAR_DATA_SUCCESSFUL: "Cleared data for {name}",
        CODEBERG: "",
        CODENAME: "Codename",
        COMMAND_DEBUG_DESC: "Send CloudCord debug info.",
        COMMAND_DEBUG_OPT_EPHEMERALLY: "Send debug info ephemerally.",
        COMMAND_EVAL_DESC: "Evaluate JavaScript code.",
        COMMAND_EVAL_OPT_ASYNC: "Whether to support 'await' in code. Must explicitly return for result (default: false)",
        COMMAND_EVAL_OPT_CODE: "The code to evaluate.",
        COMMAND_PLUGINS_DESC: "Send list of installed plugins.",
        COMMAND_PLUGINS_OPT_EPHEMERALLY: "Send plugins list ephemerally.",
        COMPONENT: "Component",
        CONFIRMATION_LINK_IS_A_TYPE: "This link is a **{urlType, select, plugin {Plugin} theme {Theme} other {Add-on}}**, would you like to install it?",
        CONNECT_TO_DEBUG_WEBSOCKET: "Connect to debug WebSocket",
        CONNECT_TO_REACT_DEVTOOLS: "Connect to React DevTools",
        CONTINUE: "Continue",
        COPIED_TO_CLIPBOARD: "Copied to clipboard",
        COPY_URL: "Copy URL",
        DEBUG: "Debug",
        DEBUGGER_URL: "RainDevTools URL",
        AUTO_DEBUGGER: "Automatically connect to RainDevTools",
        DEVTOOLS_URL: "React DevTools URL",
        AUTO_DEVTOOLS: "Automatically connect to React Devtools",
        DELETE: "Delete",
        DESC_EXTRACT_FONTS_FROM_THEME: 'Looks out for "fonts" field in your currently applied theme and install it.',
        DEVELOPER: "Developer",
        DEVELOPER_SETTINGS: "Developer Settings",
        DISABLE_THEME: "Disable Theme",
        DISABLE_UPDATES: "Disable Updates",
        DISCORD_SERVER: "Discord Server",
        DONE: "Done",
        ENABLE_EVAL_COMMAND: "Enable /eval command",
        ENABLE_EVAL_COMMAND_DESC: "Evaluate JavaScript directly from a command. Be cautious when using this command as it may pose a security risk. Make sure to know what you are doing.",
        ENABLE_UPDATES: "Enable Updates",
        ERROR_BOUNDARY_TOOLS_LABEL: "ErrorBoundary Tools",
        EXTRACT: "Extract",
        FONT_NAME: "Font Name",
        FONTS: "Fonts",
        GENERAL: "General",
        GITHUB: "GitHub",
        HOLD_UP: "Hold Up",
        INFO: "Info",
        INSTALL: "Install",
        INSTALL_ADDON: "Install an add-on",
        INSTALL_FONT: "Install a font",
        INSTALL_PLUGIN: "Install a plugin",
        INSTALL_REACT_DEVTOOLS: "Install React DevTools",
        INSTALL_THEME: "Install a theme",
        LABEL_EXTRACT_FONTS_FROM_THEME: "Extract font from theme",
        LINKS: "Links",
        LOAD_FROM_CUSTOM_URL: "Load from custom URL",
        LOAD_FROM_CUSTOM_URL_DEC: "Load CloudCord from a custom endpoint.",
        LOAD_REACT_DEVTOOLS: "Load React DevTools",
        LOADER: "Loader",
        MACHINE_ID: "Machine ID",
        MANUFACTURER: "Manufacturer",
        MESSAGE: "Message",
        MISCELLANEOUS: "Miscellaneous",
        MODAL_RELOAD_REQUIRED: "Reload app?",
        MODAL_RELOAD_REQUIRED_DESC: "A reload is required to see the changes. Do you want to reload now?",
        MODAL_THEME_REFETCHED: "Theme refetched",
        MODAL_THEME_REFETCHED_DESC: "A reload is required to see the changes. Do you want to reload now?",
        MODAL_UNPROXIED_PLUGIN_DESC: "The plugin you are trying to install has not been proxied/verified by staff. Are you sure you want to continue?",
        MODAL_UNPROXIED_PLUGIN_HEADER: "Unproxied Plugin",
        MODEL: "Model",
        MODELID: "Model Identifier",
        OPEN_IN_BROWSER: "Open in Browser",
        OPERATING_SYSTEM: "Operating System",
        OVERFLOW_PLUGIN_SETTINGS: "Plugin Settings",
        PLATFORM: "Platform",
        PLUGIN_REFETCH_FAILED: "Failed to refetch plugin",
        PLUGIN_REFETCH_SUCCESSFUL: "Successfully refetched plugin",
        PLUGINS: "Plugins",
        REFETCH: "Refetch",
        RELOAD: "Reload",
        RELOAD_DISCORD: "Reload Discord",
        RELOAD_IN_NORMAL_MODE: "Reload in Normal Mode",
        RELOAD_IN_NORMAL_MODE_DESC: "Safe mode currently enabled, tap to reload in normal mode",
        RELOAD_IN_SAFE_MODE: "Reload in Safe Mode",
        RELOAD_IN_SAFE_MODE_DESC: "Tap to reload Discord without loading addons",
        REMOVE: "Remove",
        RESTART_REQUIRED_TO_TAKE_EFFECT: "Restart is required to take effect",
        RETRY: "Retry",
        RETRY_RENDER: "Retry Render",
        SAFE_MODE: "Safe Mode",
        SAFE_MODE_NOTICE_FONTS: "You are in safe mode, meaning fonts have been temporarily disabled. {enabled, select, true {If a font appears to be causing the issue, you can press below to disable it persistently.} other {}}",
        SAFE_MODE_NOTICE_PLUGINS: "You are in safe mode, so plugins cannot be loaded. Disable any misbehaving plugins, then return to Normal Mode from the General settings page.",
        SAFE_MODE_NOTICE_THEMES: "You are in safe mode, meaning themes have been temporarily disabled. {enabled, select, true {If a theme appears to be causing the issue, you can press below to disable it persistently.} other {}}",
        SEARCH: "Search",
        SEPARATOR: ", ",
        SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS: "Activate Discord Experiments",
        SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS_DESC: "Warning: Messing with this feature may lead to account termination. I heavily discourage using this and am not responsible for anything that happens if you use it",
        STACK_TRACE: "Stack Trace",
        SUCCESSFULLY_INSTALLED: "Successfully installed",
        THEME_EXTRACTOR_DESC: "This pack overrides the following: {fonts}",
        THEME_REFETCH_FAILED: "Failed to refetch theme",
        THEME_REFETCH_SUCCESSFUL: "Successfully refetched theme",
        THEMES: "Themes",
        THEMES_RELOAD_FOR_CHANGES: "Reload the app to fully apply changes",
        TOASTS_INSTALLED_PLUGIN: "Installed plugin",
        TOASTS_PLUGIN_UPDATE: "{update, select, true {Enabled} other {Disabled}} updates for {name}",
        UH_OH: "Uh Oh",
        UNINSTALL: "Uninstall",
        UNINSTALL_TITLE: "Uninstall {title}",
        URL_PLACEHOLDER: "https://github.com/xohus/cloudcord",
        VERSION: "Version",
        VERSIONS: "Versions"
      };
    }
  });

  // src/core/i18n/index.ts
  function fetchLocale(locale) {
    var resolvedLocale = _lastSetLocale = languageMap[locale] ?? locale;
    logger.log("[i18n] fetchLocale called:", locale, "->", resolvedLocale);
    if (!_loadedLocale.has(resolvedLocale)) {
      _loadedLocale.add(resolvedLocale);
      if (resolvedLocale.toLowerCase().startsWith("en")) {
        logger.log("[i18n] Using local default.json for English locale");
        _loadedStrings[resolvedLocale] = default_default;
        _currentLocale = resolvedLocale;
      } else {
        fetch(`https://codeberg.org/cocobo1/kettu-i18n/raw/branch/main/base/${resolvedLocale}.json`).then((r) => r.json()).then((strings) => {
          logger.log("[i18n] Loaded strings for:", resolvedLocale);
          _loadedStrings[resolvedLocale] = strings;
          _currentLocale = resolvedLocale;
        }).catch((e) => logger.error(`[i18n] Error fetching strings for ${resolvedLocale}: ${e}`));
      }
    } else {
      _currentLocale = resolvedLocale;
    }
  }
  function initFetchI18nStrings() {
    var attempts = 0;
    var checkAndFetch = () => {
      attempts++;
      try {
        var LocaleStore = findByStoreName("LocaleStore");
        logger.log("[i18n] Attempt", attempts, "- LocaleStore:", !!LocaleStore);
        if (!LocaleStore) {
          logger.log("[i18n] LocaleStore not found yet");
          return false;
        }
        if (LocaleStore?._isInitialized !== true) {
          logger.log("[i18n] LocaleStore not initialized yet");
          return false;
        }
        var locale = LocaleStore.locale;
        if (locale) {
          logger.log("[i18n] Using LocaleStore:", locale);
          fetchLocale(locale);
          return true;
        }
      } catch (e) {
        logger.log("[i18n] Error:", e);
      }
      return false;
    };
    var tryTimes = () => {
      if (checkAndFetch())
        return;
      if (attempts < 15) {
        setTimeout(tryTimes, 500);
      }
    };
    tryTimes();
    var cb = (e) => {
      if (e?.settings?.changes?.loading) {
        logger.log("[i18n] Settings loading, skipping...");
        return;
      }
      var locale = e?.settings?.changes?.protoToSave?.localization?.locale?.value;
      logger.log("[i18n] Locale changed:", locale);
      if (locale) {
        logger.log("[i18n] Found locale in event:", locale);
        fetchLocale(locale);
      }
    };
    FluxDispatcher.subscribe("USER_SETTINGS_PROTO_UPDATE_EDIT_INFO", cb);
    return () => {
      FluxDispatcher.unsubscribe("USER_SETTINGS_PROTO_UPDATE_EDIT_INFO", cb);
    };
  }
  function formatString(key, val) {
    var str = Strings[key];
    return new IntlMessageFormat(str).format(val);
  }
  var IntlMessageFormat, _currentLocale, _lastSetLocale, _loadedLocale, _loadedStrings, Strings, languageMap;
  var init_i18n = __esm({
    "src/core/i18n/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_logger();
      init_common();
      init_wrappers();
      init_default();
      IntlMessageFormat = findByNameLazy("MessageFormat");
      _currentLocale = null;
      _lastSetLocale = null;
      _loadedLocale = /* @__PURE__ */ new Set();
      _loadedStrings = {};
      Strings = new Proxy({}, {
        get: (_t, prop) => {
          if (_currentLocale && _loadedStrings[_currentLocale]?.[prop]) {
            return _loadedStrings[_currentLocale]?.[prop];
          }
          return default_default[prop];
        }
      });
      languageMap = {
        "ar-SA": "ar",
        "bn-BD": "bn",
        "ca-ES": "ca",
        "de-DE": "de",
        "es-ES": "es",
        "es-419": "es",
        "fa-IR": "fa",
        "fi-FI": "fi",
        "fr-FR": "fr",
        "hi-IN": "hi",
        "hr-HR": "hr",
        "hu-HU": "hu",
        "id-ID": "id",
        "it-IT": "it",
        "ja-JP": "ja",
        "pl-PL": "pl",
        "pt-BR": "pt_BR",
        "ru-RU": "ru",
        "sk-SK": "sk",
        "sv-SE": "sv",
        "tr-TR": "tr",
        "vi-VN": "vi"
      };
    }
  });

  // src/core/vendetta/plugins.ts
  var plugins, pluginInstance, VdPluginManager;
  var init_plugins = __esm({
    "src/core/vendetta/plugins.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_storage();
      init_settings();
      init_utils();
      init_constants();
      init_logger();
      plugins = wrapSync(createStorage(createMMKVBackend("VENDETTA_PLUGINS")));
      pluginInstance = {};
      VdPluginManager = {
        plugins,
        pluginFetch(url2) {
          return _async_to_generator(function* () {
            if (url2.startsWith(VD_PROXY_PREFIX)) {
              url2 = url2.replace("https://bunny-mod.github.io/plugins-proxy", BUNNY_PROXY_PREFIX).replace(VD_PROXY_PREFIX, BUNNY_PROXY_PREFIX);
            }
            return yield safeFetch(url2, {
              cache: "no-store"
            });
          })();
        },
        fetchPlugin(id) {
          return _async_to_generator(function* () {
            if (!id.endsWith("/"))
              id += "/";
            var existingPlugin = plugins[id];
            var pluginManifest;
            try {
              pluginManifest = yield (yield this.pluginFetch(id + "manifest.json")).json();
            } catch (e) {
              throw new Error(`Failed to fetch manifest for ${id}`);
            }
            var pluginJs;
            if (existingPlugin?.manifest.hash !== pluginManifest.hash) {
              try {
                pluginJs = yield (yield this.pluginFetch(id + (pluginManifest.main || "index.js"))).text();
              } catch (e) {
              }
            }
            if (!pluginJs && !existingPlugin)
              throw new Error(`Failed to fetch JS for ${id}`);
            plugins[id] = {
              id,
              manifest: pluginManifest,
              enabled: existingPlugin?.enabled ?? false,
              update: existingPlugin?.update ?? true,
              js: pluginJs ?? existingPlugin.js
            };
          }).call(this);
        },
        installPlugin(id, enabled = true) {
          return _async_to_generator(function* () {
            if (!id.endsWith("/"))
              id += "/";
            if (typeof id !== "string" || id in plugins)
              throw new Error("Plugin already installed");
            yield this.fetchPlugin(id);
            if (enabled)
              yield this.startPlugin(id);
          }).call(this);
        },
        /**
         * @internal
         */
        evalPlugin(plugin) {
          return _async_to_generator(function* () {
            var vendettaForPlugins = {
              ...globalThis.vendetta,
              plugin: {
                id: plugin.id,
                manifest: plugin.manifest,
                // Wrapping this with wrapSync is NOT an option.
                storage: yield createStorage(createMMKVBackend(plugin.id))
              },
              logger: new LoggerClass(`CloudCord \xBB ${plugin.manifest.name}`)
            };
            var pluginString = `vendetta=>{return ${plugin.js}}
//# sourceURL=${plugin.id}`;
            var raw = (0, eval)(pluginString)(vendettaForPlugins);
            var ret = typeof raw === "function" ? raw() : raw;
            return ret?.default ?? ret ?? {};
          })();
        },
        startPlugin(id) {
          return _async_to_generator(function* () {
            if (!id.endsWith("/"))
              id += "/";
            var plugin = plugins[id];
            if (plugin.id.includes("xxjust") == true || plugin.id.includes("DevNjay") == true) {
              return;
            }
            if (!plugin)
              throw new Error("Attempted to start non-existent plugin");
            try {
              if (!settings.safeMode?.enabled) {
                var pluginRet = yield this.evalPlugin(plugin);
                pluginInstance[id] = pluginRet;
                pluginRet.onLoad?.();
              }
              plugin.enabled = true;
            } catch (e) {
              logger.error(`Plugin ${plugin.id} errored whilst loading, and will be unloaded`, e);
              try {
                pluginInstance[plugin.id]?.onUnload?.();
              } catch (e2) {
                logger.error(`Plugin ${plugin.id} errored whilst unloading`, e2);
              }
              delete pluginInstance[id];
              plugin.enabled = false;
            }
          }).call(this);
        },
        stopPlugin(id, disable = true) {
          if (!id.endsWith("/"))
            id += "/";
          var plugin = plugins[id];
          var pluginRet = pluginInstance[id];
          if (!plugin)
            throw new Error("Attempted to stop non-existent plugin");
          if (!settings.safeMode?.enabled) {
            try {
              pluginRet?.onUnload?.();
            } catch (e) {
              logger.error(`Plugin ${plugin.id} errored whilst unloading`, e);
            }
            delete pluginInstance[id];
          }
          if (disable)
            plugin.enabled = false;
        },
        removePlugin(id) {
          return _async_to_generator(function* () {
            if (!id.endsWith("/"))
              id += "/";
            var plugin = plugins[id];
            if (plugin.enabled)
              this.stopPlugin(id);
            delete plugins[id];
            yield purgeStorage(id);
          }).call(this);
        },
        /**
         * @internal
         */
        initPlugins() {
          return _async_to_generator(function* () {
            yield awaitStorage(settings, plugins);
            var allIds = Object.keys(plugins);
            if (!settings.safeMode?.enabled) {
              allSettled(allIds.filter((pl) => plugins[pl].enabled).map((pl) => _async_to_generator(function* () {
                return plugins[pl].update && (yield this.fetchPlugin(pl).catch((e) => logger.error(e.message))), yield this.startPlugin(pl);
              }).call(this)));
              allIds.filter((pl) => !plugins[pl].enabled && plugins[pl].update).forEach((pl) => this.fetchPlugin(pl));
            }
            return () => this.stopAllPlugins();
          }).call(this);
        },
        stopAllPlugins() {
          return Object.keys(pluginInstance).forEach((p) => this.stopPlugin(p, false));
        },
        getSettings: (id) => pluginInstance[id]?.settings
      };
    }
  });

  // src/lib/api/assets/index.ts
  var assets_exports = {};
  __export(assets_exports, {
    filterAssets: () => filterAssets,
    findAsset: () => findAsset,
    findAssetId: () => findAssetId,
    iterateAssets: () => iterateAssets
  });
  function* iterateAssets() {
    var { flagsIndex } = getMetroCache();
    var yielded = /* @__PURE__ */ new Set();
    for (var id in flagsIndex) {
      if (flagsIndex[id] & ModuleFlags.ASSET) {
        var assetId = requireModule(Number(id));
        if (typeof assetId !== "number" || yielded.has(assetId))
          continue;
        yield getAssetById(assetId);
        yielded.add(assetId);
      }
    }
  }
  function getAssetById(id) {
    var asset = assetsModule.getAssetByID(id);
    if (!asset)
      return asset;
    return Object.assign(asset, {
      id
    });
  }
  function findAsset(param) {
    if (typeof param === "number")
      return getAssetById(param);
    if (typeof param === "string" && _nameToAssetCache[param]) {
      return _nameToAssetCache[param];
    }
    for (var asset of iterateAssets()) {
      if (typeof param === "string" && asset.name === param) {
        _nameToAssetCache[param] = asset;
        return asset;
      } else if (typeof param === "function" && param(asset)) {
        return asset;
      }
    }
  }
  function filterAssets(param) {
    var filteredAssets = [];
    for (var asset of iterateAssets()) {
      if (typeof param === "string" ? asset.name === param : param(asset)) {
        filteredAssets.push(asset);
      }
    }
    return filteredAssets;
  }
  function findAssetId(name) {
    return findAsset(name)?.id;
  }
  var _nameToAssetCache;
  var init_assets = __esm({
    "src/lib/api/assets/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_caches();
      init_enums();
      init_modules2();
      init_patches();
      _nameToAssetCache = {};
    }
  });

  // src/lib/ui/components/wrappers/AlertModal.tsx
  function AlertModal2(props) {
    var forwardFailedModal = findByFilePath("modules/forwarding/native/ForwardFailedAlertModal.tsx");
    if (!forwardFailedModal && "extraContent" in props) {
      props.content = /* @__PURE__ */ jsxs(import_react_native7.View, {
        style: {
          gap: 16
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "text-md/medium",
            color: "text-muted",
            children: props.content
          }),
          /* @__PURE__ */ jsx(import_react_native7.View, {
            children: props.extraContent
          })
        ]
      });
      delete props.extraContent;
    }
    return /* @__PURE__ */ jsx(_AlertModal, {
      ...props
    });
  }
  var import_react_native7, _AlertModal, _AlertActionButton, AlertActionButton2;
  var init_AlertModal = __esm({
    "src/lib/ui/components/wrappers/AlertModal.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_lazy();
      init_metro();
      init_components();
      import_react_native7 = __toESM(require_react_native());
      ({ AlertModal: _AlertModal, AlertActionButton: _AlertActionButton } = lazyDestructure(() => findByProps("AlertModal", "AlertActions")));
      AlertActionButton2 = _AlertActionButton;
    }
  });

  // src/lib/ui/components/wrappers/index.ts
  var wrappers_exports = {};
  __export(wrappers_exports, {
    AlertActionButton: () => AlertActionButton2,
    AlertModal: () => AlertModal2
  });
  var init_wrappers2 = __esm({
    "src/lib/ui/components/wrappers/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_AlertModal();
    }
  });

  // src/lib/ui/color.ts
  function isSemanticColor(sym) {
    return colorResolver.isSemanticColor(sym);
  }
  function resolveSemanticColor(sym, theme = ThemeStore2.theme) {
    return colorResolver.resolveSemanticColor(theme, sym);
  }
  var color, semanticColors, rawColors, ThemeStore2, colorResolver;
  var init_color = __esm({
    "src/lib/ui/color.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_common();
      init_wrappers();
      color = findByProps("SemanticColor");
      semanticColors = color?.default?.colors ?? constants?.ThemeColorMap;
      rawColors = color?.default?.unsafe_rawColors ?? constants?.Colors;
      ThemeStore2 = findByStoreNameLazy("ThemeStore");
      colorResolver = color.default.meta ??= color.default.internal;
    }
  });

  // src/lib/ui/styles.ts
  var styles_exports = {};
  __export(styles_exports, {
    TextStyleSheet: () => TextStyleSheet,
    ThemeContext: () => ThemeContext,
    createLegacyClassComponentStyles: () => createLegacyClassComponentStyles,
    createStyles: () => createStyles,
    createThemedStyleSheet: () => createThemedStyleSheet
  });
  function createStyles(sheet) {
    return proxyLazy(() => Styles.createStyles(sheet));
  }
  function createLegacyClassComponentStyles(sheet) {
    return proxyLazy(() => Styles.createLegacyClassComponentStyles(sheet));
  }
  function createThemedStyleSheet(sheet) {
    for (var key in sheet) {
      sheet[key] = new Proxy(import_react_native8.StyleSheet.flatten(sheet[key]), {
        get(target, prop, receiver) {
          var res = Reflect.get(target, prop, receiver);
          return isSemanticColor(res) ? resolveSemanticColor(res) : res;
        }
      });
    }
    return sheet;
  }
  var import_react_native8, Styles, ThemeContext, TextStyleSheet;
  var init_styles = __esm({
    "src/lib/ui/styles.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_wrappers();
      init_color();
      import_react_native8 = __toESM(require_react_native());
      Styles = findByPropsLazy("createStyles");
      ({ ThemeContext } = lazyDestructure(() => findByProps("ThemeContext"), {
        hint: "object"
      }));
      ({ TextStyleSheet } = lazyDestructure(() => findByProps("TextStyleSheet")));
    }
  });

  // src/lib/ui/components/Codeblock.tsx
  function Codeblock({ selectable, style, children }) {
    if (!selectable)
      return /* @__PURE__ */ jsx(TextBasedCodeblock, {
        style,
        children
      });
    return import_react_native9.Platform.select({
      ios: /* @__PURE__ */ jsx(InputBasedCodeblock, {
        style,
        children
      }),
      default: /* @__PURE__ */ jsx(TextBasedCodeblock, {
        style,
        children,
        selectable: true
      })
    });
  }
  var import_react_native9, useStyles, InputBasedCodeblock, TextBasedCodeblock;
  var init_Codeblock = __esm({
    "src/lib/ui/components/Codeblock.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_common();
      init_color();
      init_styles();
      import_react_native9 = __toESM(require_react_native());
      useStyles = createStyles({
        codeBlock: {
          fontFamily: constants.Fonts.CODE_NORMAL,
          fontSize: 12,
          textAlignVertical: "center",
          backgroundColor: semanticColors.CARD_BACKGROUND_DEFAULT,
          color: semanticColors.TEXT_DEFAULT,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: semanticColors.BORDER_SUBTLE,
          padding: 10
        }
      });
      InputBasedCodeblock = ({ style, children }) => /* @__PURE__ */ jsx(import_react_native9.TextInput, {
        editable: false,
        multiline: true,
        style: [
          useStyles().codeBlock,
          style && style
        ],
        value: children
      });
      TextBasedCodeblock = ({ selectable, style, children }) => /* @__PURE__ */ jsx(import_react_native9.Text, {
        selectable,
        style: [
          useStyles().codeBlock,
          style && style
        ],
        children
      });
    }
  });

  // src/lib/ui/sheets.ts
  var sheets_exports = {};
  __export(sheets_exports, {
    hideSheet: () => hideSheet,
    showSheet: () => showSheet
  });
  function showSheet(key, lazyImport, props) {
    if (!("then" in lazyImport))
      lazyImport = Promise.resolve({
        default: lazyImport
      });
    actionSheet.openLazy(lazyImport, key, props ?? {});
  }
  function hideSheet(key) {
    actionSheet.hideActionSheet(key);
  }
  var actionSheet;
  var init_sheets = __esm({
    "src/lib/ui/sheets.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_wrappers();
      actionSheet = findByPropsLazy("openLazy", "hideActionSheet");
    }
  });

  // src/core/ui/reporter/utils/isStack.tsx
  function isComponentStack(error) {
    return "componentStack" in error && typeof error.componentStack === "string";
  }
  function hasStack(error) {
    return !!error.stack;
  }
  var init_isStack = __esm({
    "src/core/ui/reporter/utils/isStack.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/core/ui/reporter/utils/parseComponentStack.tsx
  function parseComponentStack(componentStack) {
    return componentStack.split(/[\s|\n]+?in /).filter(Boolean);
  }
  var init_parseComponentStack = __esm({
    "src/core/ui/reporter/utils/parseComponentStack.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/core/ui/reporter/components/ErrorComponentStackCard.tsx
  function ErrorComponentStackCard(props) {
    var [collapsed, setCollapsed] = (0, import_react2.useState)(true);
    var stack;
    try {
      stack = parseComponentStack(props.componentStack);
      stack = collapsed ? stack.slice(0, 4) : stack;
    } catch (e) {
      return;
    }
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(import_react_native10.View, {
        style: {
          gap: 8
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/bold",
            children: "Component Stack"
          }),
          /* @__PURE__ */ jsx(import_react_native10.View, {
            style: {
              gap: 4
            },
            children: stack.map((component) => /* @__PURE__ */ jsxs(import_react_native10.View, {
              style: {
                flexDirection: "row"
              },
              children: [
                /* @__PURE__ */ jsx(Text, {
                  variant: "text-md/bold",
                  color: "text-muted",
                  children: "<"
                }),
                /* @__PURE__ */ jsx(Text, {
                  variant: "text-md/bold",
                  children: component
                }),
                /* @__PURE__ */ jsx(Text, {
                  variant: "text-md/bold",
                  color: "text-muted",
                  children: "/>"
                })
              ]
            }))
          }),
          collapsed && /* @__PURE__ */ jsx(Text, {
            children: "..."
          }),
          /* @__PURE__ */ jsxs(import_react_native10.View, {
            style: {
              gap: 8,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                text: `Show ${collapsed ? "more" : "less"}`,
                icon: collapsed ? findAssetId("down_arrow") : /* @__PURE__ */ jsx(import_react_native10.Image, {
                  style: {
                    transform: [
                      {
                        rotate: `${collapsed ? 0 : 180}deg`
                      }
                    ]
                  },
                  source: findAssetId("down_arrow")
                }),
                onPress: () => setCollapsed((v2) => !v2)
              }),
              /* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                text: "Copy",
                icon: findAssetId("CopyIcon"),
                onPress: () => clipboard.setString(props.componentStack)
              })
            ]
          })
        ]
      })
    });
  }
  var import_react2, import_react_native10;
  var init_ErrorComponentStackCard = __esm({
    "src/core/ui/reporter/components/ErrorComponentStackCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_parseComponentStack();
      init_assets();
      init_common();
      init_components();
      import_react2 = __toESM(require_react());
      import_react_native10 = __toESM(require_react_native());
    }
  });

  // src/core/ui/reporter/utils/parseErrorStack.ts
  function isInternalBytecodeSourceUrl(sourceUrl) {
    return sourceUrl === "InternalBytecode.js";
  }
  function parseLine(line) {
    var asFrame = line.match(RE_FRAME);
    if (asFrame) {
      return {
        type: "FRAME",
        functionName: asFrame[1],
        location: asFrame[2] === "native" ? {
          type: "NATIVE"
        } : asFrame[3] === "address at " ? isInternalBytecodeSourceUrl(asFrame[4]) ? {
          type: "INTERNAL_BYTECODE",
          sourceUrl: asFrame[4],
          line1Based: Number.parseInt(asFrame[5], 10),
          virtualOffset0Based: Number.parseInt(asFrame[6], 10)
        } : {
          type: "BYTECODE",
          sourceUrl: asFrame[4],
          line1Based: Number.parseInt(asFrame[5], 10),
          virtualOffset0Based: Number.parseInt(asFrame[6], 10)
        } : {
          type: "SOURCE",
          sourceUrl: asFrame[4],
          line1Based: Number.parseInt(asFrame[5], 10),
          column1Based: Number.parseInt(asFrame[6], 10)
        }
      };
    }
    var asSkipped = line.match(RE_SKIPPED);
    if (asSkipped) {
      return {
        type: "SKIPPED",
        count: Number.parseInt(asSkipped[1], 10)
      };
    }
  }
  function parseHermesStack(stack) {
    var lines = stack.split(/\n/);
    var entries = [];
    var lastMessageLine = -1;
    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      if (!line) {
        continue;
      }
      var entry = parseLine(line);
      if (entry) {
        entries.push(entry);
        continue;
      }
      if (RE_COMPONENT_NO_STACK.test(line)) {
        continue;
      }
      lastMessageLine = i;
      entries = [];
    }
    var message = lines.slice(0, lastMessageLine + 1).join("\n");
    return {
      message,
      entries
    };
  }
  function convertHermesStack(stack) {
    var frames = [];
    for (var entry of stack.entries) {
      if (entry.type !== "FRAME") {
        continue;
      }
      var { location, functionName } = entry;
      if (location.type === "NATIVE" || location.type === "INTERNAL_BYTECODE") {
        continue;
      }
      frames.push({
        methodName: functionName,
        file: location.sourceUrl,
        lineNumber: location.line1Based,
        column: location.type === "SOURCE" ? location.column1Based - 1 : location.virtualOffset0Based
      });
    }
    return frames;
  }
  function parseErrorStack(errorStack) {
    if (errorStack == null) {
      return [];
    }
    var parsedStack = Array.isArray(errorStack) ? errorStack : convertHermesStack(parseHermesStack(errorStack));
    return parsedStack;
  }
  var RE_FRAME, RE_SKIPPED, RE_COMPONENT_NO_STACK;
  var init_parseErrorStack = __esm({
    "src/core/ui/reporter/utils/parseErrorStack.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      RE_FRAME = /^ {4}at (.+?)(?: \((native)\)?| \((address at )?(.*?):(\d+):(\d+)\))$/;
      RE_SKIPPED = /^ {4}... skipping (\d+) frames$/;
      RE_COMPONENT_NO_STACK = /^ {4}at .*$/;
    }
  });

  // src/core/ui/reporter/components/ErrorStackCard.tsx
  function ErrorStackCard(props) {
    var [collapsed, setCollapsed] = (0, import_react3.useState)(true);
    var stack;
    try {
      var parsedErrorStack = parseErrorStack(props.error.stack);
      stack = collapsed ? parsedErrorStack.slice(0, 4) : parsedErrorStack;
    } catch (e) {
      return null;
    }
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(import_react_native11.View, {
        style: {
          gap: 12
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/bold",
            children: "Call Stack"
          }),
          /* @__PURE__ */ jsx(import_react_native11.View, {
            style: {
              gap: 4
            },
            children: stack.map((f, id) => /* @__PURE__ */ jsx(Line, {
              id,
              frame: f
            }))
          }),
          collapsed && /* @__PURE__ */ jsx(Text, {
            children: "..."
          }),
          /* @__PURE__ */ jsxs(import_react_native11.View, {
            style: {
              gap: 8,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                text: `Show ${collapsed ? "more" : "less"}`,
                icon: collapsed ? findAssetId("down_arrow") : /* @__PURE__ */ jsx(import_react_native11.Image, {
                  style: {
                    transform: [
                      {
                        rotate: `${collapsed ? 0 : 180}deg`
                      }
                    ]
                  },
                  source: findAssetId("down_arrow")
                }),
                onPress: () => setCollapsed((v2) => !v2)
              }),
              /* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                text: "Copy",
                icon: findAssetId("CopyIcon"),
                onPress: () => clipboard.setString(props.error.stack)
              })
            ]
          })
        ]
      })
    });
  }
  function Line(props) {
    var [collapsed, setCollapsed] = (0, import_react3.useState)(true);
    return /* @__PURE__ */ jsxs(import_react_native11.Pressable, {
      onPress: () => setCollapsed((v2) => !v2),
      children: [
        /* @__PURE__ */ jsx(Text, {
          style: {
            fontFamily: constants.Fonts.CODE_BOLD
          },
          children: props.frame.methodName
        }),
        /* @__PURE__ */ jsx(Text, {
          style: {
            fontFamily: constants.Fonts.CODE_NORMAL
          },
          ellipsizeMode: "middle",
          numberOfLines: collapsed ? 1 : void 0,
          children: /* @__PURE__ */ jsxs(Text, {
            color: "text-muted",
            children: [
              props.frame.file === INDEX_BUNDLE_FILE ? "jsbundle" : props.frame.file,
              ":",
              props.frame.lineNumber,
              ":",
              props.frame.column
            ]
          })
        })
      ]
    }, props.id);
  }
  var import_react3, import_react_native11;
  var init_ErrorStackCard = __esm({
    "src/core/ui/reporter/components/ErrorStackCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_parseErrorStack();
      init_assets();
      init_common();
      init_components();
      import_react3 = __toESM(require_react());
      import_react_native11 = __toESM(require_react_native());
      init_ErrorCard();
    }
  });

  // src/core/ui/reporter/components/ErrorDetailsActionSheet.tsx
  function ErrorDetailsActionSheet(props) {
    return /* @__PURE__ */ jsx(ActionSheet, {
      children: /* @__PURE__ */ jsxs(import_react_native12.View, {
        style: {
          gap: 12,
          paddingVertical: 12
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/extrabold",
            children: "Error"
          }),
          /* @__PURE__ */ jsx(Codeblock, {
            selectable: true,
            children: props.error.message
          }),
          hasStack(props.error) && /* @__PURE__ */ jsx(ErrorStackCard, {
            error: props.error
          }),
          isComponentStack(props.error) ? /* @__PURE__ */ jsx(ErrorComponentStackCard, {
            componentStack: props.error.componentStack
          }) : null
        ]
      })
    });
  }
  var import_react_native12;
  var init_ErrorDetailsActionSheet = __esm({
    "src/core/ui/reporter/components/ErrorDetailsActionSheet.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_isStack();
      init_components2();
      init_components();
      import_react_native12 = __toESM(require_react_native());
      init_ErrorComponentStackCard();
      init_ErrorStackCard();
    }
  });

  // src/core/ui/reporter/components/ErrorCard.tsx
  function ErrorCard(props) {
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(Stack, {
        children: [
          props.header && typeof props.header !== "string" ? props.header : /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/bold",
            children: props.header ?? Strings.UH_OH
          }),
          /* @__PURE__ */ jsx(Codeblock, {
            selectable: true,
            children: String(props.error)
          }),
          /* @__PURE__ */ jsxs(TwinButtons, {
            children: [
              props.onRetryRender && /* @__PURE__ */ jsx(Button, {
                variant: "destructive",
                // icon={findAssetId("RetryIcon")}
                text: Strings.RETRY_RENDER,
                onPress: props.onRetryRender
              }),
              props.error instanceof Error ? /* @__PURE__ */ jsx(Button, {
                text: "Details",
                // icon={findAssetId("CircleInformationIcon-primary")}
                onPress: () => showSheet("BunnyErrorDetailsActionSheet", ErrorDetailsActionSheet, {
                  error: props.error
                })
              }) : null
            ]
          })
        ]
      })
    });
  }
  var INDEX_BUNDLE_FILE;
  var init_ErrorCard = __esm({
    "src/core/ui/reporter/components/ErrorCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_i18n();
      init_components2();
      init_sheets();
      init_components();
      init_ErrorDetailsActionSheet();
      INDEX_BUNDLE_FILE = globalThis.HermesInternal.getFunctionLocation(globalThis.__r).fileName;
    }
  });

  // src/lib/ui/components/ErrorBoundary.tsx
  var _React_Component, ErrorBoundary;
  var init_ErrorBoundary = __esm({
    "src/lib/ui/components/ErrorBoundary.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_call_super();
      init_class_call_check();
      init_create_class();
      init_define_property();
      init_inherits();
      init_jsxRuntime();
      init_ErrorCard();
      init_common();
      init_styles();
      ErrorBoundary = /* @__PURE__ */ function(_superClass) {
        "use strict";
        _inherits(ErrorBoundary2, _superClass);
        function ErrorBoundary2(props) {
          _class_call_check(this, ErrorBoundary2);
          var _this;
          _this = _call_super(this, ErrorBoundary2, [
            props
          ]);
          _this.state = {
            hasErr: false
          };
          return _this;
        }
        _create_class(ErrorBoundary2, [
          {
            key: "render",
            value: function render() {
              if (!this.state.hasErr)
                return this.props.children;
              return /* @__PURE__ */ jsx(ErrorCard, {
                error: this.state.error,
                onRetryRender: () => this.setState({
                  hasErr: false
                })
              });
            }
          }
        ]);
        return ErrorBoundary2;
      }(_React_Component = React2.Component);
      _define_property(ErrorBoundary, "contextType", ThemeContext);
      _define_property(ErrorBoundary, "getDerivedStateFromError", (error) => ({
        hasErr: true,
        error
      }));
    }
  });

  // src/lib/ui/components/Search.tsx
  function SearchIcon() {
    return /* @__PURE__ */ jsx(import_react_native13.Image, {
      style: {
        width: 16,
        height: 16
      },
      source: findAssetId("icon-search")
    });
  }
  var import_react_native13, Search_default;
  var init_Search = __esm({
    "src/lib/ui/components/Search.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_i18n();
      init_assets();
      init_components();
      init_ErrorBoundary();
      import_react_native13 = __toESM(require_react_native());
      Search_default = ({ onChangeText, placeholder, style, isRound }) => {
        var [query, setQuery] = React.useState("");
        var onChange = (value) => {
          setQuery(value);
          onChangeText?.(value);
        };
        return /* @__PURE__ */ jsx(ErrorBoundary, {
          children: /* @__PURE__ */ jsx(import_react_native13.View, {
            style,
            children: /* @__PURE__ */ jsx(TextInput, {
              grow: true,
              isClearable: true,
              leadingIcon: SearchIcon,
              placeholder: placeholder ?? Strings.SEARCH,
              onChange,
              returnKeyType: "search",
              size: "md",
              autoCapitalize: "none",
              autoCorrect: false,
              isRound,
              value: query
            })
          })
        });
      };
    }
  });

  // src/lib/ui/components/Summary.tsx
  function Summary({ label, icon, noPadding = false, noAnimation = false, children }) {
    var [hidden, setHidden] = React.useState(true);
    return /* @__PURE__ */ jsxs(Fragment, {
      children: [
        /* @__PURE__ */ jsx(TableRow, {
          label,
          icon: icon && /* @__PURE__ */ jsx(TableRow.Icon, {
            source: findAssetId(icon)
          }),
          trailing: /* @__PURE__ */ jsx(LegacyFormRow.Arrow, {
            style: {
              transform: [
                {
                  rotate: `${hidden ? 180 : 90}deg`
                }
              ]
            }
          }),
          onPress: () => {
            setHidden(!hidden);
            if (!noAnimation)
              import_react_native14.LayoutAnimation.configureNext(import_react_native14.LayoutAnimation.Presets.easeInEaseOut);
          }
        }),
        !hidden && /* @__PURE__ */ jsx(Fragment, {
          children: /* @__PURE__ */ jsx(import_react_native14.View, {
            style: !noPadding && {
              paddingHorizontal: 15
            },
            children
          })
        })
      ]
    });
  }
  var import_react_native14;
  var init_Summary = __esm({
    "src/lib/ui/components/Summary.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_components();
      import_react_native14 = __toESM(require_react_native());
    }
  });

  // src/lib/ui/components/index.ts
  var components_exports2 = {};
  __export(components_exports2, {
    Codeblock: () => Codeblock,
    ErrorBoundary: () => ErrorBoundary,
    Search: () => Search_default,
    Summary: () => Summary,
    wrappers: () => wrappers_exports
  });
  var init_components2 = __esm({
    "src/lib/ui/components/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_wrappers2();
      init_Codeblock();
      init_ErrorBoundary();
      init_Search();
      init_Summary();
    }
  });

  // src/lib/ui/toasts.ts
  var toasts_exports = {};
  __export(toasts_exports, {
    showToast: () => showToast
  });
  var uuid4, showToast;
  var init_toasts = __esm({
    "src/lib/ui/toasts.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_i18n();
      init_assets();
      init_lazy();
      init_common();
      init_wrappers();
      ({ uuid4 } = lazyDestructure(() => findByProps("uuid4")));
      showToast = (content, asset) => toasts.open({
        // ? In build 182205/44707, Discord changed their toasts, source is no longer used, rather icon, and a key is needed.
        // TODO: We could probably have the developer specify a key themselves, but this works to fix toasts
        key: `vd-toast-${uuid4()}`,
        content,
        source: asset,
        icon: asset
      });
      showToast.showCopyToClipboard = (message = Strings.COPIED_TO_CLIPBOARD) => {
        showToast(message, findAssetId("toast_copy_link"));
      };
    }
  });

  // src/core/plugins/quickinstall/forumPost.tsx
  function useExtractThreadContent(thread, _firstMessage = null, actionSheet2 = false) {
    if (thread.guild_id !== KETTU_DISCORD_SERVER_ID)
      return;
    var postType;
    if (thread.parent_id === KETTU_PLUGINS_CHANNEL_ID) {
      postType = "Plugin";
    } else if (thread.parent_id === KETTU_THEMES_CHANNEL_ID && isThemeSupported()) {
      postType = "Theme";
    } else
      return;
    var { firstMessage } = actionSheet2 ? useFirstForumPostMessage(thread) : {
      firstMessage: _firstMessage
    };
    var urls = firstMessage?.content?.match(HTTP_REGEX_MULTI)?.filter(postMap[postType].urlsFilter);
    if (!urls || !urls[0])
      return;
    if (postType === "Plugin" && !urls[0].endsWith("/"))
      urls[0] += "/";
    return [
      postType,
      urls[0]
    ];
  }
  function useInstaller(thread, firstMessage = null, actionSheet2 = false) {
    var [postType, url2] = useExtractThreadContent(thread, firstMessage, actionSheet2) ?? [];
    useProxy(VdPluginManager.plugins);
    useProxy(themes);
    var [isInstalling, setIsInstalling] = React.useState(false);
    if (!postType || !url2)
      return [
        true
      ];
    var isInstalled = Boolean(postMap[postType].storage[url2]);
    var installOrRemove = () => _async_to_generator(function* () {
      setIsInstalling(true);
      try {
        yield postMap[postType].installOrRemove(url2);
      } catch (e) {
        showToast(e.message, findAssetId("Small"));
      } finally {
        setIsInstalling(false);
      }
    })();
    return [
      false,
      postType,
      isInstalled,
      isInstalling,
      installOrRemove
    ];
  }
  var useFirstForumPostMessage, forumReactions, postMap, installButtonPatch, forumPost_default;
  var init_forumPost = __esm({
    "src/core/plugins/quickinstall/forumPost.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_i18n();
      init_plugins();
      init_storage();
      init_themes();
      init_assets();
      init_loader();
      init_patcher();
      init_constants();
      init_lazy();
      init_components();
      init_wrappers();
      init_components2();
      init_toasts();
      ({ useFirstForumPostMessage } = lazyDestructure(() => findByProps("useFirstForumPostMessage")));
      forumReactions = findByPropsLazy("MostCommonForumPostReaction");
      postMap = {
        Plugin: {
          storage: VdPluginManager.plugins,
          urlsFilter: (url2) => url2.startsWith(VD_PROXY_PREFIX),
          installOrRemove: (url2) => {
            var isInstalled = postMap.Plugin.storage[url2];
            return isInstalled ? VdPluginManager.removePlugin(url2) : VdPluginManager.installPlugin(url2);
          }
        },
        Theme: {
          storage: themes,
          urlsFilter: (url2) => url2.endsWith(".json"),
          installOrRemove: (url2) => {
            var isInstalled = postMap.Theme.storage[url2];
            return isInstalled ? removeTheme(url2) : installTheme(url2);
          }
        }
      };
      installButtonPatch = () => after("MostCommonForumPostReaction", forumReactions, ([{ thread, firstMessage }], res) => {
        var [shouldReturn, _2, installed, loading, installOrRemove] = useInstaller(thread, firstMessage, true);
        if (shouldReturn)
          return;
        return /* @__PURE__ */ jsxs(Fragment, {
          children: [
            res,
            /* @__PURE__ */ jsx(ErrorBoundary, {
              children: /* @__PURE__ */ jsx(Button, {
                size: "sm",
                loading,
                disabled: loading,
                // variant={installed ? "destructive" : "primary"} crashes older version because "destructive" was renamed from "danger" and there's no sane way for compat check horror
                variant: installed ? "secondary" : "primary",
                text: installed ? Strings.UNINSTALL : Strings.INSTALL,
                onPress: installOrRemove,
                icon: findAssetId(installed ? "ic_message_delete" : "DownloadIcon"),
                style: {
                  marginLeft: 8
                }
              })
            })
          ]
        });
      });
      forumPost_default = () => {
        var patches3 = [
          // actionSheetPatch(),
          installButtonPatch()
        ];
        return () => patches3.map((p) => p());
      };
    }
  });

  // src/lib/ui/components/InputAlert.tsx
  function InputAlert({ title, confirmText, confirmColor, onConfirm, cancelText, placeholder, initialValue = "", secureTextEntry }) {
    var [value, setValue] = React.useState(initialValue);
    var [error, setError] = React.useState("");
    function onConfirmWrapper() {
      var asyncOnConfirm = Promise.resolve(onConfirm(value));
      asyncOnConfirm.then(() => {
        Alerts.close();
      }).catch((e) => {
        setError(e.message);
      });
    }
    return /* @__PURE__ */ jsx(LegacyAlert, {
      title,
      confirmText,
      confirmColor,
      isConfirmButtonDisabled: error.length !== 0,
      onConfirm: onConfirmWrapper,
      cancelText,
      onCancel: () => Alerts.close(),
      children: /* @__PURE__ */ jsx(LegacyFormInput, {
        placeholder,
        value,
        onChange: (v2) => {
          setValue(typeof v2 === "string" ? v2 : v2.text);
          if (error)
            setError("");
        },
        returnKeyType: "done",
        onSubmitEditing: onConfirmWrapper,
        error: error || void 0,
        secureTextEntry,
        autoFocus: true,
        showBorder: true,
        style: {
          alignSelf: "stretch"
        }
      })
    });
  }
  var Alerts;
  var init_InputAlert = __esm({
    "src/lib/ui/components/InputAlert.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_components();
      init_wrappers();
      Alerts = findByPropsLazy("openLazy", "close");
    }
  });

  // src/core/vendetta/alerts.ts
  function showConfirmationAlert(options) {
    var internalOptions = options;
    internalOptions.body = options.content;
    delete internalOptions.content;
    internalOptions.isDismissable ??= true;
    return Alerts2.show(internalOptions);
  }
  var Alerts2, showCustomAlert, showInputAlert;
  var init_alerts = __esm({
    "src/core/vendetta/alerts.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_wrappers();
      init_InputAlert();
      Alerts2 = findByPropsLazy("openLazy", "close");
      showCustomAlert = (component, props) => Alerts2.openLazy({
        importer: () => _async_to_generator(function* () {
          return () => React.createElement(component, props);
        })()
      });
      showInputAlert = (options) => showCustomAlert(InputAlert, options);
    }
  });

  // src/core/plugins/quickinstall/url.tsx
  function typeFromUrl(url2) {
    if (url2.startsWith(VD_PROXY_PREFIX)) {
      return "plugin";
    } else if (url2.endsWith(".json") && isThemeSupported()) {
      return "theme";
    }
  }
  function installWithToast(type, url2) {
    (type === "plugin" ? VdPluginManager.installPlugin.bind(VdPluginManager) : installTheme)(url2).then(() => {
      showToast(Strings.SUCCESSFULLY_INSTALLED, findAssetId("Check"));
    }).catch((e) => {
      showToast(e.message, findAssetId("Small"));
    });
  }
  var import_react_native15, showSimpleActionSheet, handleClick, getChannelId, getChannel, url_default;
  var init_url = __esm({
    "src/core/plugins/quickinstall/url.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_i18n();
      init_alerts();
      init_plugins();
      init_themes();
      init_assets();
      init_loader();
      init_patcher();
      init_constants();
      init_lazy();
      init_common();
      init_filters();
      init_finders();
      init_wrappers();
      init_toasts();
      import_react_native15 = __toESM(require_react_native());
      showSimpleActionSheet = findExports(byMutableProp("showSimpleActionSheet"));
      handleClick = findByPropsLazy("handleClick");
      ({ getChannelId } = lazyDestructure(() => channels));
      ({ getChannel } = lazyDestructure(() => findByProps("getChannel")));
      url_default = () => {
        var patches3 = new Array();
        patches3.push(after("showSimpleActionSheet", showSimpleActionSheet, (args) => {
          if (args[0].key !== "LongPressUrl")
            return;
          var { header: { title: url2 }, options } = args[0];
          var urlType = typeFromUrl(url2);
          if (!urlType)
            return;
          options.push({
            label: Strings.INSTALL_ADDON,
            onPress: () => installWithToast(urlType, url2)
          });
        }));
        patches3.push(instead("handleClick", handleClick, function(args, orig) {
          return _async_to_generator(function* () {
            var { href: url2 } = args[0];
            var urlType = typeFromUrl(url2);
            if (!urlType)
              return orig.apply(this, args);
            if (urlType === "theme" && getChannel(getChannelId())?.parent_id !== VD_THEMES_CHANNEL_ID)
              return orig.apply(this, args);
            showConfirmationAlert({
              title: Strings.HOLD_UP,
              content: formatString("CONFIRMATION_LINK_IS_A_TYPE", {
                urlType
              }),
              onConfirm: () => installWithToast(urlType, url2),
              confirmText: Strings.INSTALL,
              cancelText: Strings.CANCEL,
              secondaryConfirmText: Strings.OPEN_IN_BROWSER,
              onConfirmSecondary: () => import_react_native15.Linking.openURL(url2)
            });
          }).call(this);
        }));
        return () => patches3.forEach((p) => p());
      };
    }
  });

  // src/core/plugins/quickinstall/index.ts
  var quickinstall_exports = {};
  __export(quickinstall_exports, {
    default: () => quickinstall_default
  });
  var patches, quickinstall_default;
  var init_quickinstall = __esm({
    "src/core/plugins/quickinstall/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_plugins2();
      init_forumPost();
      init_url();
      patches = [];
      quickinstall_default = defineCorePlugin({
        manifest: {
          id: "bunny.quickinstall",
          version: "1.0.0",
          type: "plugin",
          spec: 3,
          main: "",
          display: {
            name: "QuickInstall",
            description: "Quickly install Vendetta plugins and themes",
            authors: [
              {
                name: "Vendetta Team"
              }
            ]
          }
        },
        start() {
          patches = [
            forumPost_default(),
            url_default()
          ];
        },
        stop() {
          patches.forEach((p) => p());
        }
      });
    }
  });

  // src/core/plugins/badges/index.tsx
  var badges_exports = {};
  __export(badges_exports, {
    default: () => badges_default
  });
  var useBadgesModule, badgesCache, badgeProps, pendingRequests, badges_default;
  var init_badges = __esm({
    "src/core/plugins/badges/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_patcher();
      init_jsx();
      init_metro();
      init_plugins2();
      init_common();
      useBadgesModule = findByNameLazy("useBadges", false);
      badgesCache = /* @__PURE__ */ new Map();
      badgeProps = /* @__PURE__ */ new Map();
      pendingRequests = /* @__PURE__ */ new Set();
      badges_default = defineCorePlugin({
        manifest: {
          id: "bunny.badges",
          version: "1.1.0",
          type: "plugin",
          spec: 3,
          main: "",
          display: {
            name: "Badges",
            description: "Adds badges to user's profile",
            authors: [
              {
                name: "cocobo1"
              },
              {
                name: "pylixonly"
              }
            ]
          }
        },
        start() {
          onJsxCreate("ProfileBadge", (component, ret) => {
            if (ret.props.id?.startsWith("rain-")) {
              var cachedProps = badgeProps.get(ret.props.id);
              if (cachedProps) {
                ret.props.source = cachedProps.source;
                ret.props.label = cachedProps.label;
                ret.props.id = cachedProps.id;
              }
            }
          });
          onJsxCreate("RenderedBadge", (component, ret) => {
            if (ret.props.id?.startsWith("rain-")) {
              var cachedProps = badgeProps.get(ret.props.id);
              if (cachedProps) {
                Object.assign(ret.props, cachedProps);
              }
            }
          });
          var fetchAndProcessBadges = (userId) => _async_to_generator(function* () {
            if (pendingRequests.has(userId))
              return;
            pendingRequests.add(userId);
            try {
              var [badgesRes, rolesRes] = yield Promise.all([
                fetch("https://codeberg.org/raincord/badges/raw/branch/main/badges.json"),
                fetch("https://codeberg.org/raincord/badges/raw/branch/main/assets/roles/roles.json")
              ]);
              var badgesData = yield badgesRes.json();
              var rolesData = yield rolesRes.json();
              var userBadgeData = badgesData[userId] || {
                roles: [],
                custom: []
              };
              var allBadges = [];
              if (userBadgeData.roles) {
                userBadgeData.roles.forEach((roleName) => {
                  var roleData = rolesData[roleName];
                  if (roleData) {
                    allBadges.push({
                      label: roleData.label,
                      url: roleData.url
                    });
                  }
                });
              }
              if (userBadgeData.custom) {
                allBadges.push(...userBadgeData.custom);
              }
              badgesCache.set(userId, allBadges);
              allBadges.forEach((badge, i) => {
                var badgeId = `rain-${userId}-${i}`;
                badgeProps.set(badgeId, {
                  id: badgeId,
                  source: {
                    uri: badge.url
                  },
                  label: badge.label,
                  userId
                });
              });
              FluxDispatcher.dispatch({
                type: "USER_UPDATE",
                user: {
                  id: userId
                }
              });
            } finally {
              pendingRequests.delete(userId);
            }
          })();
          after("default", useBadgesModule, ([user], result) => {
            if (!user)
              return;
            var userId = user.userId;
            var cached = badgesCache.get(userId);
            if (!cached) {
              if (!pendingRequests.has(userId)) {
                fetchAndProcessBadges(userId);
              }
              return;
            }
            cached.forEach((badge, i) => {
              var badgeId = `rain-${userId}-${i}`;
              result.unshift({
                id: badgeId,
                description: badge.label,
                icon: " _"
              });
            });
          });
        }
      });
    }
  });

  // src/core/plugins/notrack/index.ts
  var notrack_exports = {};
  __export(notrack_exports, {
    default: () => notrack_default
  });
  function patchNetwork() {
    var analyticsTest = /client-analytics\.braintreegateway\.com|discord\.com\/api\/v9\/(science|track)|app\.adjust\..*|.*\.ingest\.sentry\.io/;
    try {
      var unpatch = instead("send", XMLHttpRequest.prototype, function(args, orig) {
        if (this.__sentry_xhr__?.url && analyticsTest.test(this.__sentry_xhr__.url)) {
          return void 0;
        }
        return orig.apply(this, args);
      });
      return unpatch;
    } catch (e) {
      return () => false;
    }
  }
  function patchConsole() {
    var sentrified = {};
    try {
      Object.keys(console).forEach((key) => {
        var consoleFunc = console[key];
        if (consoleFunc) {
          sentrified[key] = consoleFunc;
          var originalFunc = consoleFunc.__sentry_original__;
          console[key] = originalFunc ?? consoleFunc;
        }
      });
    } catch (e) {
      logger.log("Failed to de-sentrify console functions!", e);
    }
    return () => {
      Object.keys(sentrified).forEach((key) => {
        if (sentrified[key]) {
          console[key] = sentrified[key];
        }
      });
    };
  }
  function patchMiscellaneous() {
    var miscPatches = [
      // Global analytics utilities
      AnalyticsUtils?.AnalyticsActionHandlers && noop("handleTrack", AnalyticsUtils.AnalyticsActionHandlers),
      AnalyticsUtils?.AnalyticsActionHandlers && noop("handleFingerprint", AnalyticsUtils.AnalyticsActionHandlers),
      // Super properties tracking
      SuperPropUtils && noop("track", SuperPropUtils),
      // Voice state metadata tracking
      VoiceStateUtils && noop("trackWithMetadata", VoiceStateUtils),
      // Crash reporter
      CrashReportUtils && noop("submitLiveCrashReport", CrashReportUtils),
      // Metrics
      MetricsUtils?._metrics && noop("push", MetricsUtils._metrics)
    ].filter(Boolean);
    return () => miscPatches.forEach((p) => p());
  }
  function patchSentry() {
    var sentryPatches = [];
    if (Sentry.initializer) {
      sentryPatches.push(noop("initSentry", Sentry.initializer));
    }
    if (Sentry.main && Sentry.main.addBreadcrumb) {
      sentryPatches.push(noop("addBreadcrumb", Sentry.main));
    }
    if (Sentry.client) {
      try {
        Sentry.client.getOptions().enabled = false;
        Sentry.client.close();
        if (Sentry.main) {
          if (Sentry.main.getStackTop) {
            Sentry.main.getStackTop().scope.clear();
          }
          if (Sentry.main.getScope) {
            Sentry.main.getScope().clear();
          }
        }
      } catch (e) {
      }
    }
    return () => {
      try {
        sentryPatches.forEach((p) => p());
        if (Sentry.client) {
          Sentry.client.getOptions().enabled = true;
          Sentry.client.open();
        }
      } catch (e) {
      }
    };
  }
  var patches2, AnalyticsUtils, SuperPropUtils, VoiceStateUtils, CrashReportUtils, MetricsUtils, sentryGlobal, sentryHub, sentryClient, Sentry, noop, notrack_default;
  var init_notrack = __esm({
    "src/core/plugins/notrack/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_plugins2();
      init_metro();
      init_patcher();
      init_logger();
      patches2 = [];
      AnalyticsUtils = findByProps("AnalyticsActionHandlers");
      SuperPropUtils = findByProps("encodeProperties", "track");
      VoiceStateUtils = findByProps("getVoiceStateMetadata");
      CrashReportUtils = findByProps("submitLiveCrashReport");
      MetricsUtils = findByProps("_metrics");
      sentryGlobal = globalThis.__SENTRY__;
      sentryHub = sentryGlobal?.hub;
      sentryClient = sentryHub?.getClient();
      Sentry = {
        initializer: findByProps("initSentry"),
        main: sentryHub,
        client: sentryClient
      };
      noop = (prop, parent) => {
        try {
          return instead(prop, parent, () => void 0);
        } catch (e) {
          return () => false;
        }
      };
      notrack_default = defineCorePlugin({
        manifest: {
          id: "bunny.notrack",
          version: "1.0.0",
          type: "plugin",
          spec: 3,
          main: "",
          display: {
            name: "NoTrack",
            description: "Disables Discord's telemetry",
            authors: [
              {
                name: "maisymoe"
              }
            ]
          }
        },
        start() {
          patches2 = [
            patchNetwork(),
            patchConsole(),
            patchMiscellaneous(),
            patchSentry()
          ].filter(Boolean);
          logger.log("NoTrack: Enabled - all telemetry tracking disabled");
        },
        stop() {
          patches2.forEach((p) => p?.());
          patches2 = [];
          logger.log("NoTrack: Disabled - telemetry tracking restored");
        }
      });
    }
  });

  // src/core/plugins/messagefix/index.ts
  var messagefix_exports = {};
  __export(messagefix_exports, {
    default: () => messagefix_default
  });
  var MessageActions, originalSendMessage, messagefix_default;
  var init_messagefix = __esm({
    "src/core/plugins/messagefix/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_plugins2();
      init_metro();
      init_logger();
      MessageActions = findByProps("sendMessage");
      messagefix_default = defineCorePlugin({
        manifest: {
          id: "bunny.messagefix",
          version: "1.0.0",
          type: "plugin",
          spec: 3,
          main: "",
          display: {
            name: "MessageFix",
            description: "Ensures messages include the required nonce parameter",
            authors: [
              {
                name: "Win8.1VMUser"
              },
              {
                name: "kmmiio99o.dev"
              }
            ]
          }
        },
        start() {
          originalSendMessage = MessageActions.sendMessage;
          MessageActions.sendMessage = function(channelId, message, replyRef, options) {
            options = options || {};
            options.nonce = options.nonce || (BigInt(Date.now() - 14200704e5) << 22n).toString();
            return originalSendMessage.call(this, channelId, message, replyRef, options);
          };
          logger.log("MessageFix: Enabled - adding nonce to all messages");
        },
        stop() {
          if (originalSendMessage)
            MessageActions.sendMessage = originalSendMessage;
          logger.log("MessageFix: Disabled");
        }
      });
    }
  });

  // src/core/plugins/index.ts
  function defineCorePlugin(instance) {
    instance[Symbol.for("bunny.core.plugin")] = true;
    return instance;
  }
  var getCorePlugins;
  var init_plugins2 = __esm({
    "src/core/plugins/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      getCorePlugins = () => ({
        "bunny.quickinstall": (init_quickinstall(), __toCommonJS(quickinstall_exports)),
        "bunny.badges": (init_badges(), __toCommonJS(badges_exports)),
        "bunny.notrack": (init_notrack(), __toCommonJS(notrack_exports)),
        "bunny.messagefix": (init_messagefix(), __toCommonJS(messagefix_exports))
      });
    }
  });

  // src/lib/api/commands/types.ts
  var ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType;
  var init_types = __esm({
    "src/lib/api/commands/types.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      ApplicationCommandInputType = /* @__PURE__ */ function(ApplicationCommandInputType2) {
        ApplicationCommandInputType2[ApplicationCommandInputType2["BUILT_IN"] = 0] = "BUILT_IN";
        ApplicationCommandInputType2[ApplicationCommandInputType2["BUILT_IN_TEXT"] = 1] = "BUILT_IN_TEXT";
        ApplicationCommandInputType2[ApplicationCommandInputType2["BUILT_IN_INTEGRATION"] = 2] = "BUILT_IN_INTEGRATION";
        ApplicationCommandInputType2[ApplicationCommandInputType2["BOT"] = 3] = "BOT";
        ApplicationCommandInputType2[ApplicationCommandInputType2["PLACEHOLDER"] = 4] = "PLACEHOLDER";
        return ApplicationCommandInputType2;
      }({});
      ApplicationCommandOptionType = /* @__PURE__ */ function(ApplicationCommandOptionType2) {
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["SUB_COMMAND"] = 1] = "SUB_COMMAND";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["SUB_COMMAND_GROUP"] = 2] = "SUB_COMMAND_GROUP";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["STRING"] = 3] = "STRING";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["INTEGER"] = 4] = "INTEGER";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["BOOLEAN"] = 5] = "BOOLEAN";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["USER"] = 6] = "USER";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["CHANNEL"] = 7] = "CHANNEL";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["ROLE"] = 8] = "ROLE";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["MENTIONABLE"] = 9] = "MENTIONABLE";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["NUMBER"] = 10] = "NUMBER";
        ApplicationCommandOptionType2[ApplicationCommandOptionType2["ATTACHMENT"] = 11] = "ATTACHMENT";
        return ApplicationCommandOptionType2;
      }({});
      ApplicationCommandType = /* @__PURE__ */ function(ApplicationCommandType2) {
        ApplicationCommandType2[ApplicationCommandType2["CHAT"] = 1] = "CHAT";
        ApplicationCommandType2[ApplicationCommandType2["USER"] = 2] = "USER";
        ApplicationCommandType2[ApplicationCommandType2["MESSAGE"] = 3] = "MESSAGE";
        return ApplicationCommandType2;
      }({});
    }
  });

  // src/core/commands/eval.ts
  var eval_exports = {};
  __export(eval_exports, {
    default: () => eval_default
  });
  function wrapInJSCodeblock(resString) {
    return "```js\n" + resString.replaceAll("`", "`" + ZERO_WIDTH_SPACE_CHARACTER) + "\n```";
  }
  var util, AsyncFunction, ZERO_WIDTH_SPACE_CHARACTER, eval_default;
  var init_eval = __esm({
    "src/core/commands/eval.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_i18n();
      init_types();
      init_settings();
      init_common();
      init_wrappers();
      util = findByPropsLazy("inspect");
      AsyncFunction = (() => _async_to_generator(function* () {
        return void 0;
      })()).constructor;
      ZERO_WIDTH_SPACE_CHARACTER = "\u200B";
      eval_default = () => ({
        name: "eval",
        description: Strings.COMMAND_EVAL_DESC,
        shouldHide: () => settings.enableEvalCommand === true,
        options: [
          {
            name: "code",
            type: ApplicationCommandOptionType.STRING,
            description: Strings.COMMAND_EVAL_OPT_CODE,
            required: true
          },
          {
            name: "async",
            type: ApplicationCommandOptionType.BOOLEAN,
            description: Strings.COMMAND_EVAL_OPT_ASYNC
          }
        ],
        execute(_0, _1) {
          return _async_to_generator(function* ([code, async], ctx) {
            try {
              var res = util.inspect(async?.value ? yield AsyncFunction(code.value)() : eval?.(code.value));
              var trimmedRes = res.length > 2e3 ? res.slice(0, 2e3) + "..." : res;
              messageUtil.sendBotMessage(ctx.channel.id, wrapInJSCodeblock(trimmedRes));
            } catch (err) {
              messageUtil.sendBotMessage(ctx.channel.id, wrapInJSCodeblock(err?.stack ?? err));
            }
          }).apply(this, arguments);
        }
      });
    }
  });

  // src/lib/api/debug.ts
  var debug_exports = {};
  __export(debug_exports, {
    connectRdt: () => connectRdt,
    connectToDebugger: () => connectToDebugger2,
    disconnectFromDebugger: () => disconnectFromDebugger2,
    disconnectRdt: () => disconnectRdt,
    getDebugInfo: () => getDebugInfo,
    initDebugger: () => initDebugger,
    isConnectedToDebugger: () => isConnectedToDebugger2,
    patchLogHook: () => patchLogHook,
    rdtClient: () => rdtClient,
    rdtConnected: () => rdtConnected,
    toggleSafeMode: () => toggleSafeMode,
    useIsRdtConnected: () => useIsRdtConnected,
    versionHash: () => versionHash
  });
  function toggleSafeMode() {
    return _async_to_generator(function* () {
      settings.safeMode = {
        ...settings.safeMode,
        enabled: !settings.safeMode?.enabled
      };
      if (isThemeSupported()) {
        if (getThemeFromLoader()?.id)
          settings.safeMode.currentThemeId = getThemeFromLoader().id;
        if (settings.safeMode?.enabled) {
          yield selectTheme(null);
        } else if (settings.safeMode?.currentThemeId) {
          yield selectTheme(themes[settings.safeMode?.currentThemeId]);
        }
      }
      setTimeout(BundleUpdaterManager.reload, 400);
    })();
  }
  function serializeMessage2(msg) {
    return JSON.stringify(msg);
  }
  function sendLog2(level, ...args) {
    if (socket2?.readyState === WebSocket.OPEN) {
      var message = {
        type: "log",
        data: {
          level,
          message: args
        }
      };
      socket2.send(serializeMessage2(message));
    }
  }
  function patchConsoleAndLogger2() {
    originalConsoleLog2 = console.log;
    console.log = function(...args) {
      originalConsoleLog2.apply(console, args);
      sendLog2("default", ...args);
    };
    originalConsoleError2 = console.error;
    console.error = function(...args) {
      originalConsoleError2.apply(console, args);
      sendLog2("error", ...args);
    };
    originalConsoleWarn2 = console.warn;
    console.warn = function(...args) {
      originalConsoleWarn2.apply(console, args);
      sendLog2("warn", ...args);
    };
    if (logger) {
      originalLoggerLog2 = logger.log;
      logger.log = function(...args) {
        originalLoggerLog2.apply(logger, args);
        sendLog2("default", ...args);
      };
      originalLoggerError2 = logger.error;
      logger.error = function(...args) {
        originalLoggerError2.apply(logger, args);
        sendLog2("error", ...args);
      };
      originalLoggerWarn2 = logger.warn;
      logger.warn = function(...args) {
        originalLoggerWarn2.apply(logger, args);
        sendLog2("warn", ...args);
      };
    }
  }
  function unpatchConsoleAndLogger2() {
    if (originalConsoleLog2) {
      console.log = originalConsoleLog2;
      originalConsoleLog2 = void 0;
    }
    if (originalConsoleError2) {
      console.error = originalConsoleError2;
      originalConsoleError2 = void 0;
    }
    if (originalConsoleWarn2) {
      console.warn = originalConsoleWarn2;
      originalConsoleWarn2 = void 0;
    }
    if (logger) {
      if (originalLoggerLog2) {
        logger.log = originalLoggerLog2;
        originalLoggerLog2 = void 0;
      }
      if (originalLoggerError2) {
        logger.error = originalLoggerError2;
        originalLoggerError2 = void 0;
      }
      if (originalLoggerWarn2) {
        logger.warn = originalLoggerWarn2;
        originalLoggerWarn2 = void 0;
      }
    }
  }
  function connectToDebugger2(url2) {
    if (socket2 !== void 0 && socket2.readyState !== WebSocket.CLOSED) {
      unpatchConsoleAndLogger2();
      socket2.close();
    }
    if (!url2) {
      showToast("Invalid debugger URL!", findAssetId("Small"));
      return;
    }
    try {
      socket2 = new WebSocket(`ws://${url2}`);
      socket2.addEventListener("open", () => {
        showToast("Connected to debugger.", findAssetId("Check"));
        var hello = {
          type: "hello",
          data: {
            version: VERSION2
          }
        };
        socket2?.send(serializeMessage2(hello));
        patchConsoleAndLogger2();
      });
      socket2.addEventListener("message", (message) => {
        try {
          var data = JSON.parse(message.data);
          if (data.type === "run" && data.data?.code) {
            try {
              (0, eval)(data.data.code);
            } catch (e) {
              console.error("Error executing remote code:", e);
            }
          }
        } catch (e) {
          try {
            (0, eval)(message.data);
          } catch (err) {
            console.error(err);
          }
        }
      });
      socket2.addEventListener("close", () => {
        showToast("Disconnected from debugger.", findAssetId("Small"));
        unpatchConsoleAndLogger2();
      });
      socket2.addEventListener("error", (err) => {
        console.log(`Debugger error: ${err.message}`);
        showToast("An error occurred with the debugger connection!", findAssetId("Small"));
        unpatchConsoleAndLogger2();
      });
    } catch (e) {
      logger.error("Failed to connect to debugger:", e);
      showToast("Failed to connect to debugger!", findAssetId("Small"));
    }
  }
  function disconnectFromDebugger2() {
    if (socket2) {
      unpatchConsoleAndLogger2();
      socket2.close();
      socket2 = void 0;
      showToast("Disconnected from debugger.", findAssetId("Check"));
    }
  }
  function isConnectedToDebugger2() {
    return socket2?.readyState === WebSocket.OPEN;
  }
  function bump() {
    for (var x2 of changeHooks)
      x2(rdtConnected);
  }
  function cleanupRdt() {
    rdtClient = null;
    rdtConnected = false;
    bump();
  }
  function connectRdt(url2, quiet) {
    if (!isReactDevToolsPreloaded() || rdtClient)
      return;
    var base = url2.split(":").slice(0, -1).join(":");
    var ws = rdtClient = new WebSocket(`ws://${base}:${rdtPort}`);
    ws.addEventListener("open", () => {
      if (!quiet)
        showToast("Connected to React DevTools", findAssetId("CheckmarkSmallIcon"));
      rdtConnected = true;
      bump();
    });
    ws.addEventListener("close", () => {
      cleanupRdt();
    });
    ws.addEventListener("error", (e) => {
      cleanupRdt();
      var err = e?.message ?? e?.stack ?? String(e);
      logger.error("React DevTools error:", err);
      if (!quiet)
        showToast(err, findAssetId("CircleXIcon-primary"));
    });
    var devTools = globalThis[getReactDevToolsProp() || "__vendetta_rdc"];
    if (devTools?.connectToDevTools) {
      devTools.connectToDevTools({
        websocket: ws,
        resolveRNStyle: import_react_native16.StyleSheet.flatten
      });
    }
  }
  function disconnectRdt() {
    rdtClient?.close();
  }
  function useIsRdtConnected() {
    var [connected, update] = React.useState(rdtConnected);
    React.useEffect(() => {
      changeHooks.add(update);
      return () => void changeHooks.delete(update);
    }, []);
    return connected;
  }
  function patchLogHook() {
    var unpatch = after("nativeLoggingHook", globalThis, (args) => {
      if (socket2?.readyState === WebSocket.OPEN) {
        sendLog2(args[1] === "error" ? "error" : args[1] === "warn" ? "warn" : "default", args[0]);
      }
      logger.log(args[0]);
    });
    return () => {
      socket2 && socket2.close();
      unpatch();
    };
  }
  function getDebugInfo() {
    var hermesProps = globalThis.HermesInternal.getRuntimeProperties();
    var hermesVer = hermesProps["OSS Release Version"];
    var padding = "for RN ";
    var PlatformConstants = import_react_native16.Platform.constants;
    var rnVer = PlatformConstants.reactNativeVersion;
    return {
      vendetta: {
        version: versionHash.split("-")[0],
        loader: getLoaderName()
      },
      bunny: {
        version: versionHash,
        loader: {
          name: getLoaderName(),
          version: getLoaderVersion()
        }
      },
      discord: {
        version: NativeClientInfoModule.getConstants().Version,
        build: NativeClientInfoModule.getConstants().Build
      },
      react: {
        version: React.version,
        nativeVersion: hermesVer.startsWith(padding) ? hermesVer.substring(padding.length) : `${rnVer.major}.${rnVer.minor}.${rnVer.patch}`
      },
      hermes: {
        version: hermesVer,
        buildType: hermesProps.Build,
        bytecodeVersion: hermesProps["Bytecode Version"]
      },
      ...import_react_native16.Platform.select({
        android: {
          os: {
            name: "Android",
            version: PlatformConstants.Release,
            sdk: PlatformConstants.Version
          }
        },
        ios: {
          os: {
            name: PlatformConstants.systemName,
            version: PlatformConstants.osVersion
          }
        }
      }),
      ...import_react_native16.Platform.select({
        android: {
          device: {
            manufacturer: PlatformConstants.Manufacturer,
            brand: PlatformConstants.Brand,
            model: PlatformConstants.Model,
            codename: NativeDeviceModule.device
          }
        },
        ios: {
          device: {
            manufacturer: NativeDeviceModule.deviceManufacturer,
            brand: NativeDeviceModule.deviceBrand,
            model: NativeDeviceModule.deviceModel,
            codename: NativeDeviceModule.device
          }
        }
      })
    };
  }
  function initDebugger() {
    if (settings.autoDebugger) {
      try {
        connectToDebugger2(settings.debuggerUrl);
      } catch (e) {
        logger.error("Failed to connect to Debugger during startup:", e);
      }
    }
    if (settings.autoDevTools) {
      try {
        if (settings.devToolsUrl) {
          connectRdt(settings.devToolsUrl, true);
        }
      } catch (e) {
        logger.error("Failed to connect to ReactDevTools during startup:", e);
      }
    }
  }
  var import_react_native16, socket2, originalConsoleLog2, originalConsoleError2, originalConsoleWarn2, originalLoggerLog2, originalLoggerError2, originalLoggerWarn2, VERSION2, rdtPort, rdtClient, rdtConnected, changeHooks, versionHash;
  var init_debug = __esm({
    "src/lib/api/debug.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_themes();
      init_assets();
      init_loader();
      init_modules();
      init_patcher();
      init_settings();
      init_logger();
      init_toasts();
      import_react_native16 = __toESM(require_react_native());
      VERSION2 = 1;
      rdtPort = 8097;
      rdtClient = null;
      rdtConnected = false;
      changeHooks = /* @__PURE__ */ new Set();
      versionHash = "v1.4.3";
    }
  });

  // src/core/commands/debug.ts
  var debug_exports2 = {};
  __export(debug_exports2, {
    default: () => debug_default
  });
  var debug_default;
  var init_debug2 = __esm({
    "src/core/commands/debug.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_i18n();
      init_types();
      init_debug();
      init_common();
      debug_default = () => ({
        name: "debug",
        description: Strings.COMMAND_DEBUG_DESC,
        options: [
          {
            name: "ephemeral",
            type: ApplicationCommandOptionType.BOOLEAN,
            description: Strings.COMMAND_DEBUG_OPT_EPHEMERALLY
          }
        ],
        execute([ephemeral], ctx) {
          var info = getDebugInfo();
          if (info.device.codename === void 0) {
            info.device.codename = "";
          } else {
            info.device.codename = "(" + info.device.codename + ")";
          }
          var content = [
            "**CloudCord Debug Info**",
            `> CloudCord: ${info.bunny.version} (${info.bunny.loader.name} ${info.bunny.loader.version})`,
            `> Discord: ${info.discord.version} (${info.discord.build})`,
            `> React: ${info.react.version} (RN ${info.react.nativeVersion})`,
            `> Hermes: ${info.hermes.version} (bcv${info.hermes.bytecodeVersion})`,
            `> System: ${info.os.name} ${info.os.version} ${info.os.sdk ? `(SDK ${info.os.sdk})` : ""}`.trimEnd(),
            `> Device: ${info.device.model} ${info.device.codename}`
          ].join("\n");
          if (ephemeral?.value) {
            messageUtil.sendBotMessage(ctx.channel.id, content);
          } else {
            var fixNonce = (BigInt(Date.now() - 14200704e5) << 22n).toString();
            messageUtil.sendMessage(ctx.channel.id, {
              content
            }, void 0, {
              nonce: fixNonce
            });
          }
        }
      });
    }
  });

  // src/core/commands/plugins.ts
  var plugins_exports = {};
  __export(plugins_exports, {
    default: () => plugins_default
  });
  var plugins_default;
  var init_plugins3 = __esm({
    "src/core/commands/plugins.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_i18n();
      init_plugins();
      init_types();
      init_common();
      plugins_default = () => ({
        name: "plugins",
        description: Strings.COMMAND_PLUGINS_DESC,
        options: [
          {
            name: "ephemeral",
            displayName: "ephemeral",
            type: ApplicationCommandOptionType.BOOLEAN,
            description: Strings.COMMAND_DEBUG_OPT_EPHEMERALLY
          }
        ],
        execute([ephemeral], ctx) {
          var plugins2 = Object.values(VdPluginManager.plugins).filter(Boolean);
          plugins2.sort((a, b3) => a.manifest.name.localeCompare(b3.manifest.name));
          var enabled = plugins2.filter((p) => p.enabled).map((p) => p.manifest.name);
          var disabled = plugins2.filter((p) => !p.enabled).map((p) => p.manifest.name);
          var content = [
            `**Installed Plugins (${plugins2.length}):**`,
            ...enabled.length > 0 ? [
              `Enabled (${enabled.length}):`,
              "> " + enabled.join(", ")
            ] : [],
            ...disabled.length > 0 ? [
              `Disabled (${disabled.length}):`,
              "> " + disabled.join(", ")
            ] : []
          ].join("\n");
          if (ephemeral?.value) {
            messageUtil.sendBotMessage(ctx.channel.id, content);
          } else {
            var fixNonce = (BigInt(Date.now() - 14200704e5) << 22n).toString();
            messageUtil.sendMessage(ctx.channel.id, {
              content
            }, void 0, {
              nonce: fixNonce
            });
          }
        }
      });
    }
  });

  // src/lib/api/commands/index.ts
  var commands_exports = {};
  __export(commands_exports, {
    patchCommands: () => patchCommands,
    registerCommand: () => registerCommand
  });
  function patchCommands() {
    var unpatch = after("getBuiltInCommands", commands, ([type], res) => {
      return [
        ...res,
        ...commands2.filter((c2) => (type instanceof Array ? type.includes(c2.type) : type === c2.type) && c2.__bunny?.shouldHide?.() !== false)
      ];
    });
    [
      (init_eval(), __toCommonJS(eval_exports)),
      (init_debug2(), __toCommonJS(debug_exports2)),
      (init_plugins3(), __toCommonJS(plugins_exports))
    ].forEach((r) => registerCommand(r.default()));
    return () => {
      commands2 = [];
      unpatch();
    };
  }
  function registerCommand(command) {
    var builtInCommands;
    try {
      builtInCommands = commands.getBuiltInCommands(ApplicationCommandType.CHAT, true, false);
    } catch (e) {
      builtInCommands = commands.getBuiltInCommands(Object.values(ApplicationCommandType), true, false);
    }
    builtInCommands.sort((a, b3) => parseInt(b3.id) - parseInt(a.id));
    var lastCommand = builtInCommands[builtInCommands.length - 1];
    command.id = (parseInt(lastCommand.id, 10) - 1).toString();
    command.__bunny = {
      shouldHide: command.shouldHide
    };
    command.applicationId ??= "-1";
    command.type ??= ApplicationCommandType.CHAT;
    command.inputType = ApplicationCommandInputType.BUILT_IN;
    command.displayName ??= command.name;
    command.untranslatedName ??= command.name;
    command.displayDescription ??= command.description;
    command.untranslatedDescription ??= command.description;
    if (command.options)
      for (var opt of command.options) {
        opt.displayName ??= opt.name;
        opt.displayDescription ??= opt.description;
      }
    instead("execute", command, (args, orig) => {
      Promise.resolve(orig.apply(command, args)).then((ret) => {
        if (ret && typeof ret === "object") {
          messageUtil.sendMessage(args[1].channel.id, ret);
        }
      }).catch((err) => {
        logger.error("Failed to execute command", err);
      });
    });
    commands2.push(command);
    return () => commands2 = commands2.filter(({ id }) => id !== command.id);
  }
  var commands2;
  var init_commands = __esm({
    "src/lib/api/commands/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_types();
      init_patcher();
      init_logger();
      init_common();
      commands2 = [];
    }
  });

  // src/lib/api/flux/index.ts
  var flux_exports = {};
  __export(flux_exports, {
    dispatcher: () => dispatcher,
    injectFluxInterceptor: () => injectFluxInterceptor,
    intercept: () => intercept
  });
  function injectFluxInterceptor() {
    var cb = (payload) => {
      for (var intercept2 of intercepts) {
        var res = intercept2(payload);
        if (res == null) {
          continue;
        } else if (!res) {
          payload[blockedSym] = true;
        } else if (typeof res === "object") {
          Object.assign(payload, res);
          payload[modifiedSym] = true;
        }
      }
      return blockedSym in payload;
    };
    (dispatcher._interceptors ??= []).unshift(cb);
    return () => dispatcher._interceptors &&= dispatcher._interceptors.filter((v2) => v2 !== cb);
  }
  function intercept(cb) {
    intercepts.push(cb);
    return () => {
      intercepts = intercepts.filter((i) => i !== cb);
    };
  }
  var blockedSym, modifiedSym, dispatcher, intercepts;
  var init_flux = __esm({
    "src/lib/api/flux/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_common();
      blockedSym = Symbol.for("bunny.flux.blocked");
      modifiedSym = Symbol.for("bunny.flux.modified");
      dispatcher = FluxDispatcher;
      intercepts = [];
    }
  });

  // src/lib/api/native/index.ts
  var native_exports = {};
  __export(native_exports, {
    fs: () => fs_exports
  });
  var init_native = __esm({
    "src/lib/api/native/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_fs();
    }
  });

  // src/lib/api/react/index.ts
  var react_exports = {};
  __export(react_exports, {
    jsx: () => jsx_exports
  });
  var init_react = __esm({
    "src/lib/api/react/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsx();
    }
  });

  // src/lib/api/index.ts
  var api_exports = {};
  __export(api_exports, {
    assets: () => assets_exports,
    commands: () => commands_exports,
    debug: () => debug_exports,
    flux: () => flux_exports,
    native: () => native_exports,
    patcher: () => patcher_exports,
    react: () => react_exports,
    settings: () => settings_exports,
    storage: () => storage_exports
  });
  var init_api = __esm({
    "src/lib/api/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_assets();
      init_commands();
      init_debug();
      init_flux();
      init_native();
      init_patcher();
      init_react();
      init_settings();
      init_storage2();
    }
  });

  // src/lib/addons/plugins/api.ts
  function shimDisposableFn(unpatches, f) {
    var dummy = (...props) => {
      var up = f(...props);
      unpatches.push(up);
      return up;
    };
    for (var key in f)
      if (typeof f[key] === "function") {
        dummy[key] = shimDisposableFn(unpatches, f[key]);
      }
    return dummy;
  }
  function createBunnyPluginApi(id) {
    var disposers = new Array();
    var object = {
      ...globalThis.bunny,
      api: {
        ...globalThis.bunny.api,
        patcher: {
          before: shimDisposableFn(disposers, patcher_exports.before),
          after: shimDisposableFn(disposers, patcher_exports.after),
          instead: shimDisposableFn(disposers, patcher_exports.instead)
        },
        commands: {
          ...globalThis.bunny.api.commands,
          registerCommand: shimDisposableFn(disposers, registerCommand)
        },
        flux: {
          ...globalThis.bunny.api.flux,
          intercept: shimDisposableFn(disposers, globalThis.bunny.api.flux.intercept)
        }
      },
      // Added something in here? Make sure to also update BunnyPluginProperty in ./types
      plugin: {
        createStorage: () => createStorage2(`plugins/storage/${id}.json`),
        manifest: registeredPlugins.get(id),
        logger
      }
    };
    return {
      object,
      disposers
    };
  }
  var init_api2 = __esm({
    "src/lib/addons/plugins/api.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_api();
      init_commands();
      init_storage2();
      init_logger();
      init_plugins4();
    }
  });

  // src/lib/addons/plugins/index.ts
  var plugins_exports2 = {};
  __export(plugins_exports2, {
    apiObjects: () => apiObjects,
    corePluginInstances: () => corePluginInstances,
    deleteRepository: () => deleteRepository,
    disablePlugin: () => disablePlugin,
    enablePlugin: () => enablePlugin,
    getPluginSettingsComponent: () => getPluginSettingsComponent,
    initPlugins: () => initPlugins,
    installPlugin: () => installPlugin,
    isCorePlugin: () => isCorePlugin,
    isGreaterVersion: () => isGreaterVersion,
    isPluginEnabled: () => isPluginEnabled,
    isPluginInstalled: () => isPluginInstalled,
    pluginInstances: () => pluginInstances,
    pluginRepositories: () => pluginRepositories,
    pluginSettings: () => pluginSettings,
    refreshPlugin: () => refreshPlugin,
    registeredPlugins: () => registeredPlugins,
    startPlugin: () => startPlugin,
    stopPlugin: () => stopPlugin,
    uninstallPlugin: () => uninstallPlugin,
    updateAllRepository: () => updateAllRepository,
    updateAndWritePlugin: () => updateAndWritePlugin,
    updatePlugins: () => updatePlugins,
    updateRepository: () => updateRepository
  });
  function assert(condition, id, attempt) {
    if (!condition)
      throw new Error(`[${id}] Attempted to ${attempt}`);
  }
  function isGreaterVersion(v1, v2) {
    if (semver.gt(v1, v2))
      return true;
    var coerced = semver.coerce(v1);
    if (coerced == null)
      return false;
    return semver.prerelease(v1)?.includes("dev") && semver.eq(coerced, v2);
  }
  function isExternalPlugin(manifest) {
    return "parentRepository" in manifest;
  }
  function isCorePlugin(id) {
    return corePluginInstances.has(id);
  }
  function getPluginSettingsComponent(id) {
    var instance = pluginInstances.get(id);
    if (!instance)
      return null;
    if (instance.SettingsComponent)
      return instance.SettingsComponent;
    return null;
  }
  function isPluginInstalled(id) {
    return pluginSettings[id] != null;
  }
  function isPluginEnabled(id) {
    return Boolean(pluginSettings[id]?.enabled);
  }
  function updateAndWritePlugin(repoUrl, id, fetchScript) {
    return _async_to_generator(function* () {
      var manifest = yield fetchJSON(repoUrl, `builds/${id}/manifest.json`);
      manifest.parentRepository = repoUrl;
      if (fetchScript) {
        manifest.jsPath = `plugins/scripts/${id}.js`;
        var js = yield fetchJS(repoUrl, `builds/${id}/index.js`);
        yield writeFile(manifest.jsPath, js);
      }
      yield updateStorage(`plugins/manifests/${id}.json`, manifest);
      if (registeredPlugins.has(id)) {
        var existingManifest = registeredPlugins.get(id);
        return Object.assign(existingManifest, manifest);
      }
      return manifest;
    })();
  }
  function refreshPlugin(id, repoUrl) {
    return _async_to_generator(function* () {
      var manifest = registeredPlugins.get(id);
      assert(manifest, id, "refresh a non-registered plugin");
      assert(pluginInstances.get(id), id, "refresh a non-started plugin");
      stopPlugin(id);
      if (isExternalPlugin(manifest)) {
        manifest = yield updateAndWritePlugin(repoUrl ?? manifest.parentRepository, id, true);
      }
      registeredPlugins.delete(id);
      registeredPlugins.set(id, manifest);
      yield startPlugin(id);
    })();
  }
  function updateRepository(repoUrl) {
    return _async_to_generator(function* () {
      var repo = yield fetchJSON(repoUrl, "repo.json");
      var storedRepo = pluginRepositories[repoUrl];
      var updated = false;
      if (!storedRepo) {
        for (var id in repo) {
          if (corePluginInstances.has(id)) {
            throw new Error(`Plugins can't have the same ID as any of Bunny core plugin '${id}'`);
          }
        }
        updated = true;
        pluginRepositories[repoUrl] = repo;
      } else {
        for (var plugin in storedRepo)
          if (!repo[plugin]) {
            delete storedRepo[plugin];
          }
      }
      var pluginIds = Object.keys(repo).filter((id2) => !id2.startsWith("$"));
      yield Promise.all(pluginIds.map((pluginId) => _async_to_generator(function* () {
        if (!storedRepo || !storedRepo[pluginId] || repo[pluginId].alwaysFetch || isGreaterVersion(repo[pluginId].version, storedRepo[pluginId].version)) {
          updated = true;
          pluginRepositories[repoUrl][pluginId] = repo[pluginId];
          yield updateAndWritePlugin(repoUrl, pluginId, Boolean(storedRepo && pluginSettings[pluginId]));
        } else {
          var manifest2 = yield preloadStorageIfExists(`plugins/manifests/${pluginId}.json`);
          if (!manifest2) {
            yield updateAndWritePlugin(repoUrl, pluginId, Boolean(storedRepo && pluginSettings[pluginId]));
          }
        }
      })()));
      for (var id1 of pluginIds) {
        var manifest = getPreloadedStorage(`plugins/manifests/${id1}.json`);
        if (manifest === void 0)
          continue;
        var existing = registeredPlugins.get(id1);
        if (existing && !isGreaterVersion(manifest.version, existing.version)) {
          continue;
        }
        registeredPlugins.set(id1, manifest);
      }
      return updated;
    })();
  }
  function deleteRepository(repoUrl) {
    return _async_to_generator(function* () {
      assert(repoUrl !== OFFICIAL_PLUGINS_REPO_URL, repoUrl, "delete the official repository");
      assert(pluginRepositories[repoUrl], repoUrl, "delete a non-registered repository");
      var promQueues = [];
      for (var [id, manifest] of registeredPlugins) {
        if (!isExternalPlugin(manifest) || manifest.parentRepository !== repoUrl)
          continue;
        if (isPluginInstalled(id)) {
          promQueues.push(uninstallPlugin(id));
        }
        promQueues.push(purgeStorage2(`plugins/manifests/${id}.json`));
        registeredPlugins.delete(id);
      }
      delete pluginRepositories[repoUrl];
      yield Promise.all(promQueues);
      updateAllRepository();
    })();
  }
  function enablePlugin(id, start) {
    return _async_to_generator(function* () {
      assert(isPluginInstalled(id), id, "enable a non-installed plugin");
      if (start)
        yield startPlugin(id);
      pluginSettings[id].enabled = true;
    })();
  }
  function disablePlugin(id) {
    assert(isPluginInstalled(id), id, "disable a non-installed plugin");
    pluginInstances.has(id) && stopPlugin(id);
    pluginSettings[id].enabled = false;
  }
  function installPlugin(id, start) {
    return _async_to_generator(function* () {
      var manifest = registeredPlugins.get(id);
      assert(manifest, id, "install an non-registered plugin");
      assert(!isPluginInstalled(id), id, "install an already installed plugin");
      assert(isExternalPlugin(manifest), id, "install a core plugin");
      yield updateAndWritePlugin(manifest.parentRepository, id, true);
      pluginSettings[id] = {
        enabled: true
      };
      if (start)
        startPlugin(id);
    })();
  }
  function uninstallPlugin(id) {
    return _async_to_generator(function* () {
      var manifest = registeredPlugins.get(id);
      assert(manifest, id, "uninstall an unregistered plugin");
      assert(isPluginInstalled(id), id, "uninstall a non-installed plugin");
      assert(isExternalPlugin(manifest), id, "uninstall a core plugin");
      pluginInstances.has(id) && stopPlugin(id);
      delete pluginSettings[id];
      yield purgeStorage2(`plugins/storage/${id}.json`);
      yield removeFile(`plugins/scripts/${id}.js`);
    })();
  }
  function startPlugin(_0) {
    return _async_to_generator(function* (id, { throwIfDisabled = false, disableWhenThrown = true } = {}) {
      var manifest = registeredPlugins.get(id);
      assert(manifest, id, "start a non-registered plugin");
      assert(isPluginInstalled(id), id, "start a non-installed plugin");
      assert(!throwIfDisabled || pluginSettings[id]?.enabled, id, "start a disabled plugin");
      assert(!pluginInstances.has(id), id, "start an already started plugin");
      yield preloadStorageIfExists(`plugins/storage/${id}.json`);
      var pluginInstance2;
      if (isExternalPlugin(manifest)) {
        try {
          var iife = yield readFile(manifest.jsPath);
          var instantiator = globalEvalWithSourceUrl(`(bunny,definePlugin)=>{${iife};return plugin?.default ?? plugin;}`, `bunny-plugin/${id}-${manifest.version}`);
        } catch (error) {
          throw new Error("An error occured while parsing plugin's code, possibly a syntax error?", {
            cause: error
          });
        }
        try {
          var api = createBunnyPluginApi(id);
          pluginInstance2 = instantiator(api.object, (p) => {
            return Object.assign(p, {
              manifest
            });
          });
          if (!pluginInstance2)
            throw new Error(`Plugin '${id}' does not export a valid plugin instance`);
          apiObjects.set(id, api);
          pluginInstances.set(id, pluginInstance2);
        } catch (error) {
          throw new Error("An error occured while instantiating plugin's code", {
            cause: error
          });
        }
      } else {
        pluginInstance2 = corePluginInstances.get(id);
        assert(pluginInstance2, id, "start a non-existent core plugin");
        pluginInstances.set(id, pluginInstance2);
      }
      try {
        pluginInstance2.start?.();
        pluginSettings[id].enabled = true;
      } catch (error) {
        disableWhenThrown && disablePlugin(id);
        throw new Error("An error occured while starting the plugin", {
          cause: error
        });
      }
    }).apply(this, arguments);
  }
  function stopPlugin(id) {
    var instance = pluginInstances.get(id);
    assert(instance, id, "stop a non-started plugin");
    instance.stop?.();
    var obj = apiObjects.get(id);
    obj?.disposers.forEach((d) => d());
    pluginInstances.delete(id);
  }
  function updateAllRepository() {
    return _async_to_generator(function* () {
      try {
        yield updateRepository(OFFICIAL_PLUGINS_REPO_URL);
      } catch (error) {
        console.error("Failed to update official plugins repository", error);
      }
      yield allSettled(Object.keys(pluginRepositories).map((repo) => _async_to_generator(function* () {
        if (repo !== OFFICIAL_PLUGINS_REPO_URL) {
          yield updateRepository(repo);
        }
      })()));
    })();
  }
  function updatePlugins() {
    return _async_to_generator(function* () {
      yield awaitStorage2(pluginRepositories, pluginSettings);
      var corePlugins = getCorePlugins();
      for (var id in corePlugins) {
        var { default: instance, preenabled } = corePlugins[id];
        pluginSettings[id] ??= {
          enabled: preenabled ?? true
        };
        registeredPlugins.set(id, instance.manifest);
        corePluginInstances.set(id, instance);
      }
      updateAllRepository();
    })();
  }
  function initPlugins() {
    return _async_to_generator(function* () {
      yield awaitStorage2(pluginRepositories, pluginSettings);
      allSettled([
        ...registeredPlugins.keys()
      ].map((id) => _async_to_generator(function* () {
        if (isPluginEnabled(id)) {
          startPlugin(id);
        }
      })()));
    })();
  }
  var corePluginInstances, registeredPlugins, pluginInstances, apiObjects, pluginRepositories, pluginSettings, _fetch, fetchJS, fetchJSON;
  var init_plugins4 = __esm({
    "src/lib/addons/plugins/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_plugins2();
      init_fs();
      init_storage2();
      init_utils();
      init_constants();
      init_common();
      init_api2();
      corePluginInstances = /* @__PURE__ */ new Map();
      registeredPlugins = /* @__PURE__ */ new Map();
      pluginInstances = /* @__PURE__ */ new Map();
      apiObjects = /* @__PURE__ */ new Map();
      pluginRepositories = createStorage2("plugins/repositories.json");
      pluginSettings = createStorage2("plugins/settings.json");
      _fetch = (repoUrl, path) => safeFetch(new URL(path, repoUrl), {
        cache: "no-store"
      });
      fetchJS = (repoUrl, path) => _fetch(repoUrl, path).then((r) => r.text());
      fetchJSON = (repoUrl, path) => _fetch(repoUrl, path).then((r) => r.json());
    }
  });

  // src/core/ui/settings/pages/FakeProfile/index.tsx
  function nitroBadgeId(months) {
    return months > 0 ? `premium_tenure_${months}_month_v2` : "premium";
  }
  function nitroSubscriberLabel(months) {
    var date = monthsAgo(months);
    return `Subscriber since ${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
  }
  function serverBoostingLabel(months) {
    var date = monthsAgo(months || 1);
    return `Server boosting since ${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
  }
  function sharedNitroSince(data) {
    var explicit = profileDate(data?.nitroSince);
    if (explicit)
      return explicit;
    return monthsAgo(NITRO_DURATIONS[Number(data?.nitroLevel)] || 0);
  }
  function pullRealCordConfiguration() {
    return _async_to_generator(function* () {
      if (globalThis.__CLOUDCORD_LOADER__?.loaderName !== "RealCord")
        return;
      var reader = import_react_native17.NativeModules.FileReaderModule ?? import_react_native17.NativeModules.RCTFileReaderModule;
      if (typeof reader?.readAsDataURL !== "function")
        return;
      try {
        var response = yield reader.readAsDataURL({
          rain: {
            method: "realcord.config",
            args: []
          }
        });
        var config = response?.result;
        if (!config || typeof config !== "object")
          return;
        var fingerprint = `${JSON.stringify(config)}:${registeredPlugins.size}`;
        if (fingerprint === realCordConfigFingerprint)
          return;
        realCordConfigFingerprint = fingerprint;
        var username = String(config.customUsername || "").trim();
        var displayName = String(config.customDisplayName || "").trim();
        var tier = String(config.nitroTier || "").toLowerCase();
        var requestedPlugins = new Set((Array.isArray(config.enabledPlugins) ? config.enabledPlugins : []).map((value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "")));
        var next = {
          ...preview,
          enabled: Boolean(username || displayName || REALCORD_NITRO_MONTHS[tier]),
          username: username || preview.username,
          displayName: displayName || preview.displayName,
          nitroEnabled: Boolean(REALCORD_NITRO_MONTHS[tier]),
          nitroMonths: REALCORD_NITRO_MONTHS[tier] || 0,
          replaceBadges: true
        };
        if (JSON.stringify(next) !== JSON.stringify(preview)) {
          rootSettings.fakeProfile = next;
          preview = next;
          refreshPreview();
        }
        for (var [id, manifest] of registeredPlugins) {
          if (id === "bunny.messagefix") {
            if (isPluginEnabled(id))
              disablePlugin(id);
            realCordManagedPlugins.delete(id);
            continue;
          }
          var normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
          var normalizedName = String(manifest?.display?.name || manifest?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          var requested = requestedPlugins.has(normalizedId) || requestedPlugins.has(normalizedName);
          try {
            if (requested) {
              if (!isPluginInstalled(id))
                yield installPlugin(id, true);
              else if (!isPluginEnabled(id))
                yield enablePlugin(id, true);
              realCordManagedPlugins.add(id);
            } else if (realCordManagedPlugins.has(id) && isPluginEnabled(id)) {
              disablePlugin(id);
              realCordManagedPlugins.delete(id);
            }
          } catch (error) {
            console.warn(`[RealCord] Could not apply mobile plugin ${id}`, error);
          }
        }
      } catch (error) {
        diagnostics.last = error?.message || "Could not read RealCord profile configuration";
      }
    })();
  }
  function bindSavedPreview() {
    if (configReady)
      return;
    var saved = rootSettings.fakeProfile;
    rootSettings.fakeProfile = {
      ...defaultPreview(),
      ...saved && typeof saved === "object" ? saved : {},
      nitroEnabled: saved?.nitroEnabled ?? Number(saved?.nitroMonths || 0) > 0,
      selectedBadges: {
        ...saved?.selectedBadges || {}
      }
    };
    preview = rootSettings.fakeProfile;
    configReady = true;
  }
  function localHasFakeBadges() {
    return preview.nitroEnabled || preview.boostMonths > 0 || preview.giftLevel >= 0 || Object.values(preview.selectedBadges || {}).some(Boolean);
  }
  function shouldReplaceLocalBadges() {
    return preview.replaceBadges && localHasFakeBadges();
  }
  function remoteReplaceBadges(data) {
    return data?.replaceRealBadges === true || Array.isArray(data?.customBadgeIds) && data.customBadgeIds.includes(REPLACE_BADGES_SYNC_ID);
  }
  function remoteNitroEnabled(data) {
    return data?.nitro === true || data?.nitro == null && Number(data?.nitroLevel ?? -1) >= 0;
  }
  function remoteHasFakeBadges(data) {
    var custom = Array.isArray(data?.customBadgeIds) ? data.customBadgeIds.filter((id) => id !== REPLACE_BADGES_SYNC_ID) : [];
    return Number(data?.badgeFlags || 0) !== 0 || remoteNitroEnabled(data) || Number(data?.boostMonths ?? -1) >= 0 || Number(data?.giftLevel ?? -1) >= 0 || custom.length > 0;
  }
  function shouldReplaceSharedBadges(data) {
    return remoteReplaceBadges(data) && remoteHasFakeBadges(data);
  }
  function shareableMedia(key) {
    return _async_to_generator(function* () {
      var uri = mediaUri(key);
      if (!uri || /^(?:https?:|data:)/i.test(uri))
        return uri || null;
      try {
        var blob = yield (yield fetch(uri)).blob();
        if (blob.size > 125e4)
          return null;
        var Reader = globalThis.FileReader;
        if (!Reader)
          return null;
        return yield new Promise((resolve) => {
          var reader = new Reader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    })();
  }
  function ownSharedProfile() {
    return _async_to_generator(function* () {
      return {
        username: preview.username,
        globalName: preview.displayName,
        avatar: yield shareableMedia("avatarMedia"),
        banner: yield shareableMedia("bannerMedia"),
        nitro: preview.nitroEnabled,
        nitroLevel: preview.nitroEnabled ? Math.max(0, NITRO_DURATIONS.indexOf(preview.nitroMonths)) : -1,
        nitroSince: preview.nitroEnabled ? monthsAgo(preview.nitroMonths).toISOString().slice(0, 10) : null,
        boostMonths: Math.max(-1, BOOST_DURATIONS.indexOf(preview.boostMonths) - 1),
        giftLevel: preview.giftLevel,
        avatarDecoration: preview.avatarDecoration || null,
        avatarDecorationSku: preview.avatarDecorationSku || null,
        profileColorsEnabled: preview.profileColorsEnabled,
        primaryColor: preview.profileColorsEnabled ? colorNumber(preview.primaryColor) : null,
        accentColor: preview.profileColorsEnabled ? colorNumber(preview.accentColor) : null,
        bio: preview.bio,
        pronouns: preview.pronouns,
        createdAt: preview.createdAt || null,
        signupDate: preview.signupDate || null,
        joinedSince: preview.signupDate || null,
        oldName: preview.oldName,
        badgeFlags: BADGES.reduce((flags, [id, , flag]) => flag && preview.selectedBadges?.[id] ? flags | flag : flags, 0),
        customBadgeIds: [
          ...BADGES.filter(([id, , , , customId]) => customId && preview.selectedBadges?.[id]).map(([, , , , customId]) => customId),
          ...preview.replaceBadges ? [
            REPLACE_BADGES_SYNC_ID
          ] : []
        ]
      };
    })();
  }
  function publishSharedProfile() {
    return _async_to_generator(function* () {
      if (!preview.enabled || !currentUserId)
        return;
      var saved = rootSettings.fakeProfileShare || {};
      var path = saved.id ? `/v1/profiles/${encodeURIComponent(saved.id)}` : "/v1/profiles";
      var response = yield fetch(`${SHARED_PROFILE_API}${path}`, {
        method: saved.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...saved.editToken ? {
            Authorization: `Bearer ${saved.editToken}`
          } : {}
        },
        body: JSON.stringify({
          ownerId: currentUserId,
          profile: yield ownSharedProfile()
        })
      });
      if (!response.ok) {
        if (saved.id && (response.status === 401 || response.status === 404)) {
          delete rootSettings.fakeProfileShare;
          return publishSharedProfile();
        }
        throw new Error(`CloudCord sharing failed (${response.status})`);
      }
      var result = yield response.json();
      if (!saved.id)
        rootSettings.fakeProfileShare = {
          id: result.id,
          editToken: result.editToken
        };
      diagnostics.last = "Fake Profile shared automatically";
    })();
  }
  function queueSharedPublish() {
    if (!preview.enabled)
      return;
    if (publishTimer)
      clearTimeout(publishTimer);
    publishTimer = setTimeout(() => void publishSharedProfile().catch((error) => {
      diagnostics.last = error?.message || "Sharing will retry later";
    }), 1200);
  }
  function pullOwnSharedProfile() {
    return _async_to_generator(function* () {
      if (!currentUserId)
        return;
      var now = Date.now();
      if (pullOwnSharedProfile.pending || now - Number(pullOwnSharedProfile.lastAttempt || 0) < 12e3)
        return;
      pullOwnSharedProfile.pending = true;
      pullOwnSharedProfile.lastAttempt = now;
      try {
        var response = yield fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(currentUserId)}`);
        if (response.status === 404) {
          if (preview.enabled)
            queueSharedPublish();
          return;
        }
        if (!response.ok)
          return;
        var payload = yield response.json();
        var data = payload?.profile ?? payload;
        if (!data || typeof data !== "object")
          return;
        var selectedBadges = {
          ...preview.selectedBadges || {}
        };
        var customBadgeIds = Array.isArray(data.customBadgeIds) ? data.customBadgeIds : [];
        for (var [id, , flag, , customId] of BADGES) {
          selectedBadges[id] = customId ? customBadgeIds.includes(customId) : !!(Number(data.badgeFlags || 0) & flag);
        }
        rootSettings.fakeProfile = preview = {
          ...preview,
          enabled: true,
          username: data.username || preview.username,
          displayName: data.globalName || data.displayName || preview.displayName,
          avatarMedia: data.avatar ? {
            uri: data.avatar
          } : null,
          bannerMedia: data.banner ? {
            uri: data.banner
          } : null,
          nitroEnabled: remoteNitroEnabled(data),
          nitroMonths: remoteNitroEnabled(data) ? NITRO_DURATIONS[Number(data.nitroLevel)] || 0 : 0,
          boostMonths: data.boostMonths >= 0 ? BOOST_DURATIONS[Number(data.boostMonths) + 1] || 0 : 0,
          giftLevel: Number.isInteger(data.giftLevel) ? data.giftLevel : -1,
          avatarDecoration: String(data.avatarDecoration || ""),
          avatarDecorationSku: String(data.avatarDecorationSku || ""),
          profileColorsEnabled: data.profileColorsEnabled === true || data.primaryColor != null || data.accentColor != null,
          primaryColor: colorHex(data.primaryColor, preview.primaryColor),
          accentColor: colorHex(data.accentColor, preview.accentColor),
          bio: String(data.bio || ""),
          pronouns: String(data.pronouns || ""),
          createdAt: String(data.createdAt || ""),
          signupDate: String(data.signupDate || data.joinedSince || ""),
          oldName: String(data.oldName || ""),
          replaceBadges: remoteReplaceBadges(data),
          selectedBadges
        };
        clearCache();
        diagnostics.last = "Fake Profile synced across devices";
      } catch (e) {
      } finally {
        pullOwnSharedProfile.pending = false;
      }
    })();
  }
  function requestSharedProfile(userId, force = false) {
    var id = String(userId || "");
    var fetchedAt = sharedProfileFetchedAt.get(id) || 0;
    if (!/^\d{15,22}$/.test(id) || id === currentUserId || sharedRequests.has(id) || !force && sharedProfiles.has(id) && Date.now() - fetchedAt < 5e3)
      return;
    sharedRequests.add(id);
    void fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(id)}?v=${Date.now()}`, {
      cache: "no-store"
    }).then((response) => response.ok ? response.json() : null).then((payload) => {
      var profile = payload?.profile ?? payload;
      var next = profile && typeof profile === "object" ? profile : {};
      var previous = sharedProfiles.get(id);
      var changed = JSON.stringify(previous ?? null) !== JSON.stringify(next);
      sharedProfiles.set(id, next);
      sharedProfileFetchedAt.set(id, Date.now());
      if (!changed || !profile || typeof profile !== "object")
        return;
      try {
        safeStore("UserProfileStore")?.emitChange?.();
      } catch (e) {
      }
    }).catch(() => {
    }).finally(() => sharedRequests.delete(id));
  }
  function refreshSharedProfiles() {
    for (var id of sharedProfiles.keys())
      requestSharedProfile(id, true);
  }
  function cloneSharedUser(original, data) {
    if (!original || typeof original !== "object" || !data)
      return original;
    var cloned = Object.assign(Object.create(Object.getPrototypeOf(original) || Object.prototype), original);
    if (data.username)
      setOwnValue(cloned, "username", data.username);
    if (data.globalName) {
      setOwnValue(cloned, "globalName", data.globalName);
      setOwnValue(cloned, "displayName", data.globalName);
    }
    if (data.avatar) {
      setOwnValue(cloned, "avatarURL", data.avatar);
      setOwnValue(cloned, "avatarUrl", data.avatar);
      setOwnValue(cloned, "getAvatarURL", () => data.avatar);
    }
    if (data.avatarDecoration)
      setOwnValue(cloned, "avatarDecorationData", {
        asset: decorationAsset(data.avatarDecoration),
        skuId: data.avatarDecorationSku || "cloudcord-decoration"
      });
    if (data.profileColorsEnabled === true) {
      if (data.primaryColor != null)
        setOwnValue(cloned, "primaryColor", Number(data.primaryColor));
      if (data.accentColor != null)
        setOwnValue(cloned, "accentColor", Number(data.accentColor));
      if (data.primaryColor != null || data.accentColor != null)
        setOwnValue(cloned, "themeColors", [
          Number(data.primaryColor || data.accentColor),
          Number(data.accentColor || data.primaryColor)
        ]);
    }
    if (data.banner) {
      setOwnValue(cloned, "bannerURL", data.banner);
      setOwnValue(cloned, "bannerUrl", data.banner);
      setOwnValue(cloned, "getBannerURL", () => data.banner);
    }
    if (shouldReplaceSharedBadges(data)) {
      var sharedFlags = Number(data.badgeFlags || 0);
      setOwnValue(cloned, "publicFlags", sharedFlags);
      setOwnValue(cloned, "public_flags", sharedFlags);
      setOwnValue(cloned, "flags", sharedFlags);
      setOwnValue(cloned, "badges", []);
      setOwnValue(cloned, "profileBadges", []);
      setOwnValue(cloned, "premiumSince", null);
      setOwnValue(cloned, "premiumGuildSince", null);
      setOwnValue(cloned, "legacyUsername", null);
    }
    if (remoteNitroEnabled(data)) {
      var since = sharedNitroSince(data);
      setOwnValue(cloned, "premiumType", 2);
      setOwnValue(cloned, "premium_type", 2);
      setOwnValue(cloned, "premiumSince", since);
      setOwnValue(cloned, "premium_since", since.toISOString());
    }
    return cloned;
  }
  function decorateSharedProfile(original, userId, data) {
    if (!original || typeof original !== "object" || !data)
      return original;
    var cloned = Object.assign(Object.create(Object.getPrototypeOf(original) || Object.prototype), original);
    if (cloned.user)
      setOwnValue(cloned, "user", cloneSharedUser(cloned.user, data));
    if (data.username)
      setOwnValue(cloned, "username", data.username);
    if (data.globalName || data.displayName) {
      var displayName = data.globalName || data.displayName;
      setOwnValue(cloned, "globalName", displayName);
      setOwnValue(cloned, "displayName", displayName);
    }
    if (data.avatar) {
      setOwnValue(cloned, "avatarURL", data.avatar);
      setOwnValue(cloned, "avatarUrl", data.avatar);
      setOwnValue(cloned, "avatarSrc", data.avatar);
      setOwnValue(cloned, "getAvatarURL", () => data.avatar);
    }
    if (data.banner) {
      setOwnValue(cloned, "banner", data.banner);
      setOwnValue(cloned, "bannerURL", data.banner);
      setOwnValue(cloned, "bannerUrl", data.banner);
      setOwnValue(cloned, "bannerSrc", data.banner);
      setOwnValue(cloned, "getBannerURL", () => data.banner);
      setOwnValue(cloned, "getPreviewBanner", () => data.banner);
    }
    if (shouldReplaceSharedBadges(data)) {
      var sharedFlags = Number(data.badgeFlags || 0);
      setOwnValue(cloned, "publicFlags", sharedFlags);
      setOwnValue(cloned, "public_flags", sharedFlags);
      setOwnValue(cloned, "flags", sharedFlags);
    }
    if (data.bio != null)
      setOwnValue(cloned, "bio", data.bio);
    if (data.pronouns != null)
      setOwnValue(cloned, "pronouns", data.pronouns);
    if (remoteNitroEnabled(data)) {
      var since = sharedNitroSince(data);
      setOwnValue(cloned, "premiumType", 2);
      setOwnValue(cloned, "premium_type", 2);
      setOwnValue(cloned, "premiumSince", since);
      setOwnValue(cloned, "premium_since", since.toISOString());
    }
    var createdAt = profileDate(data.createdAt);
    var joinedAt = profileDate(data.signupDate || data.joinedSince);
    if (createdAt)
      setOwnValue(cloned, "createdAt", createdAt);
    if (joinedAt) {
      setOwnValue(cloned, "joinedAt", joinedAt);
      setOwnValue(cloned, "memberSince", joinedAt);
    }
    if (data.profileColorsEnabled === true) {
      if (data.accentColor != null)
        setOwnValue(cloned, "accentColor", data.accentColor);
      if (data.primaryColor != null)
        setOwnValue(cloned, "primaryColor", data.primaryColor);
      if (data.primaryColor != null || data.accentColor != null)
        setOwnValue(cloned, "themeColors", [
          Number(data.primaryColor || data.accentColor),
          Number(data.accentColor || data.primaryColor)
        ]);
    }
    setOwnValue(cloned, "userId", userId);
    return cloned;
  }
  function clearCache() {
    userCache = /* @__PURE__ */ new WeakMap();
    profileCache = /* @__PURE__ */ new WeakMap();
  }
  function mediaUri(key) {
    return String(preview[key]?.uri || "");
  }
  function safeStore(name) {
    try {
      return findByStoreName(name);
    } catch (e) {
      return null;
    }
  }
  function setOwnValue(target, key, value) {
    if (!target)
      return;
    try {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } catch (e) {
      try {
        target[key] = value;
      } catch (e2) {
      }
    }
  }
  function monthsAgo(months) {
    var date = /* @__PURE__ */ new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }
  function profileDate(value) {
    if (!value)
      return null;
    var date = /* @__PURE__ */ new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function milestoneIcon(months, values) {
    return values.find(([minimum]) => months >= minimum)?.[1] || "";
  }
  function colorNumber(value) {
    var normalized = String(value || "").trim().replace(/^#/, "");
    return /^[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized, 16) : null;
  }
  function colorHex(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? `#${Math.max(0, Math.min(16777215, number)).toString(16).padStart(6, "0").toUpperCase()}` : fallback;
  }
  function decorationAsset(value) {
    var raw = String(value || "");
    if (!/^https?:/i.test(raw))
      return raw;
    try {
      return decodeURIComponent(new URL(raw).pathname.split("/").pop() || "").replace(/\.png$/i, "");
    } catch (e) {
      return raw;
    }
  }
  function boosterIcon(months) {
    if (!months)
      return "";
    return BOOST_ICON_BY_MONTHS.get(months) || milestoneIcon(months, BOOST_ICONS);
  }
  function addRenderedBadge(result, id, description, icon, size) {
    if (!icon || result.some((item) => item?.id === id))
      return;
    badgeRenderProps.set(id, {
      id,
      source: {
        uri: icon
      },
      label: description,
      ...size ? {
        width: size,
        height: size,
        style: {
          width: size,
          height: size
        }
      } : {}
    });
    result.push({
      id,
      description,
      icon: " _"
    });
  }
  function selectedBadgeObjects(existing) {
    var _loop2 = function(id2, description2, icon22) {
      if (!preview.selectedBadges?.[id2])
        return "continue";
      var badgeId = `fakeprofile-${id2}`;
      if (!result.some((item) => item?.id === badgeId)) {
        var label = id2 === "oldname" && preview.oldName ? `Originally Known As: ${preview.oldName}` : description2;
        result.push({
          id: badgeId,
          description: label,
          icon: " _",
          iconSrc: icon22,
          source: {
            uri: icon22
          }
        });
      }
    };
    var result = [];
    if (preview.nitroEnabled) {
      var icon = milestoneIcon(preview.nitroMonths, NITRO_ICONS);
      result.push({
        id: nitroBadgeId(preview.nitroMonths),
        description: nitroSubscriberLabel(preview.nitroMonths),
        icon: " _",
        iconSrc: icon,
        source: {
          uri: icon
        }
      });
    }
    if (preview.boostMonths > 0) {
      var icon1 = boosterIcon(preview.boostMonths);
      result.push({
        id: "fakeprofile-boost",
        description: serverBoostingLabel(preview.boostMonths),
        icon: " _",
        iconSrc: icon1,
        source: {
          uri: icon1
        }
      });
    }
    for (var [id, description, , icon2] of BADGES)
      _loop2(id, description, icon2);
    if (!shouldReplaceLocalBadges() && Array.isArray(existing)) {
      var _loop1 = function(badge2) {
        if (!badge2 || result.some((item) => item?.id && item.id === badge2?.id))
          return "continue";
        result.push(badge2);
      };
      for (var badge of existing)
        _loop1(badge);
    }
    return result;
  }
  function cloneObject(original, kind) {
    if (!original || !preview.enabled)
      return original;
    var cache = kind === "profile" ? profileCache : userCache;
    try {
      var cached = cache.get(original);
      if (cached)
        return cached;
    } catch (e) {
    }
    var cloned;
    try {
      cloned = Object.create(Object.getPrototypeOf(original));
      for (var key of Reflect.ownKeys(original)) {
        if (overriddenKeys.has(String(key)))
          continue;
        var descriptor = Object.getOwnPropertyDescriptor(original, key);
        if (descriptor)
          Object.defineProperty(cloned, key, descriptor);
      }
    } catch (e) {
      try {
        cloned = {
          ...original
        };
      } catch (e2) {
        return original;
      }
    }
    var displayName = preview.displayName || original.globalName || original.displayName || original.username;
    var username = preview.username || original.username;
    var avatar = mediaUri("avatarMedia");
    var banner = mediaUri("bannerMedia");
    var primaryColor = preview.profileColorsEnabled ? colorNumber(preview.primaryColor) : null;
    var accentColor = preview.profileColorsEnabled ? colorNumber(preview.accentColor) : null;
    var selectedFlags = 0;
    for (var [id, , flag] of BADGES)
      if (preview.selectedBadges?.[id])
        selectedFlags |= flag;
    var flags = shouldReplaceLocalBadges() ? selectedFlags : Number(original.publicFlags ?? original.flags ?? 0) | selectedFlags;
    setOwnValue(cloned, "username", username);
    setOwnValue(cloned, "globalName", displayName);
    setOwnValue(cloned, "displayName", displayName);
    setOwnValue(cloned, "bio", preview.bio);
    setOwnValue(cloned, "pronouns", preview.pronouns);
    var createdAt = profileDate(preview.createdAt);
    var joinedAt = profileDate(preview.signupDate);
    if (createdAt)
      setOwnValue(cloned, "createdAt", createdAt);
    if (joinedAt) {
      setOwnValue(cloned, "joinedAt", joinedAt);
      setOwnValue(cloned, "memberSince", joinedAt);
    }
    setOwnValue(cloned, "publicFlags", flags);
    setOwnValue(cloned, "flags", flags);
    setOwnValue(cloned, "badges", selectedBadgeObjects(original.badges));
    setOwnValue(cloned, "profileBadges", selectedBadgeObjects(original.profileBadges));
    setOwnValue(cloned, "hasFlag", (flag2) => !!(flags & flag2));
    setOwnValue(cloned, "avatarDecorationData", preview.avatarDecoration ? {
      asset: decorationAsset(preview.avatarDecoration),
      skuId: preview.avatarDecorationSku || "cloudcord-decoration"
    } : null);
    if (primaryColor != null)
      setOwnValue(cloned, "primaryColor", primaryColor);
    if (accentColor != null)
      setOwnValue(cloned, "accentColor", accentColor);
    if (primaryColor != null || accentColor != null)
      setOwnValue(cloned, "themeColors", [
        primaryColor ?? accentColor,
        accentColor ?? primaryColor
      ]);
    if (preview.nitroEnabled) {
      var premiumSince = monthsAgo(preview.nitroMonths);
      setOwnValue(cloned, "premiumType", 2);
      setOwnValue(cloned, "premium_type", 2);
      setOwnValue(cloned, "premiumSince", premiumSince);
      setOwnValue(cloned, "premium_since", premiumSince.toISOString());
    }
    if (preview.boostMonths > 0)
      setOwnValue(cloned, "premiumGuildSince", monthsAgo(preview.boostMonths));
    if (avatar) {
      setOwnValue(cloned, "avatarURL", avatar);
      setOwnValue(cloned, "avatarUrl", avatar);
      setOwnValue(cloned, "getAvatarURL", () => avatar);
    }
    if (banner) {
      setOwnValue(cloned, "bannerURL", banner);
      setOwnValue(cloned, "bannerUrl", banner);
      setOwnValue(cloned, "getBannerURL", () => banner);
      setOwnValue(cloned, "getPreviewBanner", () => banner);
    }
    try {
      cache.set(original, cloned);
    } catch (e) {
    }
    return cloned;
  }
  function decorateProfileResult(original, userId) {
    if (!original)
      return original;
    if (!isCurrentUser(userId)) {
      var id = String(userId || "");
      requestSharedProfile(id);
      var shared = sharedProfiles.get(id);
      return shared && Object.keys(shared).length ? decorateSharedProfile(original, id, shared) : original;
    }
    if (!preview.enabled)
      return original;
    var decorated = cloneObject(original, "profile");
    if (original.user)
      setOwnValue(decorated, "user", cloneObject(original.user, "user"));
    if (original.userProfile)
      setOwnValue(decorated, "userProfile", cloneObject(original.userProfile, "profile"));
    if (original.guildMemberProfile)
      setOwnValue(decorated, "guildMemberProfile", cloneObject(original.guildMemberProfile, "profile"));
    if (original.displayProfile)
      setOwnValue(decorated, "displayProfile", cloneObject(original.displayProfile, "profile"));
    if (original.profile)
      setOwnValue(decorated, "profile", cloneObject(original.profile, "profile"));
    return decorated;
  }
  function profileResultUserId(subject, result) {
    return String((typeof subject === "string" ? subject : subject?.userId || subject?.id || subject?.user?.id) || result?.userId || result?.id || result?.user?.id || result?.userProfile?.userId || result?.userProfile?.user?.id || result?.guildMemberProfile?.userId || result?.guildMemberProfile?.user?.id || result?.displayProfile?.userId || result?.displayProfile?.user?.id || result?.profile?.userId || result?.profile?.user?.id || "");
  }
  function isCurrentUser(id) {
    return !!id && !!currentUserId && id === currentUserId;
  }
  function addPatch(method, parent, handler) {
    if (!parent?.[method])
      return;
    try {
      instead(method, parent, handler);
      diagnostics.patches += 1;
    } catch (error) {
      diagnostics.last = error?.message || `Could not connect ${method}`;
    }
  }
  function connectBadgeRenderer() {
    try {
      after("default", useBadgesModule2, ([user], result) => {
        if (!Array.isArray(result))
          return result;
        var id = String(user?.userId || user?.id || "");
        if (!isCurrentUser(id)) {
          requestSharedProfile(id);
          var data = sharedProfiles.get(id);
          var officialOwner = id === CLOUDCORD_OFFICIAL_OWNER_ID;
          if (!data && !officialOwner)
            return;
          var ordered = [];
          if (officialOwner)
            addRenderedBadge(ordered, CLOUDCORD_OFFICIAL_BADGE_ID, "CloudCord Official Owner", CLOUDCORD_OFFICIAL_BADGE_ICON, 26);
          if (data) {
            var nitroMonths = NITRO_DURATIONS[Number(data.nitroLevel)] || 0;
            var boostMonths = [
              1,
              2,
              3,
              6,
              9,
              12,
              15,
              18,
              24
            ][Number(data.boostMonths)] || 0;
            if (remoteNitroEnabled(data))
              addRenderedBadge(ordered, nitroBadgeId(nitroMonths), nitroSubscriberLabel(nitroMonths), milestoneIcon(nitroMonths, NITRO_ICONS));
            addRenderedBadge(ordered, "cloudcord-shared-boost", serverBoostingLabel(boostMonths), boosterIcon(boostMonths));
            var gift = GIFT_LEVELS[Number(data.giftLevel)];
            if (gift)
              addRenderedBadge(ordered, "cloudcord-shared-gifting", `${gift.name} \xB7 Gifted ${gift.count}x`, gift.icon);
            var customBadgeIds = Array.isArray(data.customBadgeIds) ? data.customBadgeIds : [];
            for (var [id1, description, flag, icon, customId] of BADGES) {
              var selected = customId ? customBadgeIds.includes(customId) : (Number(data.badgeFlags || 0) & flag) !== 0;
              var label = id1 === "oldname" && data.oldName ? `Originally Known As: ${data.oldName}` : description;
              if (selected)
                addRenderedBadge(ordered, `cloudcord-shared-${customId || id1}`, label, icon);
            }
          }
          var existing = data && shouldReplaceSharedBadges(data) ? [] : result.filter((item) => {
            var badgeId2 = String(item?.id || "");
            return badgeId2 !== CLOUDCORD_OFFICIAL_BADGE_ID && !badgeId2.startsWith("cloudcord-shared-") && !(remoteNitroEnabled(data) && badgeId2 === nitroBadgeId(NITRO_DURATIONS[Number(data?.nitroLevel)] || 0));
          });
          return [
            ...ordered,
            ...existing
          ];
        }
        var officialOwner1 = id === CLOUDCORD_OFFICIAL_OWNER_ID;
        if (!preview.enabled) {
          if (!officialOwner1)
            return;
          var existing1 = result.filter((item) => String(item?.id || "") !== CLOUDCORD_OFFICIAL_BADGE_ID);
          var ordered1 = [];
          addRenderedBadge(ordered1, CLOUDCORD_OFFICIAL_BADGE_ID, "CloudCord Official Owner", CLOUDCORD_OFFICIAL_BADGE_ICON, 26);
          return [
            ...ordered1,
            ...existing1
          ];
        }
        var existing2 = shouldReplaceLocalBadges() ? [] : result.filter((item) => {
          var badgeId2 = String(item?.id || "");
          return badgeId2 !== CLOUDCORD_OFFICIAL_BADGE_ID && !badgeId2.startsWith("fakeprofile-") && !(preview.nitroEnabled && badgeId2 === nitroBadgeId(preview.nitroMonths));
        });
        var ordered2 = [];
        if (officialOwner1)
          addRenderedBadge(ordered2, CLOUDCORD_OFFICIAL_BADGE_ID, "CloudCord Official Owner", CLOUDCORD_OFFICIAL_BADGE_ICON, 26);
        if (preview.nitroEnabled)
          addRenderedBadge(ordered2, nitroBadgeId(preview.nitroMonths), nitroSubscriberLabel(preview.nitroMonths), milestoneIcon(preview.nitroMonths, NITRO_ICONS));
        var gift1 = GIFT_LEVELS[preview.giftLevel];
        if (gift1)
          addRenderedBadge(ordered2, "fakeprofile-gifting", `${gift1.name} \xB7 Gifted ${gift1.count}x`, gift1.icon);
        addRenderedBadge(ordered2, "fakeprofile-boost", serverBoostingLabel(preview.boostMonths), boosterIcon(preview.boostMonths));
        for (var [badgeId, description1, , icon1] of BADGES) {
          if (!preview.selectedBadges?.[badgeId])
            continue;
          var id2 = `fakeprofile-${badgeId}`;
          var label1 = badgeId === "oldname" && preview.oldName ? `Originally Known As: ${preview.oldName}` : description1;
          addRenderedBadge(ordered2, id2, label1, icon1);
        }
        return [
          ...ordered2,
          ...existing2
        ];
      });
      diagnostics.patches += 1;
    } catch (error) {
      diagnostics.last = error?.message || "Could not connect badge list";
    }
    for (var component of [
      "ProfileBadge",
      "RenderedBadge"
    ]) {
      try {
        onJsxCreate(component, (_component, rendered) => {
          if (!rendered?.props)
            return;
          var props = badgeRenderProps.get(rendered.props.id);
          if (props)
            Object.assign(rendered.props, props);
        });
        diagnostics.patches += 1;
      } catch (e) {
      }
    }
  }
  function addAfterPatch(method, parent, handler) {
    if (!parent?.[method])
      return;
    try {
      after(method, parent, handler);
      diagnostics.patches += 1;
    } catch (error) {
      diagnostics.last = error?.message || `Could not connect ${method}`;
    }
  }
  function requestIsCurrent(args) {
    if (!currentUserId)
      return false;
    return args.some((value) => value === currentUserId || value?.id === currentUserId || value?.userId === currentUserId || value?.user?.id === currentUserId);
  }
  function renderedUserId(props) {
    return props?.userId || props?.user?.id || props?.displayProfile?.userId || props?.displayProfile?.user?.id || props?.profile?.userId || props?.profile?.user?.id;
  }
  function connectMediaRenderer() {
    var avatarComponents = [
      "UserHeaderAvatar",
      "ProfileAvatar",
      "UserProfileAvatar"
    ];
    var bannerComponents = [
      "UserBanner",
      "ProfileBanner",
      "UserProfileBanner"
    ];
    for (var component of avatarComponents) {
      try {
        onJsxCreate(component, (_component, rendered) => {
          var props = rendered?.props;
          var id = String(renderedUserId(props) || "");
          if (!id)
            return;
          if (!isCurrentUser(id)) {
            requestSharedProfile(id);
            var data = sharedProfiles.get(id);
            if (!data?.avatar)
              return;
            props.source = {
              uri: data.avatar
            };
            props.avatarSource = {
              uri: data.avatar
            };
            props.avatarSrc = data.avatar;
            props.avatarURL = data.avatar;
            props.resizeMode = "cover";
            props.contentFit = "cover";
            if (props.user)
              props.user = cloneSharedUser(props.user, data);
            return;
          }
          var uri = mediaUri("avatarMedia");
          if (!preview.enabled || !uri)
            return;
          props.source = {
            uri
          };
          props.avatarSource = {
            uri
          };
          props.avatarSrc = uri;
          props.avatarURL = uri;
          props.resizeMode = "cover";
          props.contentFit = "cover";
          if (props.user)
            props.user = cloneObject(props.user, "user");
        });
        diagnostics.patches += 1;
      } catch (e) {
      }
    }
    for (var component1 of bannerComponents) {
      try {
        onJsxCreate(component1, (_component, rendered) => {
          var props = rendered?.props;
          var id = String(renderedUserId(props) || "");
          if (!id)
            return;
          if (!isCurrentUser(id)) {
            requestSharedProfile(id);
            var data = sharedProfiles.get(id);
            if (!data?.banner)
              return;
            props.source = {
              uri: data.banner
            };
            props.bannerSource = {
              uri: data.banner
            };
            props.bannerSrc = data.banner;
            props.bannerURL = data.banner;
            props.resizeMode = "cover";
            props.contentFit = "cover";
            return;
          }
          var uri = mediaUri("bannerMedia");
          if (!preview.enabled || !uri)
            return;
          props.source = {
            uri
          };
          props.bannerSource = {
            uri
          };
          props.bannerSrc = uri;
          props.bannerURL = uri;
          props.resizeMode = "cover";
          props.contentFit = "cover";
        });
        diagnostics.patches += 1;
      } catch (e) {
      }
    }
  }
  function ensurePatches() {
    if (initialized2)
      return;
    initialized2 = true;
    var userStore = safeStore("UserStore") || findByProps("getCurrentUser", "getUser");
    diagnostics.userStore = !!userStore;
    try {
      realCurrentUser = userStore?.getCurrentUser?.() || null;
      currentUserId = realCurrentUser?.id || null;
    } catch (e) {
    }
    addPatch("getCurrentUser", userStore, (args, original) => {
      var user = original(...args);
      realCurrentUser = user || realCurrentUser;
      currentUserId = user?.id || currentUserId;
      if (preview.enabled)
        queueSharedPublish();
      return cloneObject(user, "user");
    });
    addPatch("getUser", userStore, (args, original) => {
      if (!isCurrentUser(args?.[0]))
        return original(...args);
      var user = original(...args);
      realCurrentUser = user || realCurrentUser;
      return cloneObject(user, "user");
    });
    var profileStore = safeStore("UserProfileStore") || findByProps("getUserProfile", "getGuildMemberProfile");
    diagnostics.profileStore = !!profileStore;
    addPatch("getUserProfile", profileStore, (args, original) => {
      if (!isCurrentUser(args?.[0]))
        return original(...args);
      return decorateProfileResult(original(...args), args?.[0]);
    });
    try {
      after("default", useUserProfileModule, (args, result) => {
        var subject = args?.[0];
        var id = profileResultUserId(subject, result);
        return decorateProfileResult(result, id);
      });
      diagnostics.patches += 1;
    } catch (error) {
      diagnostics.last = error?.message || "Could not connect profile view";
    }
    try {
      after("default", useDisplayProfileModule, (args, result) => {
        var subject = args?.[0];
        var id = profileResultUserId(subject, result);
        if (isCurrentUser(id))
          return preview.enabled ? cloneObject(result, "profile") : result;
        requestSharedProfile(id);
        var shared = sharedProfiles.get(id);
        return shared && Object.keys(shared).length ? decorateSharedProfile(result, id, shared) : result;
      });
      diagnostics.patches += 1;
    } catch (error) {
      diagnostics.last = error?.message || "Could not connect profile banner";
    }
    connectBadgeRenderer();
    var avatarResolver = findByProps("getUserAvatarURL") || findByProps("getAvatarURL", "getDefaultAvatarURL");
    var bannerResolver = findByProps("getUserBannerURL") || findByProps("getBannerURL");
    diagnostics.avatarResolver = !!avatarResolver;
    diagnostics.bannerResolver = !!bannerResolver;
    for (var method of [
      "getUserAvatarURL",
      "getAvatarURL",
      "getGuildMemberAvatarURL",
      "getGuildMemberAvatarURLSimple"
    ]) {
      addPatch(method, avatarResolver, (args, original) => {
        var uri = mediaUri("avatarMedia");
        return preview.enabled && uri && requestIsCurrent(args) ? uri : original(...args);
      });
    }
    for (var method1 of [
      "getUserAvatarSource",
      "getGuildMemberAvatarSource"
    ]) {
      addPatch(method1, avatarResolver, (args, original) => {
        var uri = mediaUri("avatarMedia");
        return preview.enabled && uri && requestIsCurrent(args) ? {
          uri
        } : original(...args);
      });
    }
    for (var method2 of [
      "getUserBannerURL",
      "getBannerURL",
      "getGuildMemberBannerURL"
    ]) {
      addPatch(method2, bannerResolver, (args, original) => {
        var uri = mediaUri("bannerMedia");
        return preview.enabled && uri && requestIsCurrent(args) ? uri : original(...args);
      });
    }
    var snowflakeUtils = findByProps("extractTimestamp");
    addPatch("extractTimestamp", snowflakeUtils, (args, original) => {
      var createdAt = profileDate(preview.createdAt);
      return preview.enabled && createdAt && String(args?.[0] || "") === currentUserId ? createdAt.getTime() : original(...args);
    });
    connectMediaRenderer();
    var bannerComposer = findByProps("getBanner", "getBannerColor") || findByProps("getBanner");
    addAfterPatch("getBanner", bannerComposer, (args, result) => {
      var uri = mediaUri("bannerMedia");
      var id = args?.[0]?.displayProfile?.userId || args?.[0]?.userId;
      if (!preview.enabled || !uri || !result || !id || !isCurrentUser(id))
        return;
      return {
        ...result,
        bannerSrc: uri,
        source: {
          uri
        }
      };
    });
    diagnostics.last = `Connected ${diagnostics.patches} preview hooks`;
  }
  function refreshPreview() {
    clearCache();
    try {
      safeStore("UserStore")?.emitChange?.();
    } catch (e) {
    }
    try {
      safeStore("UserProfileStore")?.emitChange?.();
    } catch (e) {
    }
    setTimeout(() => {
      try {
        if (currentUserId && realCurrentUser) {
          FluxDispatcher.dispatch({
            type: "USER_UPDATE",
            user: realCurrentUser
          });
        }
      } catch (error) {
        diagnostics.last = error?.message || "Preview saved; reopen the profile to refresh";
      }
    }, 0);
  }
  function initializeFakeProfile() {
    if (initPromise)
      return initPromise;
    initPromise = (() => _async_to_generator(function* () {
      try {
        yield awaitStorage(settings);
        bindSavedPreview();
        yield pullRealCordConfiguration();
        if (globalThis.__CLOUDCORD_LOADER__?.loaderName === "RealCord" && !realCordSyncTimer) {
          realCordSyncTimer = setInterval(pullRealCordConfiguration, 5e3);
        }
        ensurePatches();
        yield pullOwnSharedProfile();
        if (!sharedSyncTimer)
          sharedSyncTimer = setInterval(() => {
            void pullOwnSharedProfile();
            refreshSharedProfiles();
          }, 5e3);
        if (preview.enabled) {
          refreshPreview();
          queueSharedPublish();
        }
      } catch (error) {
        diagnostics.last = error?.message || "Could not restore Fake Profile";
        initPromise = null;
      }
    })())();
    return initPromise;
  }
  var import_react4, import_react_native17, BADGES, GIFT_LEVELS, CLOUDCORD_OFFICIAL_OWNER_ID, CLOUDCORD_OFFICIAL_BADGE_ID, CLOUDCORD_OFFICIAL_BADGE_ICON, useBadgesModule2, useUserProfileModule, useDisplayProfileModule, badgeRenderProps, simpleSheets, LinearGradient, overriddenKeys, NITRO_DURATIONS, BOOST_DURATIONS, NITRO_ICONS, BOOST_ICONS, BOOST_ICON_BY_MONTHS, rootSettings, defaultPreview, preview, configReady, initPromise, realCordSyncTimer, realCordManagedPlugins, realCordConfigFingerprint, REALCORD_NITRO_MONTHS, diagnostics, initialized2, currentUserId, realCurrentUser, userCache, profileCache, SHARED_PROFILE_API, sharedProfiles, sharedProfileFetchedAt, sharedRequests, publishTimer, sharedSyncTimer, REPLACE_BADGES_SYNC_ID;
  var init_FakeProfile = __esm({
    "src/core/ui/settings/pages/FakeProfile/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_storage();
      init_patcher();
      init_jsx();
      init_settings();
      init_plugins4();
      init_metro();
      init_common();
      init_components();
      import_react4 = __toESM(require_react());
      import_react_native17 = __toESM(require_react_native());
      BADGES = [
        [
          "staff",
          "Discord Staff",
          1,
          "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png"
        ],
        [
          "partner",
          "Partner",
          2,
          "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png"
        ],
        [
          "hypesquad",
          "HypeSquad Events",
          4,
          "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png"
        ],
        [
          "bug1",
          "Bug Hunter Lvl 1",
          8,
          "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png"
        ],
        [
          "bravery",
          "HypeSquad Bravery",
          64,
          "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png"
        ],
        [
          "brilliance",
          "HypeSquad Brilliance",
          128,
          "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png"
        ],
        [
          "balance",
          "HypeSquad Balance",
          256,
          "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png"
        ],
        [
          "early",
          "Early Supporter",
          512,
          "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png"
        ],
        [
          "bug2",
          "Bug Hunter Lvl 2",
          16384,
          "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png"
        ],
        [
          "vdev",
          "Verified Developer",
          131072,
          "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png"
        ],
        [
          "mod",
          "Former Moderator",
          262144,
          "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png"
        ],
        [
          "active",
          "Active Developer",
          4194304,
          "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png"
        ],
        [
          "oldname",
          "Originally Known As",
          0,
          "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png",
          "oldname"
        ],
        [
          "quest",
          "Completed a Quest",
          0,
          "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png",
          "quest"
        ],
        [
          "orbs",
          "Orbs \u2014 Apprentice",
          0,
          "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png",
          "orbs"
        ]
      ];
      GIFT_LEVELS = [
        {
          name: "Patron",
          count: 1,
          icon: "https://cdn.discordapp.com/badge-icons/ac305d1b9481f312ce4419e7f8296558.png"
        },
        {
          name: "Champion",
          count: 2,
          icon: "https://cdn.discordapp.com/badge-icons/8b7792c4f65953d3ff564f23429cb79e.png"
        },
        {
          name: "Luminary",
          count: 3,
          icon: "https://cdn.discordapp.com/badge-icons/3119f5504b2cd09576a323908c7c3517.png"
        },
        {
          name: "Icon",
          count: 6,
          icon: "https://cdn.discordapp.com/badge-icons/64f2413c9b9803661322aaad25826b62.png"
        },
        {
          name: "Hero",
          count: 10,
          icon: "https://cdn.discordapp.com/badge-icons/77d65b1f210014a11eb1582ee06ab684.png"
        },
        {
          name: "Legend",
          count: 20,
          icon: "https://cdn.discordapp.com/badge-icons/7fe346cfc5da1340087d8759a9e7a395.png"
        }
      ];
      CLOUDCORD_OFFICIAL_OWNER_ID = "463515440606609419";
      CLOUDCORD_OFFICIAL_BADGE_ID = "cloudcord-official-owner";
      CLOUDCORD_OFFICIAL_BADGE_ICON = "https://raw.githubusercontent.com/xohus/cloudcord/main/cloudcord-favicon.png";
      useBadgesModule2 = findByNameLazy("useBadges", false);
      useUserProfileModule = findByNameLazy("useUserProfile", false);
      useDisplayProfileModule = findByNameLazy("useDisplayProfile", false);
      badgeRenderProps = /* @__PURE__ */ new Map();
      simpleSheets = findByProps("showSimpleActionSheet");
      LinearGradient = findByProps("LinearGradient")?.LinearGradient;
      overriddenKeys = /* @__PURE__ */ new Set([
        "username",
        "globalName",
        "displayName",
        "publicFlags",
        "flags",
        "badges",
        "profileBadges",
        "avatarURL",
        "avatarUrl",
        "getAvatarURL",
        "banner",
        "bannerURL",
        "bannerUrl",
        "getBannerURL",
        "getPreviewBanner",
        "hasFlag",
        "premiumType",
        "premiumSince",
        "premiumGuildSince",
        "avatarDecorationData",
        "primaryColor",
        "accentColor",
        "themeColors",
        "bio",
        "pronouns",
        "createdAt",
        "joinedAt",
        "memberSince",
        "user",
        "userProfile",
        "guildMemberProfile",
        "displayProfile",
        "profile"
      ]);
      NITRO_DURATIONS = [
        0,
        1,
        3,
        6,
        12,
        24,
        36,
        60,
        72
      ];
      BOOST_DURATIONS = [
        0,
        1,
        2,
        3,
        6,
        9,
        12,
        15,
        18,
        24
      ];
      NITRO_ICONS = [
        [
          72,
          "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png"
        ],
        [
          60,
          "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png"
        ],
        [
          36,
          "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png"
        ],
        [
          24,
          "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png"
        ],
        [
          12,
          "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png"
        ],
        [
          6,
          "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png"
        ],
        [
          3,
          "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png"
        ],
        [
          1,
          "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png"
        ],
        [
          0,
          "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"
        ]
      ];
      BOOST_ICONS = [
        [
          24,
          "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png"
        ],
        [
          18,
          "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png"
        ],
        [
          15,
          "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png"
        ],
        [
          12,
          "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png"
        ],
        [
          9,
          "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png"
        ],
        [
          6,
          "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png"
        ],
        [
          3,
          "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png"
        ],
        [
          2,
          "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png"
        ],
        [
          1,
          "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png"
        ]
      ];
      BOOST_ICON_BY_MONTHS = new Map(BOOST_ICONS);
      rootSettings = settings;
      defaultPreview = () => ({
        enabled: false,
        displayName: "Preview Name",
        username: "preview",
        avatarMedia: null,
        bannerMedia: null,
        nitroEnabled: false,
        nitroMonths: 0,
        boostMonths: 0,
        giftLevel: -1,
        avatarDecoration: "",
        avatarDecorationSku: "",
        profileColorsEnabled: false,
        primaryColor: "#5865F2",
        accentColor: "#EB459E",
        bio: "",
        pronouns: "",
        createdAt: "",
        signupDate: "",
        oldName: "",
        replaceBadges: false,
        selectedBadges: {}
      });
      preview = defaultPreview();
      configReady = false;
      initPromise = null;
      realCordSyncTimer = null;
      realCordManagedPlugins = /* @__PURE__ */ new Set();
      realCordConfigFingerprint = "";
      REALCORD_NITRO_MONTHS = {
        bronze: 1,
        silver: 3,
        gold: 6,
        platinum: 12,
        diamond: 24,
        emerald: 36,
        ruby: 60,
        opal: 72
      };
      diagnostics = {
        patches: 0,
        userStore: false,
        profileStore: false,
        avatarResolver: false,
        bannerResolver: false,
        last: "Ready"
      };
      initialized2 = false;
      currentUserId = null;
      realCurrentUser = null;
      userCache = /* @__PURE__ */ new WeakMap();
      profileCache = /* @__PURE__ */ new WeakMap();
      SHARED_PROFILE_API = "https://getcloudcord.com";
      sharedProfiles = globalThis.__CLOUDCORD_SHARED_PROFILES__ ||= /* @__PURE__ */ new Map();
      sharedProfileFetchedAt = globalThis.__CLOUDCORD_SHARED_PROFILE_FETCHED_AT__ ||= /* @__PURE__ */ new Map();
      sharedRequests = /* @__PURE__ */ new Set();
      publishTimer = null;
      sharedSyncTimer = null;
      REPLACE_BADGES_SYNC_ID = "__cc_replace_real_badges";
    }
  });

  // src/core/ui/reporter/components/ErrorBoundaryScreen.tsx
  function ErrorBoundaryScreen(props) {
    var styles = useStyles2();
    var debugInfo = getDebugInfo();
    return /* @__PURE__ */ jsx(ErrorBoundary, {
      children: /* @__PURE__ */ jsx(SafeAreaProvider, {
        children: /* @__PURE__ */ jsxs(SafeAreaView, {
          style: styles.container,
          children: [
            /* @__PURE__ */ jsxs(import_react_native18.View, {
              style: {
                gap: 4
              },
              children: [
                /* @__PURE__ */ jsx(Text, {
                  variant: "display-lg",
                  children: "Uh oh."
                }),
                /* @__PURE__ */ jsx(Text, {
                  variant: "text-md/normal",
                  children: "A crash occurred while rendering a component. This could be caused by a plugin, CloudCord, or Discord itself."
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-sm/normal",
                  color: "text-muted",
                  children: [
                    debugInfo.os.name,
                    "; ",
                    debugInfo.discord.build,
                    " (",
                    debugInfo.discord.version,
                    "); ",
                    debugInfo.bunny.version
                  ]
                })
              ]
            }),
            /* @__PURE__ */ jsxs(import_react_native18.ScrollView, {
              fadingEdgeLength: 64,
              contentContainerStyle: {
                gap: 12
              },
              children: [
                /* @__PURE__ */ jsx(Codeblock, {
                  selectable: true,
                  children: props.error.message
                }),
                hasStack(props.error) && /* @__PURE__ */ jsx(ErrorStackCard, {
                  error: props.error
                }),
                isComponentStack(props.error) ? /* @__PURE__ */ jsx(ErrorComponentStackCard, {
                  componentStack: props.error.componentStack
                }) : null
              ]
            }),
            /* @__PURE__ */ jsxs(Card, {
              style: {
                gap: 6
              },
              children: [
                /* @__PURE__ */ jsx(Button, {
                  text: "Reload Discord",
                  onPress: () => BundleUpdaterManager.reload()
                }),
                !settings.safeMode?.enabled && /* @__PURE__ */ jsx(Button, {
                  text: "Reload in Safe Mode",
                  onPress: () => toggleSafeMode()
                }),
                /* @__PURE__ */ jsx(Button, {
                  variant: "destructive",
                  text: "Retry Render",
                  onPress: () => props.rerender()
                })
              ]
            })
          ]
        })
      })
    });
  }
  var import_react_native18, useStyles2;
  var init_ErrorBoundaryScreen = __esm({
    "src/core/ui/reporter/components/ErrorBoundaryScreen.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_isStack();
      init_debug();
      init_modules();
      init_settings();
      init_components2();
      init_styles();
      init_common();
      init_components();
      import_react_native18 = __toESM(require_react_native());
      init_ErrorComponentStackCard();
      init_ErrorStackCard();
      useStyles2 = createStyles({
        container: {
          flex: 1,
          backgroundColor: tokens.colors.BG_BASE_SECONDARY,
          paddingHorizontal: 16,
          height: "100%",
          gap: 12
        }
      });
    }
  });

  // src/core/debug/patches/patchErrorBoundary.tsx
  function getErrorBoundaryContext() {
    var ctxt = findByNameLazy("ErrorBoundary")[_lazyContextSymbol];
    return new Promise((resolve) => ctxt.getExports((exp) => resolve(exp.prototype)));
  }
  function patchErrorBoundary() {
    return after.await("render", getErrorBoundaryContext(), function() {
      if (!this.state.error)
        return;
      return /* @__PURE__ */ jsx(ErrorBoundaryScreen, {
        error: this.state.error,
        rerender: () => this.setState({
          info: null,
          error: null
        })
      });
    });
  }
  var init_patchErrorBoundary = __esm({
    "src/core/debug/patches/patchErrorBoundary.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_ErrorBoundaryScreen();
      init_patcher();
      init_lazy2();
      init_wrappers();
    }
  });

  // globals:moment
  var require_moment = __commonJS({
    "globals:moment"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["moment"];
    }
  });

  // src/core/fixes.ts
  function onDispatch({ locale }) {
    try {
      import_moment.default.locale(locale.toLowerCase());
    } catch (e) {
      logger.error("Failed to fix timestamps...", e);
    }
    FluxDispatcher.unsubscribe("I18N_LOAD_SUCCESS", onDispatch);
  }
  var import_moment, fixes_default;
  var init_fixes = __esm({
    "src/core/fixes.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_logger();
      init_common();
      import_moment = __toESM(require_moment());
      fixes_default = () => {
        FluxDispatcher.subscribe("I18N_LOAD_SUCCESS", onDispatch);
      };
    }
  });

  // globals:lodash
  var require_lodash = __commonJS({
    "globals:lodash"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["lodash"];
    }
  });

  // globals:util
  var require_util = __commonJS({
    "globals:util"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["util"];
    }
  });

  // src/core/vendetta/api.tsx
  var import_react5, import_react_native19, makeIcon, CompatRow, CompatSwitchRow, CompatSection, PatchedFormRow, PatchedFormSwitchRow, PatchedFormSection, PatchedForms, initVendettaObject;
  var init_api3 = __esm({
    "src/core/vendetta/api.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_alerts();
      init_storage();
      init_storage();
      init_themes();
      init_assets();
      init_commands();
      init_debug();
      init_loader();
      init_patcher();
      init_settings();
      init_utils();
      init_cyrb64();
      init_logger();
      init_metro();
      init_common();
      init_components();
      init_components();
      init_color();
      init_components2();
      init_styles();
      init_toasts();
      init_dist();
      import_react5 = __toESM(require_react());
      import_react_native19 = __toESM(require_react_native());
      init_plugins();
      makeIcon = (leading) => leading;
      CompatRow = TableRow ?? Forms.FormRow ?? ReactNative.View;
      CompatSwitchRow = TableSwitchRow ?? Forms.FormSwitchRow ?? CompatRow;
      CompatSection = TableRowGroup ?? Forms.FormSection ?? ReactNative.View;
      PatchedFormRow = (props) => /* @__PURE__ */ (0, import_react5.createElement)(CompatRow, {
        label: props.label,
        subLabel: props.subLabel,
        icon: makeIcon(props.leading),
        trailing: props.trailing,
        onPress: props.onPress,
        disabled: props.disabled,
        arrow: props.arrow
      });
      PatchedFormRow.Icon = Forms.FormRow?.Icon ?? TableRow?.Icon ?? (() => null);
      PatchedFormRow.Arrow = Forms.FormRow?.Arrow ?? TableRow?.Arrow ?? (() => null);
      PatchedFormSwitchRow = (props) => /* @__PURE__ */ (0, import_react5.createElement)(CompatSwitchRow, {
        label: props.label,
        subLabel: props.subLabel,
        icon: makeIcon(props.leading),
        value: !!props.value,
        onValueChange: props.onValueChange,
        disabled: props.disabled
      });
      PatchedFormSection = (props) => /* @__PURE__ */ (0, import_react5.createElement)(CompatSection, {
        title: props.title,
        ...props
      }, props.children);
      PatchedForms = {
        ...Forms,
        FormRow: PatchedFormRow,
        FormSwitchRow: PatchedFormSwitchRow,
        FormSection: PatchedFormSection,
        FormDivider: () => null
      };
      initVendettaObject = () => {
        var createStackBasedFilter = (fn) => {
          return (filter) => {
            return fn(factories_exports.createSimpleFilter(filter, cyrb64Hash(new Error().stack)));
          };
        };
        var api = globalThis.vendetta = {
          patcher: {
            before: patcher_default.before,
            after: patcher_default.after,
            instead: patcher_default.instead
          },
          metro: {
            modules: globalThis.modules,
            find: createStackBasedFilter(findExports),
            findAll: createStackBasedFilter(findAllExports),
            findByProps: (...props) => {
              if (props.length === 1 && props[0] === "KeyboardAwareScrollView") {
                props.push("listenToKeyboardEvents");
              }
              var ret = findByProps(...props);
              if (ret == null) {
                if (props.includes("ActionSheetTitleHeader")) {
                  var module = findByProps("ActionSheetRow");
                  return {
                    ...module,
                    ActionSheetTitleHeader: module.BottomSheetTitleHeader,
                    ActionSheetContentContainer: ({ children }) => {
                      (0, import_react5.useEffect)(() => console.warn("Discord has removed 'ActionSheetContentContainer', please move into something else. This has been temporarily replaced with View"), []);
                      return /* @__PURE__ */ (0, import_react5.createElement)(import_react_native19.View, null, children);
                    }
                  };
                }
              }
              return ret;
            },
            findByPropsAll: (...props) => findByPropsAll(...props),
            findByName: (name, defaultExp) => {
              if (name === "create" && typeof defaultExp === "undefined") {
                return findByName("create", false).default;
              }
              return findByName(name, defaultExp ?? true);
            },
            findByNameAll: (name, defaultExp = true) => findByNameAll(name, defaultExp),
            findByDisplayName: (displayName, defaultExp = true) => findByDisplayName(displayName, defaultExp),
            findByDisplayNameAll: (displayName, defaultExp = true) => findByDisplayNameAll(displayName, defaultExp),
            findByTypeName: (typeName, defaultExp = true) => findByTypeName(typeName, defaultExp),
            findByTypeNameAll: (typeName, defaultExp = true) => findByTypeNameAll(typeName, defaultExp),
            findByStoreName: (name) => findByStoreName(name),
            common: {
              constants,
              channels,
              i18n,
              url,
              toasts,
              stylesheet: {
                createThemedStyleSheet
              },
              clipboard,
              assets,
              invites,
              commands,
              navigation,
              navigationStack,
              NavigationNative,
              Flux,
              FluxDispatcher,
              React: React2,
              ReactNative,
              moment: require_moment(),
              chroma: require_chroma_js(),
              lodash: require_lodash(),
              util: require_util()
            }
          },
          constants: {
            DISCORD_SERVER: "https://discord.gg/n9QQ4XhhJP",
            GITHUB: "https://github.com/vendetta-mod",
            PROXY_PREFIX: "https://vd-plugins.github.io/proxy",
            HTTP_REGEX: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
            HTTP_REGEX_MULTI: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
            DISCORD_SERVER_ID: "1015931589865246730",
            PLUGINS_CHANNEL_ID: "1091880384561684561",
            THEMES_CHANNEL_ID: "1091880434939482202"
          },
          utils: {
            findInReactTree: (tree, filter) => findInReactTree(tree, filter),
            findInTree: (tree, filter, options) => findInTree(tree, filter, options),
            safeFetch: (input, options, timeout) => safeFetch(input, options, timeout),
            unfreeze: (obj) => Object.isFrozen(obj) ? {
              ...obj
            } : obj,
            without: (object, ...keys) => omit(object, keys)
          },
          debug: {
            connectToDebugger: (url2) => connectToDebugger2(url2),
            getDebugInfo: () => getDebugInfo()
          },
          ui: {
            components: {
              Forms: PatchedForms,
              General: ReactNative,
              Alert: LegacyAlert,
              Button: CompatButton,
              HelpMessage: (...props) => /* @__PURE__ */ jsx(HelpMessage, {
                ...props
              }),
              SafeAreaView: (...props) => /* @__PURE__ */ jsx(SafeAreaView, {
                ...props
              }),
              Summary,
              ErrorBoundary,
              Codeblock,
              Search: Search_default
            },
            toasts: {
              showToast: (content, asset) => showToast(content, asset)
            },
            alerts: {
              showConfirmationAlert: (options) => showConfirmationAlert(options),
              showCustomAlert: (component, props) => showCustomAlert(component, props),
              showInputAlert: (options) => showInputAlert(options)
            },
            assets: {
              all: new Proxy({}, {
                get(cache, p) {
                  if (typeof p !== "string")
                    return void 0;
                  if (cache[p])
                    return cache[p];
                  for (var asset of iterateAssets()) {
                    if (asset.name)
                      return cache[p] = asset;
                  }
                },
                ownKeys(cache) {
                  var keys = /* @__PURE__ */ new Set();
                  for (var asset of iterateAssets()) {
                    cache[asset.name] = asset;
                    keys.add(asset.name);
                  }
                  return [
                    ...keys
                  ];
                }
              }),
              find: (filter) => findAsset(filter),
              getAssetByName: (name) => findAsset(name),
              getAssetByID: (id) => findAsset(id),
              getAssetIDByName: (name) => findAssetId(name)
            },
            semanticColors,
            rawColors
          },
          plugins: {
            plugins: VdPluginManager.plugins,
            fetchPlugin: (source) => VdPluginManager.fetchPlugin(source),
            installPlugin: (source, enabled = true) => VdPluginManager.installPlugin(source, enabled),
            startPlugin: (id) => VdPluginManager.startPlugin(id),
            stopPlugin: (id, disable = true) => VdPluginManager.stopPlugin(id, disable),
            removePlugin: (id) => VdPluginManager.removePlugin(id),
            getSettings: (id) => VdPluginManager.getSettings(id)
          },
          themes: {
            themes,
            fetchTheme: (id, selected) => fetchTheme(id, selected),
            installTheme: (id) => installTheme(id),
            selectTheme: (id) => selectTheme(id === "default" ? null : themes[id]),
            removeTheme: (id) => removeTheme(id),
            getCurrentTheme: () => getThemeFromLoader(),
            updateThemes: () => updateThemes()
          },
          commands: {
            registerCommand
          },
          storage: {
            createProxy: (target) => createProxy(target),
            useProxy: (_storage) => useProxy(_storage),
            createStorage: (backend) => createStorage(backend),
            wrapSync: (store) => wrapSync(store),
            awaitSyncWrapper: (store) => awaitStorage(store),
            createMMKVBackend: (store) => createMMKVBackend(store),
            createFileBackend: (file) => {
              if (isPyonLoader() && file === "vendetta_theme.json") {
                file = "pyon/current-theme.json";
              }
              return createFileBackend(file);
            }
          },
          settings,
          loader: {
            identity: getVendettaLoaderIdentity() ?? void 0,
            config: loaderConfig
          },
          logger: {
            log: (...message) => console.log(...message),
            info: (...message) => console.info(...message),
            warn: (...message) => console.warn(...message),
            error: (...message) => console.error(...message),
            time: (...message) => console.time(...message),
            trace: (...message) => console.trace(...message),
            verbose: (...message) => console.log(...message)
          },
          version: versionHash,
          unload: () => {
            delete globalThis.vendetta;
          }
        };
        return () => api.unload();
      };
    }
  });

  // src/lib/addons/fonts/index.ts
  var fonts_exports = {};
  __export(fonts_exports, {
    fonts: () => fonts,
    installFont: () => installFont,
    removeFont: () => removeFont,
    saveFont: () => saveFont,
    selectFont: () => selectFont,
    updateFont: () => updateFont,
    updateFonts: () => updateFonts,
    validateFont: () => validateFont
  });
  function writeFont(font) {
    return _async_to_generator(function* () {
      if (!font && font !== null)
        throw new Error("Arg font must be a valid object or null");
      if (font) {
        yield writeFile("fonts.json", JSON.stringify(font));
      } else {
        yield removeFile("fonts.json");
      }
    })();
  }
  function validateFont(font) {
    if (!font || typeof font !== "object")
      throw new Error("URL returned a null/non-object JSON");
    if (typeof font.spec !== "number")
      throw new Error("Invalid font 'spec' number");
    if (font.spec !== 1)
      throw new Error("Only fonts which follows spec:1 are supported");
    var requiredFields = [
      "name",
      "main"
    ];
    if (requiredFields.some((f) => !font[f]))
      throw new Error(`Font is missing one of the fields: ${requiredFields}`);
    if (font.name.startsWith("__"))
      throw new Error("Font names cannot start with __");
    if (font.name in fonts)
      throw new Error(`There is already a font named '${font.name}' installed`);
  }
  function saveFont(data, selected = false) {
    return _async_to_generator(function* () {
      var fontDefJson;
      if (typeof data === "string") {
        try {
          fontDefJson = yield (yield safeFetch(data)).json();
        } catch (e) {
          throw new Error(`Failed to fetch fonts at ${data}`, {
            cause: e
          });
        }
      } else {
        fontDefJson = data;
      }
      validateFont(fontDefJson);
      var errors = yield allSettled(Object.entries(fontDefJson.main).map(([font, url2]) => _async_to_generator(function* () {
        var ext = url2.split(".").pop();
        if (ext !== "ttf" && ext !== "otf")
          ext = "ttf";
        var path = `downloads/fonts/${fontDefJson.name}/${font}.${ext}`;
        if (!(yield fileExists(path)))
          yield downloadFile(url2, path);
      })())).then((it) => it.map((it2) => it2.status === "fulfilled" ? void 0 : it2.reason));
      if (errors.some((it) => it))
        throw errors;
      fonts[fontDefJson.name] = fontDefJson;
      if (selected)
        writeFont(fonts[fontDefJson.name]);
      return fontDefJson;
    })();
  }
  function updateFont(fontDef) {
    return _async_to_generator(function* () {
      var fontDefCopy = {
        ...fontDef
      };
      if (fontDefCopy.source)
        fontDefCopy = {
          ...yield fetch(fontDefCopy.source).then((it) => it.json()),
          // Can't change these properties
          name: fontDef.name,
          source: fontDef.source
        };
      var selected = fonts.__selected === fontDef.name;
      yield removeFont(fontDef.name);
      yield saveFont(fontDefCopy, selected);
    })();
  }
  function installFont(url2, selected = false) {
    return _async_to_generator(function* () {
      var font = yield saveFont(url2);
      if (selected)
        yield selectFont(font.name);
    })();
  }
  function selectFont(name) {
    return _async_to_generator(function* () {
      if (name && !(name in fonts))
        throw new Error("Selected font does not exist!");
      if (name) {
        fonts.__selected = name;
      } else {
        delete fonts.__selected;
      }
      yield writeFont(name == null ? null : fonts[name]);
    })();
  }
  function removeFont(name) {
    return _async_to_generator(function* () {
      var selected = fonts.__selected === name;
      if (selected)
        yield selectFont(null);
      delete fonts[name];
      try {
        yield clearFolder(`downloads/fonts/${name}`);
      } catch (e) {
      }
    })();
  }
  function updateFonts() {
    return _async_to_generator(function* () {
      yield awaitStorage(fonts);
      allSettled(Object.keys(fonts).map((name) => saveFont(fonts[name], fonts.__selected === name)));
    })();
  }
  var fonts;
  var init_fonts = __esm({
    "src/lib/addons/fonts/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_storage();
      init_fs();
      init_utils();
      fonts = wrapSync(createStorage(createMMKVBackend("BUNNY_FONTS")));
    }
  });

  // src/global.d.ts
  var init_global_d = __esm({
    "src/global.d.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/modules.d.ts
  var init_modules_d = __esm({
    "src/modules.d.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // src/lib/ui/alerts.ts
  var alerts_exports2 = {};
  __export(alerts_exports2, {
    dismissAlert: () => dismissAlert,
    openAlert: () => openAlert
  });
  var openAlert, dismissAlert;
  var init_alerts2 = __esm({
    "src/lib/ui/alerts.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_metro();
      ({ openAlert, dismissAlert } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
    }
  });

  // src/lib/ui/settings/patches/shared.tsx
  function wrapOnPress(onPress, navigation2, renderPromise, screenOptions, props) {
    return () => _async_to_generator(function* () {
      if (onPress)
        return void onPress();
      var Component = yield renderPromise().then((m2) => m2.default);
      if (typeof screenOptions === "string") {
        screenOptions = {
          title: screenOptions
        };
      }
      navigation2 ??= tabsNavigationRef.getRootNavigationRef();
      navigation2.navigate("PUPU_CUSTOM_PAGE", {
        ...screenOptions,
        render: () => /* @__PURE__ */ jsx(Component, {
          ...props
        })
      });
    })();
  }
  var tabsNavigationRef, CustomPageRenderer;
  var init_shared = __esm({
    "src/lib/ui/settings/patches/shared.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_common();
      init_wrappers();
      init_components2();
      tabsNavigationRef = findByPropsLazy("getRootNavigationRef");
      CustomPageRenderer = React.memo(() => {
        var navigation2 = NavigationNative.useNavigation();
        var route = NavigationNative.useRoute();
        var { render: PageComponent, ...args } = route.params;
        React.useEffect(() => void navigation2.setOptions({
          ...args
        }), []);
        return /* @__PURE__ */ jsx(ErrorBoundary, {
          children: /* @__PURE__ */ jsx(PageComponent, {})
        });
      });
    }
  });

  // src/lib/ui/settings/patches/panel.tsx
  function SettingsSection() {
    var navigation2 = NavigationNative.useNavigation();
    return /* @__PURE__ */ jsx(Fragment, {
      children: Object.keys(registeredSections).map((sect) => registeredSections[sect].length > 0 && /* @__PURE__ */ jsx(LegacyFormSection, {
        title: sect,
        children: registeredSections[sect].filter((r) => r.usePredicate?.() ?? true).map((row, i, arr) => /* @__PURE__ */ jsxs(Fragment, {
          children: [
            /* @__PURE__ */ jsx(LegacyFormRow, {
              label: row.title(),
              leading: /* @__PURE__ */ jsx(LegacyFormIcon, {
                source: row.icon
              }),
              trailing: /* @__PURE__ */ jsx(LegacyFormRow.Arrow, {
                label: row.useTrailing?.() || void 0
              }),
              onPress: wrapOnPress(row.onPress, navigation2, row.render, row.title())
            }),
            i !== arr.length - 1 && /* @__PURE__ */ jsx(LegacyFormDivider, {})
          ]
        }))
      }, sect))
    });
  }
  function patchPanelUI(unpatches) {
    try {
      unpatches.push(after("default", findByNameLazy("getScreens", false), (_a, screens) => ({
        ...screens,
        VendettaCustomPage: {
          title: "CloudCord",
          render: () => /* @__PURE__ */ jsx(CustomPageRenderer, {})
        },
        BUNNY_CUSTOM_PAGE: {
          title: "CloudCord",
          render: () => /* @__PURE__ */ jsx(CustomPageRenderer, {})
        },
        PUPU_CUSTOM_PAGE: {
          title: "CloudCord",
          render: () => /* @__PURE__ */ jsx(CustomPageRenderer, {})
        }
      })));
      var unpatch = after("default", findByNameLazy("UserSettingsOverviewWrapper", false), (_a, ret) => {
        var UserSettingsOverview = findInReactTree(ret.props.children, (n) => n.type?.name === "UserSettingsOverview");
        unpatches.push(after("renderSupportAndAcknowledgements", UserSettingsOverview.type.prototype, (_args, { props: { children } }) => {
          var index = children.findIndex((c2) => c2?.type?.name === "UploadLogsButton");
          if (index !== -1)
            children.splice(index, 1);
        }));
        unpatches.push(after("render", UserSettingsOverview.type.prototype, (_args, res) => {
          var titles = [
            i18n.Messages.BILLING_SETTINGS,
            i18n.Messages.PREMIUM_SETTINGS
          ];
          var sections = findInReactTree(res.props.children, (n) => n?.children?.[1]?.type === LegacyFormSection)?.children || res.props.children;
          if (sections) {
            var index = sections.findIndex((c2) => titles.includes(c2?.props.label));
            sections.splice(-~index || 4, 0, /* @__PURE__ */ jsx(SettingsSection, {}));
          }
        }));
      }, true);
      unpatches.push(unpatch);
    } catch (e) {
    }
  }
  var init_panel = __esm({
    "src/lib/ui/settings/patches/panel.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_patcher();
      init_utils();
      init_common();
      init_components();
      init_wrappers();
      init_settings2();
      init_shared();
    }
  });

  // src/lib/ui/settings/patches/tabs.tsx
  function useIsFirstRender() {
    var firstRender = false;
    React.useEffect(() => void (firstRender = true), []);
    return firstRender;
  }
  function patchTabsUI(unpatches) {
    var getRows = () => Object.values(registeredSections).flatMap((sect) => sect.map((row) => ({
      [row.key]: {
        type: "pressable",
        // title was renamed to useTitle, both are here for compatibility (thanks kmiioo) https://codeberg.org/raincord/rain/pulls/52
        title: row.title,
        useTitle: row.title,
        icon: row.icon,
        IconComponent: () => /* @__PURE__ */ jsx(TableRow.Icon, {
          source: row.icon
        }),
        usePredicate: row.usePredicate,
        useTrailing: row.useTrailing,
        onPress: wrapOnPress(row.onPress, null, row.render, row.title()),
        withArrow: true
      }
    }))).reduce((a, c2) => Object.assign(a, c2));
    var origRendererConfig = settingConstants.SETTING_RENDERER_CONFIG;
    var rendererConfigValue = settingConstants.SETTING_RENDERER_CONFIG;
    Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
      enumerable: true,
      configurable: true,
      get: () => ({
        ...rendererConfigValue,
        VendettaCustomPage: {
          type: "route",
          title: () => "CloudCord",
          useTitle: () => "CloudCord",
          screen: {
            route: "VendettaCustomPage",
            getComponent: () => CustomPageRenderer
          }
        },
        PUPU_CUSTOM_PAGE: {
          type: "route",
          title: () => "CloudCord",
          useTitle: () => "CloudCord",
          screen: {
            route: "PUPU_CUSTOM_PAGE",
            getComponent: () => CustomPageRenderer
          }
        },
        BUNNY_CUSTOM_PAGE: {
          type: "route",
          title: () => "CloudCord",
          useTitle: () => "CloudCord",
          screen: {
            route: "BUNNY_CUSTOM_PAGE",
            getComponent: () => CustomPageRenderer
          }
        },
        ...getRows()
      }),
      set: (v2) => rendererConfigValue = v2
    });
    unpatches.push(() => {
      Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
        value: origRendererConfig,
        writable: true,
        get: void 0,
        set: void 0
      });
    });
    try {
      unpatches.push(after("createList", createListModule, function(args, ret) {
        var [config] = args;
        if (config?.sections && Array.isArray(config.sections)) {
          var sections = config.sections;
          var accountSectionIndex = sections.findIndex((i) => i.settings?.includes("ACCOUNT"));
          if (accountSectionIndex !== -1) {
            var index = accountSectionIndex + 1;
            Object.keys(registeredSections).forEach((sect) => {
              var alreadyExists = sections.some((s) => s.label === sect);
              if (!alreadyExists) {
                sections.splice(index++, 0, {
                  label: sect,
                  title: sect,
                  settings: registeredSections[sect].map((a) => a.key)
                });
              }
            });
          }
        }
        return ret;
      }));
    } catch (e) {
      unpatches.push(after("default", SettingsOverviewScreen, (_2, ret) => {
        if (useIsFirstRender())
          return;
        var { sections } = findInReactTree(ret, (i) => i.props?.sections).props;
        var index = -~sections.findIndex((i) => i.settings.includes("ACCOUNT")) || 1;
        Object.keys(registeredSections).forEach((sect) => {
          sections.splice(index++, 0, {
            label: sect,
            title: sect,
            settings: registeredSections[sect].map((a) => a.key)
          });
        });
      }));
    }
  }
  var settingConstants, createListModule, SettingsOverviewScreen;
  var init_tabs = __esm({
    "src/lib/ui/settings/patches/tabs.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_patcher();
      init_components();
      init_wrappers();
      init_settings2();
      init_shared();
      init_utils();
      settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
      createListModule = findByPropsLazy("createList");
      SettingsOverviewScreen = findByNameLazy("SettingsOverviewScreen", false);
    }
  });

  // src/lib/ui/settings/index.tsx
  var settings_exports2 = {};
  __export(settings_exports2, {
    patchSettings: () => patchSettings,
    registerSection: () => registerSection,
    registeredSections: () => registeredSections
  });
  function registerSection(section) {
    registeredSections[section.name] = section.items;
    return () => delete registeredSections[section.name];
  }
  function patchSettings() {
    var unpatches = new Array();
    patchTabsUI(unpatches);
    patchPanelUI(unpatches);
    return () => unpatches.forEach((u) => u());
  }
  var registeredSections;
  var init_settings2 = __esm({
    "src/lib/ui/settings/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_panel();
      init_tabs();
      registeredSections = {};
    }
  });

  // src/lib/ui/index.ts
  var ui_exports = {};
  __export(ui_exports, {
    alerts: () => alerts_exports2,
    components: () => components_exports2,
    settings: () => settings_exports2,
    sheets: () => sheets_exports,
    styles: () => styles_exports,
    toasts: () => toasts_exports
  });
  var init_ui = __esm({
    "src/lib/ui/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_alerts2();
      init_components2();
      init_settings2();
      init_sheets();
      init_styles();
      init_toasts();
    }
  });

  // src/lib/index.ts
  var lib_exports = {};
  __export(lib_exports, {
    _jsx: () => jsxRuntime_exports,
    api: () => api_exports,
    fonts: () => fonts_exports,
    managers: () => managers,
    metro: () => metro_exports,
    plugins: () => plugins_exports2,
    themes: () => themes_exports,
    ui: () => ui_exports,
    unload: () => unload,
    utils: () => utils_exports
  });
  function unload() {
    for (var d of _disposer)
      if (typeof d === "function")
        d();
    delete globalThis.bunny;
  }
  var managers, _disposer;
  var init_lib = __esm({
    "src/lib/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_global_d();
      init_modules_d();
      init_fonts();
      init_plugins4();
      init_themes();
      init_api();
      init_ui();
      init_utils();
      init_metro();
      init_fonts();
      init_plugins4();
      init_themes();
      init_jsxRuntime();
      init_lazy();
      managers = proxyLazy(() => {
        console.warn("bunny.managers.* is deprecated, and moved the top level (bunny.*). bunny.managers will be eventually removed soon");
        return {
          get fonts() {
            return fonts_exports;
          },
          get plugins() {
            return plugins_exports2;
          },
          get themes() {
            return themes_exports;
          }
        };
      }, {
        hint: "object"
      });
      _disposer = [];
      unload.push = (fn) => {
        _disposer.push(fn);
      };
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default
  });
  var src_default;
  var init_src = __esm({
    "src/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_legacyRuntimeRefresh();
      init_CloudCordVerification();
      init_FakeProfile();
      init_patchErrorBoundary();
      init_fixes();
      init_i18n();
      init_api3();
      init_plugins();
      init_fonts();
      init_plugins4();
      init_themes();
      init_commands();
      init_debug();
      init_flux();
      init_jsx();
      init_logger();
      init_debug();
      init_lib();
      src_default = () => _async_to_generator(function* () {
        yield initLegacyRuntimeRefresh();
        yield Promise.all([
          initThemes(),
          injectFluxInterceptor(),
          patchLogHook(),
          patchCommands(),
          patchJsx(),
          initVendettaObject(),
          initFetchI18nStrings(),
          initializeFakeProfile(),
          initializeCloudCordVerification(),
          fixes_default(),
          patchErrorBoundary(),
          updatePlugins(),
          updateFonts(),
          initPlugins(),
          VdPluginManager.initPlugins()
        ]).then(
          // Push them all to unloader
          (u) => [
            ...cloudCordCoreUnloads,
            ...u
          ].forEach((f) => f && unload.push(f))
        );
        initDebugger();
        globalThis.bunny = lib_exports;
        logger.log("CloudCord is ready!");
      })();
    }
  });

  // src/entry.ts
  init_asyncIteratorSymbol();
  init_promiseAllSettled();
  init_async_to_generator();
  var { instead: instead3 } = require_cjs();
  globalThis.window = globalThis;
  function initializeCloudCord() {
    return _async_to_generator(function* () {
      try {
        Object.freeze = Object.seal = Object;
        yield (init_caches(), __toCommonJS(caches_exports)).initMetroCache();
        (init_src(), __toCommonJS(src_exports)).default();
      } catch (e) {
        var { ClientInfoManager } = (init_modules(), __toCommonJS(modules_exports));
        var stack = e instanceof Error ? e.stack : void 0;
        console.log(stack ?? e?.toString?.() ?? e);
        alert([
          "Failed to load CloudCord!\n",
          `Build Number: ${ClientInfoManager.getConstants().Build}`,
          `CloudCord: ${"v1.4.3"}`,
          stack || e?.toString?.()
        ].join("\n"));
      }
    })();
  }
  if (typeof globalThis.__r === "undefined") {
    deferredCalls = [];
    unpatches = [];
    deferMethodExecution = (object, method, condition, resume, returnWith) => {
      var restore = instead3(method, object, function(args, original) {
        if (!condition || condition(...args)) {
          var queue = {
            object,
            method,
            args,
            resume
          };
          deferredCalls.push(queue);
          return returnWith ? returnWith(queue) : void 0;
        }
        return original.apply(this, args);
      });
      unpatches.push(restore);
    };
    resumeDeferred = () => {
      for (var queue of deferredCalls) {
        var { object, method, args, resume } = queue;
        if (resume) {
          resume(queue);
        } else {
          object[method](...args);
        }
      }
      deferredCalls.length = 0;
    };
    onceIndexRequired = (originalRequire) => {
      if (globalThis.__fbBatchedBridge) {
        var batchedBridge = globalThis.__fbBatchedBridge;
        deferMethodExecution(
          batchedBridge,
          "callFunctionReturnFlushedQueue",
          // If the call is to AppRegistry, we want to defer it because it is not yet registered (Revenge delays it)
          // Same goes to the non-callable modules, which are not registered yet, so we ensure that only registered ones can get through
          (...args) => args[0] === "AppRegistry" || !batchedBridge.getCallableModule(args[0]),
          ({ args }) => {
            if (batchedBridge.getCallableModule(args[0])) {
              batchedBridge.__callFunction(...args);
            }
          },
          () => batchedBridge.flushedQueue()
        );
      }
      if (globalThis.RN$AppRegistry) {
        deferMethodExecution(globalThis.RN$AppRegistry, "runApplication");
      }
      var startDiscord = () => _async_to_generator(function* () {
        yield initializeCloudCord();
        for (var unpatch of unpatches)
          unpatch();
        unpatches.length = 0;
        originalRequire(0);
        resumeDeferred();
      })();
      startDiscord();
    };
    Object.defineProperties(globalThis, {
      __r: {
        configurable: true,
        get: () => _requireFunc,
        set(v2) {
          _requireFunc = function patchedRequire(a) {
            if (a === 0) {
              if (globalThis.modules instanceof Map)
                globalThis.modules = Object.fromEntries(globalThis.modules);
              onceIndexRequired(v2);
              _requireFunc = v2;
            } else
              return v2(a);
          };
        }
      },
      __d: {
        configurable: true,
        get() {
          if (globalThis.Object && !globalThis.modules) {
            globalThis.modules = globalThis.__c?.();
          }
          return this.value;
        },
        set(v2) {
          this.value = v2;
        }
      }
    });
  } else {
    initializeCloudCord();
  }
  var _requireFunc;
  var deferredCalls;
  var unpatches;
  var deferMethodExecution;
  var resumeDeferred;
  var onceIndexRequired;
})();
//# sourceURL=kettu
