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

  // node_modules/@swc/helpers/esm/_construct.js
  function _construct(Parent, args, Class) {
    if (_is_native_reflect_construct())
      _construct = Reflect.construct;
    else {
      _construct = function construct(Parent2, args2, Class2) {
        var a = [
          null
        ];
        a.push.apply(a, args2);
        var Constructor = Function.bind.apply(Parent2, a);
        var instance = new Constructor();
        if (Class2)
          _set_prototype_of(instance, Class2.prototype);
        return instance;
      };
    }
    return _construct.apply(null, arguments);
  }
  var init_construct = __esm({
    "node_modules/@swc/helpers/esm/_construct.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_is_native_reflect_construct();
      init_set_prototype_of();
    }
  });

  // node_modules/@swc/helpers/esm/_is_native_function.js
  function _is_native_function(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }
  var init_is_native_function = __esm({
    "node_modules/@swc/helpers/esm/_is_native_function.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/@swc/helpers/esm/_wrap_native_super.js
  function _wrap_native_super(Class) {
    var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
    _wrap_native_super = function _wrap_native_super2(Class2) {
      if (Class2 === null || !_is_native_function(Class2))
        return Class2;
      if (typeof Class2 !== "function")
        throw new TypeError("Super expression must either be null or a function");
      if (typeof _cache !== "undefined") {
        if (_cache.has(Class2))
          return _cache.get(Class2);
        _cache.set(Class2, Wrapper);
      }
      function Wrapper() {
        return _construct(Class2, arguments, _get_prototype_of(this).constructor);
      }
      Wrapper.prototype = Object.create(Class2.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _set_prototype_of(Wrapper, Class2);
    };
    return _wrap_native_super(Class);
  }
  var init_wrap_native_super = __esm({
    "node_modules/@swc/helpers/esm/_wrap_native_super.js"() {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_construct();
      init_get_prototype_of();
      init_is_native_function();
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

  // node_modules/es-toolkit/dist/predicate/isNotNil.mjs
  function isNotNil(x2) {
    return x2 != null;
  }
  var init_isNotNil = __esm({
    "node_modules/es-toolkit/dist/predicate/isNotNil.mjs"() {
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
      init_isNotNil();
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
      OFFICIAL_PLUGINS_REPO_URL = "";
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
  function isRa1nLoader() {
    return rainLoaderIdentity != null;
  }
  function polyfillVendettaLoaderIdentity() {
    if (!isPyonLoader() || isVendettaLoader() || !isRa1nLoader())
      return null;
    var loader;
    if (isRa1nLoader() == true) {
      loader = {
        name: rainLoaderIdentity.loaderName,
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
    if (isPyonLoader())
      return pyonLoaderIdentity.loaderName;
    else if (isRa1nLoader())
      return rainLoaderIdentity.loadername;
    else if (isVendettaLoader())
      return vendettaLoaderIdentity.name;
    return "Unknown";
  }
  function getLoaderVersion() {
    if (isPyonLoader())
      return pyonLoaderIdentity.loaderVersion;
    else if (isRa1nLoader())
      return rainLoaderIdentity.loaderVersion;
    return null;
  }
  function isLoaderConfigSupported() {
    if (isPyonLoader()) {
      return true;
    } else if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.loaderConfig;
    } else if (isRa1nLoader()) {
      return true;
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
    if (isPyonLoader()) {
      return "pyoncord/current-theme.json";
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
      globalThis.__pyoncord_rdt = globalThis.__REACT_DEVTOOLS__.exports;
      return "__pyoncord_rdt";
    }
    if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.devtools.prop;
    }
    return null;
  }
  function getReactDevToolsVersion() {
    if (!isReactDevToolsPreloaded())
      return null;
    if (isPyonLoader()) {
      return globalThis.__REACT_DEVTOOLS__.version || null;
    }
    if (isVendettaLoader()) {
      return vendettaLoaderIdentity.features.devtools.version;
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
    if (isPyonLoader()) {
      return "pyoncord/loader.json";
    } else if (isVendettaLoader()) {
      return "vendetta_loader.json";
    } else if (isRa1nLoader()) {
      return "rain/loader.json";
    }
    return "loader.json";
  }
  function isFontSupported() {
    if (isPyonLoader())
      return pyonLoaderIdentity.fontPatch === 2;
    return false;
  }
  var pyonLoaderIdentity, rainLoaderIdentity, vendettaLoaderIdentity;
  var init_loader = __esm({
    "src/lib/api/native/loader.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_fs();
      pyonLoaderIdentity = globalThis.__PYON_LOADER__;
      rainLoaderIdentity = globalThis.__RAIN_LOADER__;
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
          url: "http://localhost:4040/kettu.js"
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
          if (_source[prop] && exportsKeysLength >= _source[prop]) {
            continue;
          }
          _module[prop] = actualExports[prop];
          _source[prop] = Reflect.ownKeys(actualExports).length;
          cacher.cacheId(id);
          if (exportsKeysLength === 1) {
            redesignProps.delete(prop);
          }
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
        resolveRNStyle: import_react_native5.StyleSheet.flatten
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
    var PlatformConstants = import_react_native5.Platform.constants;
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
      ...import_react_native5.Platform.select({
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
      ...import_react_native5.Platform.select({
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
  var import_react_native5, socket2, originalConsoleLog2, originalConsoleError2, originalConsoleWarn2, originalLoggerLog2, originalLoggerError2, originalLoggerWarn2, VERSION2, rdtPort, rdtClient, rdtConnected, changeHooks, versionHash;
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
      import_react_native5 = __toESM(require_react_native());
      VERSION2 = 1;
      rdtPort = 8097;
      rdtClient = null;
      rdtConnected = false;
      changeHooks = /* @__PURE__ */ new Set();
      versionHash = "v0.1";
    }
  });

  // src/lib/ui/components/wrappers/AlertModal.tsx
  function AlertModal2(props) {
    var forwardFailedModal = findByFilePath("modules/forwarding/native/ForwardFailedAlertModal.tsx");
    if (!forwardFailedModal && "extraContent" in props) {
      props.content = /* @__PURE__ */ jsxs(import_react_native6.View, {
        style: {
          gap: 16
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "text-md/medium",
            color: "text-muted",
            children: props.content
          }),
          /* @__PURE__ */ jsx(import_react_native6.View, {
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
  var import_react_native6, _AlertModal, _AlertActionButton, AlertActionButton2;
  var init_AlertModal = __esm({
    "src/lib/ui/components/wrappers/AlertModal.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_lazy();
      init_metro();
      init_components();
      import_react_native6 = __toESM(require_react_native());
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
      sheet[key] = new Proxy(import_react_native7.StyleSheet.flatten(sheet[key]), {
        get(target, prop, receiver) {
          var res = Reflect.get(target, prop, receiver);
          return isSemanticColor(res) ? resolveSemanticColor(res) : res;
        }
      });
    }
    return sheet;
  }
  var import_react_native7, Styles, ThemeContext, TextStyleSheet;
  var init_styles = __esm({
    "src/lib/ui/styles.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_wrappers();
      init_color();
      import_react_native7 = __toESM(require_react_native());
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
    return import_react_native8.Platform.select({
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
  var import_react_native8, useStyles, InputBasedCodeblock, TextBasedCodeblock;
  var init_Codeblock = __esm({
    "src/lib/ui/components/Codeblock.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_common();
      init_color();
      init_styles();
      import_react_native8 = __toESM(require_react_native());
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
      InputBasedCodeblock = ({ style, children }) => /* @__PURE__ */ jsx(import_react_native8.TextInput, {
        editable: false,
        multiline: true,
        style: [
          useStyles().codeBlock,
          style && style
        ],
        value: children
      });
      TextBasedCodeblock = ({ selectable, style, children }) => /* @__PURE__ */ jsx(import_react_native8.Text, {
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

  // globals:react
  var require_react = __commonJS({
    "globals:react"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      module.exports = require_depsModule()["react"];
    }
  });

  // src/core/ui/reporter/components/ErrorComponentStackCard.tsx
  function ErrorComponentStackCard(props) {
    var [collapsed, setCollapsed] = (0, import_react.useState)(true);
    var stack;
    try {
      stack = parseComponentStack(props.componentStack);
      stack = collapsed ? stack.slice(0, 4) : stack;
    } catch (e) {
      return;
    }
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(import_react_native9.View, {
        style: {
          gap: 8
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/bold",
            children: "Component Stack"
          }),
          /* @__PURE__ */ jsx(import_react_native9.View, {
            style: {
              gap: 4
            },
            children: stack.map((component) => /* @__PURE__ */ jsxs(import_react_native9.View, {
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
          /* @__PURE__ */ jsxs(import_react_native9.View, {
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
                icon: collapsed ? findAssetId("down_arrow") : /* @__PURE__ */ jsx(import_react_native9.Image, {
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
  var import_react, import_react_native9;
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
      import_react = __toESM(require_react());
      import_react_native9 = __toESM(require_react_native());
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
    var [collapsed, setCollapsed] = (0, import_react2.useState)(true);
    var stack;
    try {
      var parsedErrorStack = parseErrorStack(props.error.stack);
      stack = collapsed ? parsedErrorStack.slice(0, 4) : parsedErrorStack;
    } catch (e) {
      return null;
    }
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(import_react_native10.View, {
        style: {
          gap: 12
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "heading-lg/bold",
            children: "Call Stack"
          }),
          /* @__PURE__ */ jsx(import_react_native10.View, {
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
                onPress: () => clipboard.setString(props.error.stack)
              })
            ]
          })
        ]
      })
    });
  }
  function Line(props) {
    var [collapsed, setCollapsed] = (0, import_react2.useState)(true);
    return /* @__PURE__ */ jsxs(import_react_native10.Pressable, {
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
  var import_react2, import_react_native10;
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
      import_react2 = __toESM(require_react());
      import_react_native10 = __toESM(require_react_native());
      init_ErrorCard();
    }
  });

  // src/core/ui/reporter/components/ErrorDetailsActionSheet.tsx
  function ErrorDetailsActionSheet(props) {
    return /* @__PURE__ */ jsx(ActionSheet, {
      children: /* @__PURE__ */ jsxs(import_react_native11.View, {
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
  var import_react_native11;
  var init_ErrorDetailsActionSheet = __esm({
    "src/core/ui/reporter/components/ErrorDetailsActionSheet.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_isStack();
      init_components2();
      init_components();
      import_react_native11 = __toESM(require_react_native());
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
    return /* @__PURE__ */ jsx(import_react_native12.Image, {
      style: {
        width: 16,
        height: 16
      },
      source: findAssetId("icon-search")
    });
  }
  var import_react_native12, Search_default;
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
      import_react_native12 = __toESM(require_react_native());
      Search_default = ({ onChangeText, placeholder, style, isRound }) => {
        var [query, setQuery] = React.useState("");
        var onChange = (value) => {
          setQuery(value);
          onChangeText?.(value);
        };
        return /* @__PURE__ */ jsx(ErrorBoundary, {
          children: /* @__PURE__ */ jsx(import_react_native12.View, {
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
              import_react_native13.LayoutAnimation.configureNext(import_react_native13.LayoutAnimation.Presets.easeInEaseOut);
          }
        }),
        !hidden && /* @__PURE__ */ jsx(Fragment, {
          children: /* @__PURE__ */ jsx(import_react_native13.View, {
            style: !noPadding && {
              paddingHorizontal: 15
            },
            children
          })
        })
      ]
    });
  }
  var import_react_native13;
  var init_Summary = __esm({
    "src/lib/ui/components/Summary.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_components();
      import_react_native13 = __toESM(require_react_native());
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

  // src/core/ui/reporter/components/ErrorBoundaryScreen.tsx
  function ErrorBoundaryScreen(props) {
    var styles = useStyles2();
    var debugInfo = getDebugInfo();
    return /* @__PURE__ */ jsx(ErrorBoundary, {
      children: /* @__PURE__ */ jsx(SafeAreaProvider, {
        children: /* @__PURE__ */ jsxs(SafeAreaView, {
          style: styles.container,
          children: [
            /* @__PURE__ */ jsxs(import_react_native14.View, {
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
            /* @__PURE__ */ jsxs(import_react_native14.ScrollView, {
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
  var import_react_native14, useStyles2;
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
      import_react_native14 = __toESM(require_react_native());
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

  // src/assets/icons/fakeprofile.png
  var fakeprofile_default;
  var init_fakeprofile = __esm({
    "src/assets/icons/fakeprofile.png"() {
      fakeprofile_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAB/HSuDAAEAAElEQVR42uzdd5ycZbn/8e+UZ/psze6m9w6hhBAQhABSRAQkVAVE9AgEUIryOx45otiOx4rYQIpYQEEEpAlBukgwlCQmlDRCQvr23anPPDO/Pzb3nWc2oXgEsgmf9+uVV5LNtpl5ZjPX977u6w5IqggAAAAAAOzSgtwFAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAA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ABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAg/wW4AAAGySURBVAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAAgAuAQAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAIAAAAAAABAAAAAAAAAAAgAAAAAAAAAAQAAAAAAACAAAAAAAAAABAAAAAAAABAAAAAAAAAAAgAAAAAAAEAAAAAAAAAACAAAAAAAAAABAAAAAAAAIAAAAAAAAAAEAAAAAAAAgAAAAAAAAAACAAAAAAAAQAAAAAAAAAAIAAAAAAAAwFHg/wPyYTsJ721sOAAAAABJRU5ErkJggg==";
    }
  });

  // src/assets/icons/kettu.png
  var kettu_default;
  var init_kettu = __esm({
    "src/assets/icons/kettu.png"() {
      kettu_default = "data:image/png;base64,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";
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
    return () => unpatches.forEach((u) => u());
  }
  var registeredSections;
  var init_settings2 = __esm({
    "src/lib/ui/settings/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_tabs();
      registeredSections = {};
    }
  });

  // src/core/debug/safeMode.ts
  function isSafeMode() {
    return settings.safeMode?.enabled === true;
  }
  function toggleSafeMode2() {
    return _async_to_generator(function* ({ to = !isSafeMode(), reload = true } = {}) {
      var enabled = (settings.safeMode ??= {
        enabled: to
      }).enabled = to;
      var currentColor = getCurrentTheme();
      yield writeThemeToNative(enabled ? {} : currentColor?.data ?? {});
      if (reload)
        setTimeout(() => BundleUpdaterManager.reload(), 500);
    }).apply(this, arguments);
  }
  var init_safeMode = __esm({
    "src/core/debug/safeMode.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_themes();
      init_modules();
      init_settings();
    }
  });

  // src/core/ui/settings/pages/General/Version.tsx
  function Version({ label, version, icon }) {
    return /* @__PURE__ */ jsx(TableRow, {
      label,
      trailing: /* @__PURE__ */ jsx(TableRowTrailingText, {
        text: version
      }),
      icon: /* @__PURE__ */ jsx(TableRow.Icon, {
        source: typeof icon === "string" ? findAssetId(icon) : icon
      }),
      onPress: () => {
        clipboard.setString(`${label} - ${version}`);
        showToast.showCopyToClipboard();
      }
    });
  }
  var init_Version = __esm({
    "src/core/ui/settings/pages/General/Version.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_common();
      init_components();
      init_toasts();
    }
  });

  // src/core/ui/settings/pages/General/About.tsx
  function About() {
    var debugInfo = getDebugInfo();
    useProxy(settings);
    var versions = [
      {
        label: Strings.PUPU,
        version: debugInfo.bunny.version,
        icon: {
          uri: kettu_default
        }
      },
      {
        label: "Discord",
        version: `${debugInfo.discord.version} (${debugInfo.discord.build})`,
        icon: "Discord"
      },
      {
        label: "React",
        version: debugInfo.react.version,
        icon: "ScienceIcon"
      },
      {
        label: "React Native",
        version: debugInfo.react.nativeVersion,
        icon: "MobilePhoneIcon"
      },
      {
        label: Strings.BYTECODE,
        version: debugInfo.hermes.bytecodeVersion,
        icon: "TopicsIcon"
      }
    ];
    var platformInfo = [
      {
        label: Strings.LOADER,
        version: `${debugInfo.bunny.loader.name} (${debugInfo.bunny.loader.version})`,
        icon: "DownloadIcon"
      },
      {
        label: Strings.OPERATING_SYSTEM,
        version: `${debugInfo.os.name} ${debugInfo.os.version}`,
        icon: "ScreenIcon"
      },
      ...debugInfo.os.sdk ? [
        {
          label: "SDK",
          version: debugInfo.os.sdk,
          icon: "StaffBadgeIcon"
        }
      ] : [],
      {
        label: Strings.MANUFACTURER,
        version: debugInfo.device.manufacturer,
        icon: "WrenchIcon"
      },
      ...import_react_native15.Platform.OS !== "ios" ? [
        {
          label: Strings.BRAND,
          version: debugInfo.device.brand,
          icon: "MagicWandIcon"
        }
      ] : [],
      {
        label: Strings.MODEL,
        version: debugInfo.device.model,
        icon: "MobilePhoneIcon"
      },
      {
        label: import_react_native15.Platform.select({
          android: Strings.CODENAME,
          ios: Strings.MODELID
        }),
        version: debugInfo.device.codename,
        icon: "TagIcon"
      }
    ];
    return /* @__PURE__ */ jsx(import_react_native15.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingBottom: 38
      },
      children: /* @__PURE__ */ jsxs(Stack, {
        style: {
          paddingVertical: 24,
          paddingHorizontal: 12
        },
        spacing: 24,
        children: [
          /* @__PURE__ */ jsx(TableRowGroup, {
            title: Strings.VERSIONS,
            children: versions.map((v2) => /* @__PURE__ */ jsx(Version, {
              label: v2.label,
              version: v2.version,
              icon: v2.icon
            }))
          }),
          /* @__PURE__ */ jsx(TableRowGroup, {
            title: Strings.PLATFORM,
            children: platformInfo.map((p) => /* @__PURE__ */ jsx(Version, {
              label: p.label,
              version: p.version,
              icon: p.icon
            }))
          })
        ]
      })
    });
  }
  var import_react_native15;
  var init_About = __esm({
    "src/core/ui/settings/pages/General/About.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_i18n();
      init_settings3();
      init_Version();
      init_storage();
      init_debug();
      init_settings();
      init_components();
      import_react_native15 = __toESM(require_react_native());
    }
  });

  // src/lib/ui/alerts.ts
  var alerts_exports = {};
  __export(alerts_exports, {
    dismissAlert: () => dismissAlert,
    openAlert: () => openAlert
  });
  var openAlert, dismissAlert;
  var init_alerts = __esm({
    "src/lib/ui/alerts.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_lazy();
      init_metro();
      ({ openAlert, dismissAlert } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
    }
  });

  // src/core/ui/settings/pages/General/index.tsx
  var General_exports = {};
  __export(General_exports, {
    default: () => General
  });
  function General() {
    useProxy(settings);
    var debugInfo = getDebugInfo();
    var navigation2 = NavigationNative.useNavigation();
    return /* @__PURE__ */ jsx(import_react_native16.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingBottom: 38
      },
      children: /* @__PURE__ */ jsxs(Stack, {
        style: {
          paddingVertical: 24,
          paddingHorizontal: 12
        },
        spacing: 24,
        children: [
          /* @__PURE__ */ jsxs(TableRowGroup, {
            title: Strings.INFO,
            children: [
              /* @__PURE__ */ jsx(TableRow, {
                label: Strings.PUPU,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: {
                    uri: kettu_default
                  }
                }),
                trailing: /* @__PURE__ */ jsx(TableRow.TrailingText, {
                  text: debugInfo.bunny.version
                })
              }),
              /* @__PURE__ */ jsx(TableRow, {
                label: "Discord",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("Discord")
                }),
                trailing: /* @__PURE__ */ jsx(TableRow.TrailingText, {
                  text: `${debugInfo.discord.version} (${debugInfo.discord.build})`
                })
              }),
              /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: Strings.ABOUT,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("CircleInformationIcon-primary")
                }),
                onPress: () => navigation2.push("PUPU_CUSTOM_PAGE", {
                  title: Strings.ABOUT,
                  render: () => /* @__PURE__ */ jsx(About, {})
                })
              })
            ]
          }),
          /* @__PURE__ */ jsxs(TableRowGroup, {
            title: Strings.LINKS,
            children: [
              /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: Strings.DISCORD_SERVER,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("Discord")
                }),
                onPress: () => import_react_native16.Linking.openURL(DISCORD_SERVER)
              }),
              /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: Strings.GITHUB,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("img_account_sync_github_white")
                }),
                onPress: () => import_react_native16.Linking.openURL(GITHUB)
              })
            ]
          }),
          /* @__PURE__ */ jsxs(TableRowGroup, {
            title: Strings.ACTIONS,
            children: [
              /* @__PURE__ */ jsx(TableRow, {
                label: Strings.RELOAD_DISCORD,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("RetryIcon")
                }),
                onPress: () => BundleUpdaterManager.reload()
              }),
              /* @__PURE__ */ jsx(TableSwitchRow, {
                label: "Safe Mode",
                subLabel: "Load CloudCord without loading add-ons",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("ShieldIcon")
                }),
                value: isSafeMode(),
                onValueChange: (to) => {
                  toggleSafeMode2({
                    to,
                    reload: false
                  });
                  openAlert("bunny-reload-safe-mode", /* @__PURE__ */ jsx(AlertModal, {
                    title: "Reload now?",
                    content: !to ? "All add-ons will load normally." : "All add-ons will be temporarily disabled upon reload.",
                    actions: /* @__PURE__ */ jsxs(AlertActions, {
                      children: [
                        /* @__PURE__ */ jsx(AlertActionButton, {
                          text: "Reload Now",
                          variant: "destructive",
                          onPress: () => BundleUpdaterManager.reload()
                        }),
                        /* @__PURE__ */ jsx(AlertActionButton, {
                          text: "Later",
                          variant: "secondary"
                        })
                      ]
                    })
                  }));
                }
              }),
              /* @__PURE__ */ jsx(TableSwitchRow, {
                label: Strings.DEVELOPER_SETTINGS,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("WrenchIcon")
                }),
                value: settings.developerSettings,
                onValueChange: (v2) => {
                  settings.developerSettings = v2;
                }
              })
            ]
          }),
          /* @__PURE__ */ jsx(TableRowGroup, {
            title: Strings.MISCELLANEOUS,
            children: /* @__PURE__ */ jsx(TableSwitchRow, {
              label: Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS,
              subLabel: Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS_DESC,
              icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                source: findAssetId("WrenchIcon")
              }),
              value: settings.enableDiscordDeveloperSettings,
              onValueChange: (v2) => {
                settings.enableDiscordDeveloperSettings = v2;
              }
            })
          })
        ]
      })
    });
  }
  var import_react_native16;
  var init_General = __esm({
    "src/core/ui/settings/pages/General/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_safeMode();
      init_i18n();
      init_settings3();
      init_About();
      init_storage();
      init_assets();
      init_debug();
      init_modules();
      init_settings();
      init_alerts();
      init_constants();
      init_common();
      init_components();
      import_react_native16 = __toESM(require_react_native());
    }
  });

  // src/core/ui/settings/pages/FakeProfile/index.tsx
  var FakeProfile_exports = {};
  __export(FakeProfile_exports, {
    default: () => FakeProfile
  });
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
    var selectedFlags = 0;
    for (var [id, , flag] of BADGES)
      if (preview.selectedBadges?.[id])
        selectedFlags |= flag;
    var flags = preview.replaceBadges ? selectedFlags : Number(original.publicFlags ?? original.flags ?? 0) | selectedFlags;
    setOwnValue(cloned, "username", username);
    setOwnValue(cloned, "globalName", displayName);
    setOwnValue(cloned, "displayName", displayName);
    setOwnValue(cloned, "publicFlags", flags);
    setOwnValue(cloned, "flags", flags);
    if (avatar) {
      setOwnValue(cloned, "avatarURL", avatar);
      setOwnValue(cloned, "avatarUrl", avatar);
      setOwnValue(cloned, "getAvatarURL", () => avatar);
    }
    if (banner) {
      setOwnValue(cloned, "banner", banner);
      setOwnValue(cloned, "bannerURL", banner);
      setOwnValue(cloned, "bannerUrl", banner);
      setOwnValue(cloned, "getBannerURL", () => banner);
    }
    try {
      cache.set(original, cloned);
    } catch (e) {
    }
    return cloned;
  }
  function isCurrentUser(id) {
    return !id || !currentUserId || id === currentUserId;
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
  function ensurePatches() {
    if (initialized)
      return;
    initialized = true;
    var userStore = safeStore("UserStore") || findByProps("getCurrentUser", "getUser");
    diagnostics.userStore = !!userStore;
    try {
      currentUserId = userStore?.getCurrentUser?.()?.id || null;
    } catch (e) {
    }
    addPatch("getCurrentUser", userStore, (args, original) => {
      var user = original(...args);
      currentUserId = user?.id || currentUserId;
      return cloneObject(user, "user");
    });
    addPatch("getUser", userStore, (args, original) => {
      if (!isCurrentUser(args?.[0]))
        return original(...args);
      return cloneObject(original(...args), "user");
    });
    var profileStore = safeStore("UserProfileStore") || findByProps("getUserProfile", "getGuildMemberProfile");
    diagnostics.profileStore = !!profileStore;
    addPatch("getUserProfile", profileStore, (args, original) => {
      if (!isCurrentUser(args?.[0]))
        return original(...args);
      return cloneObject(original(...args), "profile");
    });
    addPatch("getGuildMemberProfile", profileStore, (args, original) => {
      if (!isCurrentUser(args?.[0]))
        return original(...args);
      return cloneObject(original(...args), "profile");
    });
    var avatarResolver = findByProps("getUserAvatarURL") || findByProps("getAvatarURL", "getDefaultAvatarURL");
    var bannerResolver = findByProps("getUserBannerURL") || findByProps("getBannerURL");
    diagnostics.avatarResolver = !!avatarResolver;
    diagnostics.bannerResolver = !!bannerResolver;
    for (var method of [
      "getUserAvatarURL",
      "getAvatarURL"
    ]) {
      addPatch(method, avatarResolver, (args, original) => {
        var uri = mediaUri("avatarMedia");
        var subject = args?.[0];
        var id = typeof subject === "string" ? subject : subject?.id;
        return preview.enabled && uri && isCurrentUser(id) ? uri : original(...args);
      });
    }
    for (var method1 of [
      "getUserBannerURL",
      "getBannerURL"
    ]) {
      addPatch(method1, bannerResolver, (args, original) => {
        var uri = mediaUri("bannerMedia");
        var subject = args?.[0];
        var id = typeof subject === "string" ? subject : subject?.id;
        return preview.enabled && uri && isCurrentUser(id) ? uri : original(...args);
      });
    }
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
    try {
      var dispatcher2 = findByProps("dispatch", "subscribe");
      dispatcher2?.dispatch?.({
        type: "CURRENT_USER_UPDATE"
      });
      if (currentUserId)
        dispatcher2?.dispatch?.({
          type: "USER_PROFILE_UPDATE",
          userId: currentUserId
        });
    } catch (e) {
    }
  }
  function saveMedia(key, asset) {
    var uri = asset?.fileCopyUri || asset?.uri;
    var name = String(asset?.fileName || asset?.name || "Selected image");
    var type = String(asset?.type || "").toLowerCase();
    if (!uri)
      throw new Error("No image was selected.");
    if (type && !type.startsWith("image/"))
      throw new Error("Choose a picture or GIF.");
    preview[key] = {
      uri,
      name,
      type
    };
    diagnostics.last = `${key === "avatarMedia" ? "Profile picture" : "Banner"} selected: ${name}`;
    refreshPreview();
  }
  function pickFile(key) {
    return _async_to_generator(function* () {
      var picker = findByProps("pickSingle", "isCancel");
      if (!picker?.pickSingle)
        throw new Error("The system file picker is unavailable.");
      try {
        var asset = yield picker.pickSingle({
          type: picker.types?.images || "image/*",
          mode: "import",
          copyTo: "documentDirectory"
        });
        if (asset)
          saveMedia(key, asset);
        return !!asset;
      } catch (error) {
        if (picker.isCancel?.(error))
          return false;
        throw error;
      }
    })();
  }
  function pickPhoto(key) {
    return _async_to_generator(function* () {
      var picker = findByProps("launchImageLibrary");
      if (!picker?.launchImageLibrary)
        return pickFile(key);
      var result = yield new Promise((resolve, reject) => {
        try {
          var returned = picker.launchImageLibrary({
            mediaType: "photo",
            selectionLimit: 1,
            includeBase64: false,
            assetRepresentationMode: "current"
          }, resolve);
          if (returned?.then)
            returned.then(resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
      if (result?.didCancel)
        return false;
      if (result?.errorCode)
        throw new Error(result.errorMessage || "The photo picker failed.");
      var asset = result?.assets?.[0];
      if (asset)
        saveMedia(key, asset);
      return !!asset;
    })();
  }
  function ActionButton({ label, onPress, muted = false }) {
    return /* @__PURE__ */ jsx(import_react_native17.Pressable, {
      onPress,
      style: {
        flex: 1,
        padding: 11,
        borderRadius: 9,
        backgroundColor: muted ? "#35373c" : "#5865f2"
      },
      children: /* @__PURE__ */ jsx(Text, {
        variant: "text-sm/bold",
        style: {
          color: "#fff",
          textAlign: "center"
        },
        children: label
      })
    });
  }
  function FakeProfile() {
    useProxy(settings);
    var [, redraw] = (0, import_react3.useReducer)((value) => value + 1, 0);
    (0, import_react3.useEffect)(() => {
      ensurePatches();
      redraw();
    }, []);
    var update = (key, value, refresh = false) => {
      preview[key] = value;
      clearCache();
      if (refresh)
        refreshPreview();
      redraw();
    };
    var choose = (key, source) => _async_to_generator(function* () {
      try {
        if (yield source === "photo" ? pickPhoto(key) : pickFile(key))
          redraw();
      } catch (error) {
        diagnostics.last = error?.message || "Could not open the picker.";
        redraw();
        import_react_native17.Alert.alert("FakeProfile", diagnostics.last);
      }
    })();
    var MediaEditor = ({ label, field, banner: banner2 = false }) => {
      var value = preview[field];
      return /* @__PURE__ */ jsxs(import_react_native17.View, {
        style: {
          gap: 9,
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            variant: "text-sm/bold",
            color: "text-normal",
            children: label
          }),
          /* @__PURE__ */ jsxs(import_react_native17.View, {
            style: {
              flexDirection: "row",
              gap: 10
            },
            children: [
              /* @__PURE__ */ jsx(ActionButton, {
                label: "Choose picture",
                onPress: () => void choose(field, "photo")
              }),
              /* @__PURE__ */ jsx(ActionButton, {
                label: "Choose file",
                muted: true,
                onPress: () => void choose(field, "file")
              })
            ]
          }),
          value?.uri && /* @__PURE__ */ jsxs(import_react_native17.View, {
            style: {
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#1f2023"
            },
            children: [
              /* @__PURE__ */ jsx(import_react_native17.Image, {
                source: {
                  uri: value.uri
                },
                resizeMode: "cover",
                style: banner2 ? {
                  width: "100%",
                  height: 112
                } : {
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  alignSelf: "center",
                  marginVertical: 12
                }
              }),
              /* @__PURE__ */ jsxs(import_react_native17.View, {
                style: {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 10,
                  gap: 8
                },
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    variant: "text-xs/medium",
                    color: "text-muted",
                    numberOfLines: 1,
                    style: {
                      flex: 1
                    },
                    children: value.name
                  }),
                  /* @__PURE__ */ jsx(import_react_native17.Pressable, {
                    onPress: () => update(field, null, true),
                    style: {
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 7,
                      backgroundColor: "#4a2024"
                    },
                    children: /* @__PURE__ */ jsx(Text, {
                      variant: "text-xs/bold",
                      style: {
                        color: "#ff7b84"
                      },
                      children: "Clear"
                    })
                  })
                ]
              })
            ]
          })
        ]
      });
    };
    var avatar = mediaUri("avatarMedia");
    var banner = mediaUri("bannerMedia");
    return /* @__PURE__ */ jsx(import_react_native17.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        paddingBottom: 80
      },
      children: /* @__PURE__ */ jsxs(Stack, {
        spacing: 16,
        children: [
          /* @__PURE__ */ jsxs(import_react_native17.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              gap: 12
            },
            children: [
              /* @__PURE__ */ jsx(import_react_native17.Image, {
                source: {
                  uri: fakeprofile_default
                },
                style: {
                  width: 48,
                  height: 48,
                  borderRadius: 12
                }
              }),
              /* @__PURE__ */ jsxs(import_react_native17.View, {
                style: {
                  flex: 1
                },
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    variant: "heading-lg/semibold",
                    color: "text-normal",
                    children: "FakeProfile"
                  }),
                  /* @__PURE__ */ jsx(Text, {
                    variant: "text-sm/medium",
                    color: "text-muted",
                    children: "Built-in local profile preview"
                  })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsxs(import_react_native17.View, {
              style: {
                borderRadius: 14,
                overflow: "hidden"
              },
              children: [
                banner ? /* @__PURE__ */ jsx(import_react_native17.Image, {
                  source: {
                    uri: banner
                  },
                  resizeMode: "cover",
                  style: {
                    width: "100%",
                    height: 118
                  }
                }) : /* @__PURE__ */ jsx(import_react_native17.View, {
                  style: {
                    height: 118,
                    backgroundColor: "#5865f2"
                  }
                }),
                /* @__PURE__ */ jsxs(import_react_native17.View, {
                  style: {
                    paddingHorizontal: 16,
                    paddingBottom: 16
                  },
                  children: [
                    avatar ? /* @__PURE__ */ jsx(import_react_native17.Image, {
                      source: {
                        uri: avatar
                      },
                      style: {
                        width: 82,
                        height: 82,
                        borderRadius: 41,
                        marginTop: -41,
                        borderWidth: 5,
                        borderColor: "#1f2023"
                      }
                    }) : /* @__PURE__ */ jsx(import_react_native17.View, {
                      style: {
                        width: 82,
                        height: 82,
                        borderRadius: 41,
                        marginTop: -41,
                        borderWidth: 5,
                        borderColor: "#1f2023",
                        backgroundColor: "#777"
                      }
                    }),
                    /* @__PURE__ */ jsx(Text, {
                      variant: "heading-md/semibold",
                      color: "text-normal",
                      style: {
                        marginTop: 10
                      },
                      children: preview.displayName || "Preview Name"
                    }),
                    /* @__PURE__ */ jsxs(Text, {
                      variant: "text-sm/medium",
                      color: "text-muted",
                      children: [
                        "@",
                        preview.username || "preview"
                      ]
                    }),
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-xs/bold",
                      style: {
                        color: "#7ee787",
                        marginTop: 8
                      },
                      children: "LOCAL PREVIEW ONLY"
                    })
                  ]
                })
              ]
            })
          }),
          /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsxs(import_react_native17.View, {
              style: {
                padding: 14,
                gap: 14
              },
              children: [
                /* @__PURE__ */ jsxs(import_react_native17.View, {
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12
                  },
                  children: [
                    /* @__PURE__ */ jsxs(import_react_native17.View, {
                      style: {
                        flex: 1
                      },
                      children: [
                        /* @__PURE__ */ jsx(Text, {
                          variant: "text-md/bold",
                          color: "text-normal",
                          children: "Show preview in the client"
                        }),
                        /* @__PURE__ */ jsx(Text, {
                          variant: "text-xs/medium",
                          color: "text-muted",
                          children: "Affects only what you see on this device"
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsx(import_react_native17.Switch, {
                      value: preview.enabled,
                      onValueChange: (value) => update("enabled", value, true)
                    })
                  ]
                }),
                /* @__PURE__ */ jsxs(import_react_native17.View, {
                  style: {
                    gap: 8
                  },
                  children: [
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-sm/bold",
                      color: "text-normal",
                      children: "Display name"
                    }),
                    /* @__PURE__ */ jsx(import_react_native17.TextInput, {
                      defaultValue: preview.displayName,
                      placeholder: "Preview Name",
                      placeholderTextColor: "#777",
                      onChangeText: (value) => update("displayName", value),
                      style: {
                        color: "#fff",
                        backgroundColor: "#1f2023",
                        borderRadius: 9,
                        padding: 12
                      }
                    })
                  ]
                }),
                /* @__PURE__ */ jsxs(import_react_native17.View, {
                  style: {
                    gap: 8
                  },
                  children: [
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-sm/bold",
                      color: "text-normal",
                      children: "Username"
                    }),
                    /* @__PURE__ */ jsx(import_react_native17.TextInput, {
                      defaultValue: preview.username,
                      placeholder: "preview",
                      placeholderTextColor: "#777",
                      autoCapitalize: "none",
                      autoCorrect: false,
                      onChangeText: (value) => update("username", value),
                      style: {
                        color: "#fff",
                        backgroundColor: "#1f2023",
                        borderRadius: 9,
                        padding: 12
                      }
                    })
                  ]
                }),
                /* @__PURE__ */ jsx(MediaEditor, {
                  label: "Profile picture",
                  field: "avatarMedia"
                }),
                /* @__PURE__ */ jsx(MediaEditor, {
                  label: "Banner",
                  field: "bannerMedia",
                  banner: true
                }),
                /* @__PURE__ */ jsx(ActionButton, {
                  label: "Apply preview",
                  onPress: () => {
                    diagnostics.last = "Preview refreshed";
                    refreshPreview();
                    redraw();
                  }
                })
              ]
            })
          }),
          /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsxs(import_react_native17.View, {
              style: {
                padding: 14,
                gap: 10
              },
              children: [
                /* @__PURE__ */ jsxs(import_react_native17.View, {
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12
                  },
                  children: [
                    /* @__PURE__ */ jsxs(import_react_native17.View, {
                      style: {
                        flex: 1
                      },
                      children: [
                        /* @__PURE__ */ jsx(Text, {
                          variant: "text-md/bold",
                          color: "text-normal",
                          children: "Replace visible badges"
                        }),
                        /* @__PURE__ */ jsx(Text, {
                          variant: "text-xs/medium",
                          color: "text-muted",
                          children: "Show only the badges selected below"
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsx(import_react_native17.Switch, {
                      value: preview.replaceBadges,
                      onValueChange: (value) => update("replaceBadges", value, true)
                    })
                  ]
                }),
                BADGES.map(([id, label]) => /* @__PURE__ */ jsxs(import_react_native17.Pressable, {
                  onPress: () => update("selectedBadges", {
                    ...preview.selectedBadges,
                    [id]: !preview.selectedBadges?.[id]
                  }, true),
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8
                  },
                  children: [
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-sm/medium",
                      color: "text-normal",
                      style: {
                        flex: 1
                      },
                      children: label
                    }),
                    /* @__PURE__ */ jsx(import_react_native17.Switch, {
                      value: !!preview.selectedBadges?.[id],
                      onValueChange: () => update("selectedBadges", {
                        ...preview.selectedBadges,
                        [id]: !preview.selectedBadges?.[id]
                      }, true)
                    })
                  ]
                }, id))
              ]
            })
          }),
          /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsxs(import_react_native17.View, {
              style: {
                padding: 14,
                gap: 5
              },
              children: [
                /* @__PURE__ */ jsx(Text, {
                  variant: "heading-sm/semibold",
                  color: "text-normal",
                  children: "Diagnostics"
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "Preview hooks: ",
                    diagnostics.patches
                  ]
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "User source: ",
                    diagnostics.userStore ? "Connected" : "Unavailable"
                  ]
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "Profile source: ",
                    diagnostics.profileStore ? "Connected" : "Unavailable"
                  ]
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "Profile picture resolver: ",
                    diagnostics.avatarResolver ? "Connected" : "Unavailable"
                  ]
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "Banner resolver: ",
                    diagnostics.bannerResolver ? "Connected" : "Unavailable"
                  ]
                }),
                /* @__PURE__ */ jsxs(Text, {
                  variant: "text-xs/medium",
                  color: "text-muted",
                  children: [
                    "Last action: ",
                    diagnostics.last
                  ]
                })
              ]
            })
          })
        ]
      })
    });
  }
  var import_react3, import_react_native17, BADGES, rootSettings, preview, diagnostics, initialized, currentUserId, userCache, profileCache;
  var init_FakeProfile = __esm({
    "src/core/ui/settings/pages/FakeProfile/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_fakeprofile();
      init_storage();
      init_patcher();
      init_settings();
      init_metro();
      init_components();
      import_react3 = __toESM(require_react());
      import_react_native17 = __toESM(require_react_native());
      BADGES = [
        [
          "hypesquad",
          "HypeSquad Events",
          4
        ],
        [
          "bug1",
          "Bug Hunter 1",
          8
        ],
        [
          "bravery",
          "HypeSquad Bravery",
          64
        ],
        [
          "brilliance",
          "HypeSquad Brilliance",
          128
        ],
        [
          "balance",
          "HypeSquad Balance",
          256
        ],
        [
          "early",
          "Early Supporter",
          512
        ],
        [
          "bug2",
          "Bug Hunter 2",
          16384
        ],
        [
          "vdev",
          "Verified Developer",
          131072
        ],
        [
          "mod",
          "Former Moderator",
          262144
        ],
        [
          "active",
          "Active Developer",
          4194304
        ]
      ];
      rootSettings = settings;
      rootSettings.fakeProfile ??= {
        enabled: false,
        displayName: "Preview Name",
        username: "preview",
        avatarMedia: null,
        bannerMedia: null,
        replaceBadges: false,
        selectedBadges: {}
      };
      preview = rootSettings.fakeProfile;
      diagnostics = {
        patches: 0,
        userStore: false,
        profileStore: false,
        avatarResolver: false,
        bannerResolver: false,
        last: "Ready"
      };
      initialized = false;
      currentUserId = null;
      userCache = /* @__PURE__ */ new WeakMap();
      profileCache = /* @__PURE__ */ new WeakMap();
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

  // src/core/ui/settings/components/ScaledPluginSettings.tsx
  function ScaledPluginSettings({ component: Component }) {
    return /* @__PURE__ */ jsx(import_react_native18.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingBottom: 90,
        paddingHorizontal: 12
      },
      showsVerticalScrollIndicator: true,
      children: /* @__PURE__ */ jsx(import_react_native18.View, {
        style: {
          width: "100%",
          paddingRight: 24,
          overflow: "visible"
        },
        children: /* @__PURE__ */ jsx(Component, {})
      })
    });
  }
  var import_react_native18;
  var init_ScaledPluginSettings = __esm({
    "src/core/ui/settings/components/ScaledPluginSettings.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      import_react_native18 = __toESM(require_react_native());
    }
  });

  // src/core/ui/settings/pages/CloudSync/index.tsx
  var CloudSync_exports = {};
  __export(CloudSync_exports, {
    default: () => CloudSync
  });
  function CloudSync() {
    useProxy(VdPluginManager.plugins);
    var [busy, setBusy] = (0, import_react4.useState)(false);
    var [refresh, setRefresh] = (0, import_react4.useState)(0);
    var plugin = VdPluginManager.plugins[PLUGIN_URL];
    var SettingsComponent = plugin?.enabled ? VdPluginManager.getSettings(PLUGIN_URL) : null;
    function installOrStart() {
      return _async_to_generator(function* () {
        if (busy)
          return;
        setBusy(true);
        try {
          if (!VdPluginManager.plugins[PLUGIN_URL]) {
            yield VdPluginManager.installPlugin(PLUGIN_URL, true);
            showToast("Cloud Sync installed", findAssetId("Check"));
          } else if (!VdPluginManager.plugins[PLUGIN_URL].enabled) {
            yield VdPluginManager.startPlugin(PLUGIN_URL);
            showToast("Cloud Sync started", findAssetId("Check"));
          } else {
            showToast("Cloud Sync is already enabled", findAssetId("Check"));
          }
          setRefresh((x2) => x2 + 1);
        } catch (error) {
          console.error("[CloudCord] Cloud Sync install/start failed", error);
          showToast(error?.message ?? "Cloud Sync failed");
        } finally {
          setBusy(false);
        }
      })();
    }
    function refetchPlugin() {
      return _async_to_generator(function* () {
        if (busy)
          return;
        setBusy(true);
        try {
          if (VdPluginManager.plugins[PLUGIN_URL]?.enabled) {
            VdPluginManager.stopPlugin(PLUGIN_URL, false);
          }
          yield VdPluginManager.fetchPlugin(PLUGIN_URL);
          yield VdPluginManager.startPlugin(PLUGIN_URL);
          showToast("Cloud Sync refreshed", findAssetId("Check"));
          setRefresh((x2) => x2 + 1);
        } catch (error) {
          console.error("[CloudCord] Cloud Sync refresh failed", error);
          showToast(error?.message ?? "Cloud Sync refresh failed");
        } finally {
          setBusy(false);
        }
      })();
    }
    function removePlugin() {
      return _async_to_generator(function* () {
        if (busy)
          return;
        setBusy(true);
        try {
          if (VdPluginManager.plugins[PLUGIN_URL]) {
            yield VdPluginManager.removePlugin(PLUGIN_URL);
          }
          showToast("Cloud Sync removed");
          setRefresh((x2) => x2 + 1);
        } catch (error) {
          console.error("[CloudCord] Cloud Sync remove failed", error);
          showToast(error?.message ?? "Cloud Sync remove failed");
        } finally {
          setBusy(false);
        }
      })();
    }
    if (SettingsComponent) {
      return /* @__PURE__ */ jsx(ScaledPluginSettings, {
        component: SettingsComponent
      }, `cloud-sync-settings-${refresh}`);
    }
    return /* @__PURE__ */ jsx(import_react_native19.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingBottom: 38
      },
      children: /* @__PURE__ */ jsxs(Stack, {
        style: {
          paddingVertical: 24,
          paddingHorizontal: 12
        },
        spacing: 24,
        children: [
          /* @__PURE__ */ jsxs(TableRowGroup, {
            title: "Cloud Sync",
            children: [
              /* @__PURE__ */ jsxs(import_react_native19.View, {
                style: {
                  paddingHorizontal: 12,
                  paddingBottom: 12
                },
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    variant: "heading-md/semibold",
                    color: "text-normal",
                    children: "Cloud Sync"
                  }),
                  /* @__PURE__ */ jsx(Text, {
                    variant: "text-sm/medium",
                    color: "text-muted",
                    children: "Install the official Cloud Sync plugin to connect, sync, add backup files, and save backups to your device."
                  })
                ]
              }),
              /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: plugin ? "Start Cloud Sync" : "Install Cloud Sync",
                subLabel: busy ? "Please wait..." : "Loads the official Cloud Sync plugin UI",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: {
                    uri: CLOUDSYNC_ICON
                  }
                }),
                onPress: installOrStart
              }),
              plugin && /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: "Refresh Cloud Sync",
                subLabel: "Refetches the official plugin",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("RetryIcon")
                }),
                onPress: refetchPlugin
              }),
              plugin && /* @__PURE__ */ jsx(TableRow, {
                arrow: true,
                label: "Remove Cloud Sync",
                subLabel: "Uninstalls the Cloud Sync plugin",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("TrashIcon") ?? findAssetId("CircleXIcon-primary")
                }),
                onPress: removePlugin
              })
            ]
          }),
          /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsx(import_react_native19.View, {
              style: {
                padding: 12
              },
              children: /* @__PURE__ */ jsx(Text, {
                variant: "text-sm/medium",
                color: "text-muted",
                children: "This tab uses the official Cloud Sync plugin. The plugin itself handles OAuth, sync, backups, and files."
              })
            })
          })
        ]
      })
    });
  }
  var import_react4, import_react_native19, PLUGIN_URL, CLOUDSYNC_ICON;
  var init_CloudSync = __esm({
    "src/core/ui/settings/pages/CloudSync/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_plugins();
      init_storage();
      init_ScaledPluginSettings();
      init_assets();
      init_toasts();
      init_components();
      import_react4 = __toESM(require_react());
      import_react_native19 = __toESM(require_react_native());
      PLUGIN_URL = "https://revenge.nexpid.xyz/cloud-sync/";
      CLOUDSYNC_ICON = "https://images.weserv.nl/?url=raw.githubusercontent.com/nexpid/CloudSync/main/assets/icon-bright.svg&w=128&h=128&output=png";
    }
  });

  // src/lib/utils/isValidHttpUrl.ts
  function isValidHttpUrl(input) {
    var url2;
    try {
      url2 = new URL(input);
    } catch (e) {
      return false;
    }
    return url2.protocol === "http:" || url2.protocol === "https:";
  }
  var init_isValidHttpUrl = __esm({
    "src/lib/utils/isValidHttpUrl.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
    }
  });

  // node_modules/fuzzysort/fuzzysort.js
  var require_fuzzysort = __commonJS({
    "node_modules/fuzzysort/fuzzysort.js"(exports, module) {
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_call_super();
      init_class_call_check();
      init_create_class();
      init_inherits();
      init_wrap_native_super();
      ((root, UMD) => {
        if (typeof define === "function" && define.amd)
          define([], UMD);
        else if (typeof module === "object" && module.exports)
          module.exports = UMD();
        else
          root["fuzzysort"] = UMD();
      })(exports, (_2) => {
        "use strict";
        var single = (search, target) => {
          if (!search || !target)
            return NULL;
          var preparedSearch = getPreparedSearch(search);
          if (!isPrepared(target))
            target = getPrepared(target);
          var searchBitflags = preparedSearch.bitflags;
          if ((searchBitflags & target._bitflags) !== searchBitflags)
            return NULL;
          return algorithm(preparedSearch, target);
        };
        var go = (search, targets, options) => {
          if (!search)
            return options?.all ? all(targets, options) : noResults;
          var preparedSearch = getPreparedSearch(search);
          var searchBitflags = preparedSearch.bitflags;
          var containsSpace = preparedSearch.containsSpace;
          var threshold = denormalizeScore(options?.threshold || 0);
          var limit = options?.limit || INFINITY;
          var resultsLen = 0;
          var limitedCount = 0;
          var targetsLen = targets.length;
          function push_result(result2) {
            if (resultsLen < limit) {
              q3.add(result2);
              ++resultsLen;
            } else {
              ++limitedCount;
              if (result2._score > q3.peek()._score)
                q3.replaceTop(result2);
            }
          }
          if (options?.key) {
            var key = options.key;
            for (var i = 0; i < targetsLen; ++i) {
              var obj = targets[i];
              var target = getValue(obj, key);
              if (!target)
                continue;
              if (!isPrepared(target))
                target = getPrepared(target);
              if ((searchBitflags & target._bitflags) !== searchBitflags)
                continue;
              var result = algorithm(preparedSearch, target);
              if (result === NULL)
                continue;
              if (result._score < threshold)
                continue;
              result.obj = obj;
              push_result(result);
            }
          } else if (options?.keys) {
            var keys = options.keys;
            var keysLen = keys.length;
            outer:
              for (var i = 0; i < targetsLen; ++i) {
                var obj = targets[i];
                {
                  var keysBitflags = 0;
                  for (var keyI = 0; keyI < keysLen; ++keyI) {
                    var key = keys[keyI];
                    var target = getValue(obj, key);
                    if (!target) {
                      tmpTargets[keyI] = noTarget;
                      continue;
                    }
                    if (!isPrepared(target))
                      target = getPrepared(target);
                    tmpTargets[keyI] = target;
                    keysBitflags |= target._bitflags;
                  }
                  if ((searchBitflags & keysBitflags) !== searchBitflags)
                    continue;
                }
                if (containsSpace)
                  for (var i1 = 0; i1 < preparedSearch.spaceSearches.length; i1++)
                    keysSpacesBestScores[i1] = NEGATIVE_INFINITY;
                for (var keyI = 0; keyI < keysLen; ++keyI) {
                  target = tmpTargets[keyI];
                  if (target === noTarget) {
                    tmpResults[keyI] = noTarget;
                    continue;
                  }
                  tmpResults[keyI] = algorithm(
                    preparedSearch,
                    target,
                    /*allowSpaces=*/
                    false,
                    /*allowPartialMatch=*/
                    containsSpace
                  );
                  if (tmpResults[keyI] === NULL) {
                    tmpResults[keyI] = noTarget;
                    continue;
                  }
                  if (containsSpace)
                    for (var i2 = 0; i2 < preparedSearch.spaceSearches.length; i2++) {
                      if (allowPartialMatchScores[i2] > -1e3) {
                        if (keysSpacesBestScores[i2] > NEGATIVE_INFINITY) {
                          var tmp = (keysSpacesBestScores[i2] + allowPartialMatchScores[i2]) / 4;
                          if (tmp > keysSpacesBestScores[i2])
                            keysSpacesBestScores[i2] = tmp;
                        }
                      }
                      if (allowPartialMatchScores[i2] > keysSpacesBestScores[i2])
                        keysSpacesBestScores[i2] = allowPartialMatchScores[i2];
                    }
                }
                if (containsSpace) {
                  for (var i3 = 0; i3 < preparedSearch.spaceSearches.length; i3++) {
                    if (keysSpacesBestScores[i3] === NEGATIVE_INFINITY)
                      continue outer;
                  }
                } else {
                  var hasAtLeast1Match = false;
                  for (var i4 = 0; i4 < keysLen; i4++) {
                    if (tmpResults[i4]._score !== NEGATIVE_INFINITY) {
                      hasAtLeast1Match = true;
                      break;
                    }
                  }
                  if (!hasAtLeast1Match)
                    continue;
                }
                var objResults = new KeysResult(keysLen);
                for (var i5 = 0; i5 < keysLen; i5++) {
                  objResults[i5] = tmpResults[i5];
                }
                if (containsSpace) {
                  var score = 0;
                  for (var i6 = 0; i6 < preparedSearch.spaceSearches.length; i6++)
                    score += keysSpacesBestScores[i6];
                } else {
                  var score = NEGATIVE_INFINITY;
                  for (var i7 = 0; i7 < keysLen; i7++) {
                    var result = objResults[i7];
                    if (result._score > -1e3) {
                      if (score > NEGATIVE_INFINITY) {
                        var tmp = (score + result._score) / 4;
                        if (tmp > score)
                          score = tmp;
                      }
                    }
                    if (result._score > score)
                      score = result._score;
                  }
                }
                objResults.obj = obj;
                objResults._score = score;
                if (options?.scoreFn) {
                  score = options.scoreFn(objResults);
                  if (!score)
                    continue;
                  score = denormalizeScore(score);
                  objResults._score = score;
                }
                if (score < threshold)
                  continue;
                push_result(objResults);
              }
          } else {
            for (var i = 0; i < targetsLen; ++i) {
              var target = targets[i];
              if (!target)
                continue;
              if (!isPrepared(target))
                target = getPrepared(target);
              if ((searchBitflags & target._bitflags) !== searchBitflags)
                continue;
              var result = algorithm(preparedSearch, target);
              if (result === NULL)
                continue;
              if (result._score < threshold)
                continue;
              push_result(result);
            }
          }
          if (resultsLen === 0)
            return noResults;
          var results = new Array(resultsLen);
          for (var i = resultsLen - 1; i >= 0; --i)
            results[i] = q3.poll();
          results.total = resultsLen + limitedCount;
          return results;
        };
        var highlight = (result, open = "<b>", close = "</b>") => {
          var callback = typeof open === "function" ? open : void 0;
          var target = result.target;
          var targetLen = target.length;
          var indexes = result.indexes;
          var highlighted = "";
          var matchI = 0;
          var indexesI = 0;
          var opened = false;
          var parts = [];
          for (var i = 0; i < targetLen; ++i) {
            var char = target[i];
            if (indexes[indexesI] === i) {
              ++indexesI;
              if (!opened) {
                opened = true;
                if (callback) {
                  parts.push(highlighted);
                  highlighted = "";
                } else {
                  highlighted += open;
                }
              }
              if (indexesI === indexes.length) {
                if (callback) {
                  highlighted += char;
                  parts.push(callback(highlighted, matchI++));
                  highlighted = "";
                  parts.push(target.substr(i + 1));
                } else {
                  highlighted += char + close + target.substr(i + 1);
                }
                break;
              }
            } else {
              if (opened) {
                opened = false;
                if (callback) {
                  parts.push(callback(highlighted, matchI++));
                  highlighted = "";
                } else {
                  highlighted += close;
                }
              }
            }
            highlighted += char;
          }
          return callback ? parts : highlighted;
        };
        var prepare = (target) => {
          if (typeof target === "number")
            target = "" + target;
          else if (typeof target !== "string")
            target = "";
          var info = prepareLowerInfo(target);
          return new_result(target, {
            _targetLower: info._lower,
            _targetLowerCodes: info.lowerCodes,
            _bitflags: info.bitflags
          });
        };
        var cleanup = () => {
          preparedCache.clear();
          preparedSearchCache.clear();
        };
        var Result = /* @__PURE__ */ function() {
          function Result2() {
            _class_call_check(this, Result2);
          }
          _create_class(Result2, [
            {
              key: "indexes",
              get: function get() {
                return this._indexes.slice(0, this._indexes.len).sort((a, b3) => a - b3);
              }
            },
            {
              key: "indexes",
              set: function set(indexes) {
                return this._indexes = indexes;
              }
            },
            {
              key: "highlight",
              value: function value(open, close) {
                return highlight(this, open, close);
              }
            },
            {
              key: "score",
              get: function get() {
                return normalizeScore(this._score);
              }
            },
            {
              key: "score",
              set: function set(score) {
                this._score = denormalizeScore(score);
              }
            }
          ]);
          return Result2;
        }();
        var KeysResult = /* @__PURE__ */ function(Array1) {
          _inherits(KeysResult2, Array1);
          function KeysResult2() {
            _class_call_check(this, KeysResult2);
            return _call_super(this, KeysResult2, arguments);
          }
          _create_class(KeysResult2, [
            {
              key: "score",
              get: function get() {
                return normalizeScore(this._score);
              }
            },
            {
              key: "score",
              set: function set(score) {
                this._score = denormalizeScore(score);
              }
            }
          ]);
          return KeysResult2;
        }(_wrap_native_super(Array));
        var new_result = (target, options) => {
          var result = new Result();
          result["target"] = target;
          result["obj"] = options.obj ?? NULL;
          result._score = options._score ?? NEGATIVE_INFINITY;
          result._indexes = options._indexes ?? [];
          result._targetLower = options._targetLower ?? "";
          result._targetLowerCodes = options._targetLowerCodes ?? NULL;
          result._nextBeginningIndexes = options._nextBeginningIndexes ?? NULL;
          result._bitflags = options._bitflags ?? 0;
          return result;
        };
        var normalizeScore = (score) => {
          if (score === NEGATIVE_INFINITY)
            return 0;
          if (score > 1)
            return score;
          return Math.E ** (((-score + 1) ** 0.04307 - 1) * -2);
        };
        var denormalizeScore = (normalizedScore) => {
          if (normalizedScore === 0)
            return NEGATIVE_INFINITY;
          if (normalizedScore > 1)
            return normalizedScore;
          return 1 - Math.pow(Math.log(normalizedScore) / -2 + 1, 1 / 0.04307);
        };
        var prepareSearch = (search) => {
          if (typeof search === "number")
            search = "" + search;
          else if (typeof search !== "string")
            search = "";
          search = search.trim();
          var info = prepareLowerInfo(search);
          var spaceSearches = [];
          if (info.containsSpace) {
            var searches = search.split(/\s+/);
            searches = [
              ...new Set(searches)
            ];
            for (var i = 0; i < searches.length; i++) {
              if (searches[i] === "")
                continue;
              var _info = prepareLowerInfo(searches[i]);
              spaceSearches.push({
                lowerCodes: _info.lowerCodes,
                _lower: searches[i].toLowerCase(),
                containsSpace: false
              });
            }
          }
          return {
            lowerCodes: info.lowerCodes,
            _lower: info._lower,
            containsSpace: info.containsSpace,
            bitflags: info.bitflags,
            spaceSearches
          };
        };
        var getPrepared = (target) => {
          if (target.length > 999)
            return prepare(target);
          var targetPrepared = preparedCache.get(target);
          if (targetPrepared !== void 0)
            return targetPrepared;
          targetPrepared = prepare(target);
          preparedCache.set(target, targetPrepared);
          return targetPrepared;
        };
        var getPreparedSearch = (search) => {
          if (search.length > 999)
            return prepareSearch(search);
          var searchPrepared = preparedSearchCache.get(search);
          if (searchPrepared !== void 0)
            return searchPrepared;
          searchPrepared = prepareSearch(search);
          preparedSearchCache.set(search, searchPrepared);
          return searchPrepared;
        };
        var all = (targets, options) => {
          var results = [];
          results.total = targets.length;
          var limit = options?.limit || INFINITY;
          if (options?.key) {
            for (var i = 0; i < targets.length; i++) {
              var obj = targets[i];
              var target = getValue(obj, options.key);
              if (target == NULL)
                continue;
              if (!isPrepared(target))
                target = getPrepared(target);
              var result = new_result(target.target, {
                _score: target._score,
                obj
              });
              results.push(result);
              if (results.length >= limit)
                return results;
            }
          } else if (options?.keys) {
            for (var i = 0; i < targets.length; i++) {
              var obj = targets[i];
              var objResults = new KeysResult(options.keys.length);
              for (var keyI = options.keys.length - 1; keyI >= 0; --keyI) {
                var target = getValue(obj, options.keys[keyI]);
                if (!target) {
                  objResults[keyI] = noTarget;
                  continue;
                }
                if (!isPrepared(target))
                  target = getPrepared(target);
                target._score = NEGATIVE_INFINITY;
                target._indexes.len = 0;
                objResults[keyI] = target;
              }
              objResults.obj = obj;
              objResults._score = NEGATIVE_INFINITY;
              results.push(objResults);
              if (results.length >= limit)
                return results;
            }
          } else {
            for (var i = 0; i < targets.length; i++) {
              var target = targets[i];
              if (target == NULL)
                continue;
              if (!isPrepared(target))
                target = getPrepared(target);
              target._score = NEGATIVE_INFINITY;
              target._indexes.len = 0;
              results.push(target);
              if (results.length >= limit)
                return results;
            }
          }
          return results;
        };
        var algorithm = (preparedSearch, prepared, allowSpaces = false, allowPartialMatch = false) => {
          if (allowSpaces === false && preparedSearch.containsSpace)
            return algorithmSpaces(preparedSearch, prepared, allowPartialMatch);
          var searchLower = preparedSearch._lower;
          var searchLowerCodes = preparedSearch.lowerCodes;
          var searchLowerCode = searchLowerCodes[0];
          var targetLowerCodes = prepared._targetLowerCodes;
          var searchLen = searchLowerCodes.length;
          var targetLen = targetLowerCodes.length;
          var searchI = 0;
          var targetI = 0;
          var matchesSimpleLen = 0;
          for (; ; ) {
            var isMatch = searchLowerCode === targetLowerCodes[targetI];
            if (isMatch) {
              matchesSimple[matchesSimpleLen++] = targetI;
              ++searchI;
              if (searchI === searchLen)
                break;
              searchLowerCode = searchLowerCodes[searchI];
            }
            ++targetI;
            if (targetI >= targetLen)
              return NULL;
          }
          var searchI = 0;
          var successStrict = false;
          var matchesStrictLen = 0;
          var nextBeginningIndexes = prepared._nextBeginningIndexes;
          if (nextBeginningIndexes === NULL)
            nextBeginningIndexes = prepared._nextBeginningIndexes = prepareNextBeginningIndexes(prepared.target);
          targetI = matchesSimple[0] === 0 ? 0 : nextBeginningIndexes[matchesSimple[0] - 1];
          var backtrackCount = 0;
          if (targetI !== targetLen)
            for (; ; ) {
              if (targetI >= targetLen) {
                if (searchI <= 0)
                  break;
                ++backtrackCount;
                if (backtrackCount > 200)
                  break;
                --searchI;
                var lastMatch = matchesStrict[--matchesStrictLen];
                targetI = nextBeginningIndexes[lastMatch];
              } else {
                var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI];
                if (isMatch) {
                  matchesStrict[matchesStrictLen++] = targetI;
                  ++searchI;
                  if (searchI === searchLen) {
                    successStrict = true;
                    break;
                  }
                  ++targetI;
                } else {
                  targetI = nextBeginningIndexes[targetI];
                }
              }
            }
          var substringIndex = searchLen <= 1 ? -1 : prepared._targetLower.indexOf(searchLower, matchesSimple[0]);
          var isSubstring = !!~substringIndex;
          var isSubstringBeginning = !isSubstring ? false : substringIndex === 0 || prepared._nextBeginningIndexes[substringIndex - 1] === substringIndex;
          if (isSubstring && !isSubstringBeginning) {
            for (var i = 0; i < nextBeginningIndexes.length; i = nextBeginningIndexes[i]) {
              if (i <= substringIndex)
                continue;
              for (var s = 0; s < searchLen; s++)
                if (searchLowerCodes[s] !== prepared._targetLowerCodes[i + s])
                  break;
              if (s === searchLen) {
                substringIndex = i;
                isSubstringBeginning = true;
                break;
              }
            }
          }
          var calculateScore = (matches) => {
            var score2 = 0;
            var extraMatchGroupCount = 0;
            for (var i2 = 1; i2 < searchLen; ++i2) {
              if (matches[i2] - matches[i2 - 1] !== 1) {
                score2 -= matches[i2];
                ++extraMatchGroupCount;
              }
            }
            var unmatchedDistance = matches[searchLen - 1] - matches[0] - (searchLen - 1);
            score2 -= (12 + unmatchedDistance) * extraMatchGroupCount;
            if (matches[0] !== 0)
              score2 -= matches[0] * matches[0] * 0.2;
            if (!successStrict) {
              score2 *= 1e3;
            } else {
              var uniqueBeginningIndexes = 1;
              for (var i2 = nextBeginningIndexes[0]; i2 < targetLen; i2 = nextBeginningIndexes[i2])
                ++uniqueBeginningIndexes;
              if (uniqueBeginningIndexes > 24)
                score2 *= (uniqueBeginningIndexes - 24) * 10;
            }
            score2 -= (targetLen - searchLen) / 2;
            if (isSubstring)
              score2 /= 1 + searchLen * searchLen * 1;
            if (isSubstringBeginning)
              score2 /= 1 + searchLen * searchLen * 1;
            score2 -= (targetLen - searchLen) / 2;
            return score2;
          };
          if (!successStrict) {
            if (isSubstring)
              for (var i = 0; i < searchLen; ++i)
                matchesSimple[i] = substringIndex + i;
            var matchesBest = matchesSimple;
            var score = calculateScore(matchesBest);
          } else {
            if (isSubstringBeginning) {
              for (var i = 0; i < searchLen; ++i)
                matchesSimple[i] = substringIndex + i;
              var matchesBest = matchesSimple;
              var score = calculateScore(matchesSimple);
            } else {
              var matchesBest = matchesStrict;
              var score = calculateScore(matchesStrict);
            }
          }
          prepared._score = score;
          for (var i = 0; i < searchLen; ++i)
            prepared._indexes[i] = matchesBest[i];
          prepared._indexes.len = searchLen;
          var result = new Result();
          result.target = prepared.target;
          result._score = prepared._score;
          result._indexes = prepared._indexes;
          return result;
        };
        var algorithmSpaces = (preparedSearch, target, allowPartialMatch) => {
          var seen_indexes = /* @__PURE__ */ new Set();
          var score = 0;
          var result = NULL;
          var first_seen_index_last_search = 0;
          var searches = preparedSearch.spaceSearches;
          var searchesLen = searches.length;
          var changeslen = 0;
          var resetNextBeginningIndexes = () => {
            for (var i3 = changeslen - 1; i3 >= 0; i3--)
              target._nextBeginningIndexes[nextBeginningIndexesChanges[i3 * 2 + 0]] = nextBeginningIndexesChanges[i3 * 2 + 1];
          };
          var hasAtLeast1Match = false;
          for (var i = 0; i < searchesLen; ++i) {
            allowPartialMatchScores[i] = NEGATIVE_INFINITY;
            var search = searches[i];
            result = algorithm(search, target);
            if (allowPartialMatch) {
              if (result === NULL)
                continue;
              hasAtLeast1Match = true;
            } else {
              if (result === NULL) {
                resetNextBeginningIndexes();
                return NULL;
              }
            }
            var isTheLastSearch = i === searchesLen - 1;
            if (!isTheLastSearch) {
              var indexes = result._indexes;
              var indexesIsConsecutiveSubstring = true;
              for (var i1 = 0; i1 < indexes.len - 1; i1++) {
                if (indexes[i1 + 1] - indexes[i1] !== 1) {
                  indexesIsConsecutiveSubstring = false;
                  break;
                }
              }
              if (indexesIsConsecutiveSubstring) {
                var newBeginningIndex = indexes[indexes.len - 1] + 1;
                var toReplace = target._nextBeginningIndexes[newBeginningIndex - 1];
                for (var i2 = newBeginningIndex - 1; i2 >= 0; i2--) {
                  if (toReplace !== target._nextBeginningIndexes[i2])
                    break;
                  target._nextBeginningIndexes[i2] = newBeginningIndex;
                  nextBeginningIndexesChanges[changeslen * 2 + 0] = i2;
                  nextBeginningIndexesChanges[changeslen * 2 + 1] = toReplace;
                  changeslen++;
                }
              }
            }
            score += result._score / searchesLen;
            allowPartialMatchScores[i] = result._score / searchesLen;
            if (result._indexes[0] < first_seen_index_last_search) {
              score -= (first_seen_index_last_search - result._indexes[0]) * 2;
            }
            first_seen_index_last_search = result._indexes[0];
            for (var j = 0; j < result._indexes.len; ++j)
              seen_indexes.add(result._indexes[j]);
          }
          if (allowPartialMatch && !hasAtLeast1Match)
            return NULL;
          resetNextBeginningIndexes();
          var allowSpacesResult = algorithm(
            preparedSearch,
            target,
            /*allowSpaces=*/
            true
          );
          if (allowSpacesResult !== NULL && allowSpacesResult._score > score) {
            if (allowPartialMatch) {
              for (var i = 0; i < searchesLen; ++i) {
                allowPartialMatchScores[i] = allowSpacesResult._score / searchesLen;
              }
            }
            return allowSpacesResult;
          }
          if (allowPartialMatch)
            result = target;
          result._score = score;
          var i = 0;
          for (var index of seen_indexes)
            result._indexes[i++] = index;
          result._indexes.len = i;
          return result;
        };
        var remove_accents = (str) => str.replace(RegExp("\\p{Script=Latin}+", "gu"), (match) => match.normalize("NFD")).replace(/[\u0300-\u036f]/g, "");
        var prepareLowerInfo = (str) => {
          str = remove_accents(str);
          var strLen = str.length;
          var lower = str.toLowerCase();
          var lowerCodes = [];
          var bitflags = 0;
          var containsSpace = false;
          for (var i = 0; i < strLen; ++i) {
            var lowerCode = lowerCodes[i] = lower.charCodeAt(i);
            if (lowerCode === 32) {
              containsSpace = true;
              continue;
            }
            var bit = lowerCode >= 97 && lowerCode <= 122 ? lowerCode - 97 : lowerCode >= 48 && lowerCode <= 57 ? 26 : lowerCode <= 127 ? 30 : 31;
            bitflags |= 1 << bit;
          }
          return {
            lowerCodes,
            bitflags,
            containsSpace,
            _lower: lower
          };
        };
        var prepareBeginningIndexes = (target) => {
          var targetLen = target.length;
          var beginningIndexes = [];
          var beginningIndexesLen = 0;
          var wasUpper = false;
          var wasAlphanum = false;
          for (var i = 0; i < targetLen; ++i) {
            var targetCode = target.charCodeAt(i);
            var isUpper = targetCode >= 65 && targetCode <= 90;
            var isAlphanum = isUpper || targetCode >= 97 && targetCode <= 122 || targetCode >= 48 && targetCode <= 57;
            var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum;
            wasUpper = isUpper;
            wasAlphanum = isAlphanum;
            if (isBeginning)
              beginningIndexes[beginningIndexesLen++] = i;
          }
          return beginningIndexes;
        };
        var prepareNextBeginningIndexes = (target) => {
          target = remove_accents(target);
          var targetLen = target.length;
          var beginningIndexes = prepareBeginningIndexes(target);
          var nextBeginningIndexes = [];
          var lastIsBeginning = beginningIndexes[0];
          var lastIsBeginningI = 0;
          for (var i = 0; i < targetLen; ++i) {
            if (lastIsBeginning > i) {
              nextBeginningIndexes[i] = lastIsBeginning;
            } else {
              lastIsBeginning = beginningIndexes[++lastIsBeginningI];
              nextBeginningIndexes[i] = lastIsBeginning === void 0 ? targetLen : lastIsBeginning;
            }
          }
          return nextBeginningIndexes;
        };
        var preparedCache = /* @__PURE__ */ new Map();
        var preparedSearchCache = /* @__PURE__ */ new Map();
        var matchesSimple = [];
        var matchesStrict = [];
        var nextBeginningIndexesChanges = [];
        var keysSpacesBestScores = [];
        var allowPartialMatchScores = [];
        var tmpTargets = [];
        var tmpResults = [];
        var getValue = (obj, prop) => {
          var tmp = obj[prop];
          if (tmp !== void 0)
            return tmp;
          if (typeof prop === "function")
            return prop(obj);
          var segs = prop;
          if (!Array.isArray(prop))
            segs = prop.split(".");
          var len = segs.length;
          var i = -1;
          while (obj && ++i < len)
            obj = obj[segs[i]];
          return obj;
        };
        var isPrepared = (x2) => {
          return typeof x2 === "object" && typeof x2._bitflags === "number";
        };
        var INFINITY = Infinity;
        var NEGATIVE_INFINITY = -INFINITY;
        var noResults = [];
        noResults.total = 0;
        var NULL = null;
        var noTarget = prepare("");
        var fastpriorityqueue = (r) => {
          var e = [], o = 0, a = {}, v2 = (r2) => {
            for (var a2 = 0, v3 = e[a2], c2 = 1; c2 < o; ) {
              var s = c2 + 1;
              a2 = c2, s < o && e[s]._score < e[c2]._score && (a2 = s), e[a2 - 1 >> 1] = e[a2], c2 = 1 + (a2 << 1);
            }
            for (var f = a2 - 1 >> 1; a2 > 0 && v3._score < e[f]._score; f = (a2 = f) - 1 >> 1)
              e[a2] = e[f];
            e[a2] = v3;
          };
          return a.add = (r2) => {
            var a2 = o;
            e[o++] = r2;
            for (var v3 = a2 - 1 >> 1; a2 > 0 && r2._score < e[v3]._score; v3 = (a2 = v3) - 1 >> 1)
              e[a2] = e[v3];
            e[a2] = r2;
          }, a.poll = (r2) => {
            if (0 !== o) {
              var a2 = e[0];
              return e[0] = e[--o], v2(), a2;
            }
          }, a.peek = (r2) => {
            if (0 !== o)
              return e[0];
          }, a.replaceTop = (r2) => {
            e[0] = r2, v2();
          }, a;
        };
        var q3 = fastpriorityqueue();
        return {
          "single": single,
          "go": go,
          "prepare": prepare,
          "cleanup": cleanup
        };
      });
    }
  });

  // src/core/ui/components/AddonPage.tsx
  function InputAlert(props) {
    var [value, setValue] = React.useState("");
    var [error, setError] = React.useState("");
    var [isFetching, setIsFetching] = React.useState(false);
    function onConfirmWrapper() {
      setIsFetching(true);
      props.fetchFn(value).then(() => dismissAlert("AddonInputAlert")).catch((e) => e instanceof Error ? setError(e.message) : String(e)).finally(() => setIsFetching(false));
    }
    return /* @__PURE__ */ jsx(AlertModal, {
      title: props.label,
      content: "Type in the source URL you want to install from:",
      extraContent: /* @__PURE__ */ jsxs(Stack, {
        style: {
          marginTop: -12
        },
        children: [
          /* @__PURE__ */ jsx(TextInput, {
            autoFocus: true,
            isClearable: true,
            value,
            onChange: (v2) => {
              setValue(v2);
              if (error)
                setError("");
            },
            returnKeyType: "done",
            onSubmitEditing: onConfirmWrapper,
            state: error ? "error" : void 0,
            errorMessage: error || void 0
          }),
          /* @__PURE__ */ jsx(import_react_native20.ScrollView, {
            horizontal: true,
            showsHorizontalScrollIndicator: false,
            style: {
              gap: 8
            },
            children: /* @__PURE__ */ jsx(Button, {
              size: "sm",
              variant: "tertiary",
              text: "Import from clipboard",
              icon: findAssetId("ClipboardListIcon"),
              onPress: () => clipboard.getString().then((str) => setValue(str))
            })
          })
        ]
      }),
      actions: /* @__PURE__ */ jsxs(Stack, {
        children: [
          /* @__PURE__ */ jsx(Button, {
            loading: isFetching,
            text: "Install",
            variant: "primary",
            disabled: !value || !isValidHttpUrl(value),
            onPress: onConfirmWrapper
          }),
          /* @__PURE__ */ jsx(AlertActionButton, {
            disabled: isFetching,
            text: "Cancel",
            variant: "secondary"
          })
        ]
      })
    });
  }
  function AddonPage({ CardComponent, ...props }) {
    var [search, setSearch] = React.useState("");
    var [sortFn, setSortFn] = React.useState(() => null);
    var { bottom: bottomInset } = useSafeAreaInsets();
    var navigation2 = NavigationNative.useNavigation();
    (0, import_react5.useEffect)(() => {
      if (props.OptionsActionSheetComponent) {
        navigation2.setOptions({
          headerRight: () => /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            variant: "secondary",
            icon: findAssetId("MoreHorizontalIcon"),
            onPress: () => showSheet("AddonMoreSheet", props.OptionsActionSheetComponent)
          })
        });
      }
    }, [
      navigation2
    ]);
    var results = (0, import_react5.useMemo)(() => {
      var values = props.items;
      if (props.resolveItem)
        values = values.map(props.resolveItem).filter(isNotNil);
      var items = values.filter((i) => isNotNil(i) && typeof i === "object");
      if (!search && sortFn)
        items.sort(sortFn);
      return import_fuzzysort.default.go(search, items, {
        keys: props.searchKeywords,
        all: true
      });
    }, [
      props.items,
      sortFn,
      search
    ]);
    var onInstallPress = (0, import_react5.useCallback)(() => {
      if (!props.installAction)
        return () => {
        };
      var { label, onPress, fetchFn } = props.installAction;
      if (fetchFn) {
        openAlert("AddonInputAlert", /* @__PURE__ */ jsx(InputAlert, {
          label: label ?? "Install",
          fetchFn
        }));
      } else {
        onPress?.();
      }
    }, []);
    if (results.length === 0 && !search) {
      return /* @__PURE__ */ jsxs(import_react_native20.View, {
        style: {
          gap: 32,
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ jsxs(import_react_native20.View, {
            style: {
              gap: 8,
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsx(import_react_native20.Image, {
                source: findAssetId("empty_quick_switcher")
              }),
              /* @__PURE__ */ jsx(Text, {
                variant: "text-lg/semibold",
                color: "text-default",
                children: "Oops! Nothing to see here\u2026 yet!"
              })
            ]
          }),
          /* @__PURE__ */ jsx(Button, {
            size: "lg",
            icon: findAssetId("DownloadIcon"),
            text: props.installAction?.label ?? "Install",
            onPress: onInstallPress
          })
        ]
      });
    }
    var headerElement = /* @__PURE__ */ jsxs(import_react_native20.View, {
      style: {
        paddingBottom: 8
      },
      children: [
        settings.safeMode?.enabled && /* @__PURE__ */ jsxs(import_react_native20.View, {
          style: {
            marginBottom: 10
          },
          children: [
            /* @__PURE__ */ jsx(HelpMessage, {
              messageType: 0,
              children: props.safeModeHint?.message
            }),
            props.safeModeHint?.footer
          ]
        }),
        /* @__PURE__ */ jsxs(import_react_native20.View, {
          style: {
            flexDirection: "row",
            gap: 8
          },
          children: [
            /* @__PURE__ */ jsx(Search_default, {
              style: {
                flexGrow: 1
              },
              isRound: !!props.sortOptions,
              onChangeText: (v2) => setSearch(v2)
            }),
            props.sortOptions && /* @__PURE__ */ jsx(IconButton, {
              icon: findAssetId("ArrowsUpDownIcon"),
              variant: "tertiary",
              disabled: !!search,
              onPress: () => showSimpleActionSheet({
                key: "AddonListSortOptions",
                header: {
                  title: "Sort Options",
                  onClose: () => hideActionSheet("AddonListSortOptions")
                },
                options: Object.entries(props.sortOptions).map(([name, fn]) => ({
                  label: name,
                  onPress: () => setSortFn(() => fn)
                }))
              })
            })
          ]
        }),
        props.ListHeaderComponent && /* @__PURE__ */ jsx(props.ListHeaderComponent, {})
      ]
    });
    return /* @__PURE__ */ jsxs(ErrorBoundary, {
      children: [
        /* @__PURE__ */ jsx(FlashList, {
          data: results,
          extraData: search,
          estimatedItemSize: 136,
          ListHeaderComponent: headerElement,
          ListEmptyComponent: () => /* @__PURE__ */ jsxs(import_react_native20.View, {
            style: {
              gap: 12,
              padding: 12,
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsx(import_react_native20.Image, {
                source: findAssetId("devices_not_found")
              }),
              /* @__PURE__ */ jsx(Text, {
                variant: "text-lg/semibold",
                color: "text-default",
                children: "Hmmm... could not find that!"
              })
            ]
          }),
          contentContainerStyle: {
            padding: 8,
            paddingHorizontal: 12,
            paddingBottom: 90
          },
          ItemSeparatorComponent: () => /* @__PURE__ */ jsx(import_react_native20.View, {
            style: {
              height: 8
            }
          }),
          ListFooterComponent: props.ListFooterComponent,
          renderItem: ({ item }) => /* @__PURE__ */ jsx(CardComponent, {
            item: item.obj,
            result: item
          })
        }),
        props.installAction && /* @__PURE__ */ jsx(FloatingActionButton, {
          positionBottom: bottomInset + 8,
          icon: findAssetId("PlusLargeIcon"),
          onPress: onInstallPress
        })
      ]
    });
  }
  var import_fuzzysort, import_react5, import_react_native20, showSimpleActionSheet, hideActionSheet;
  var init_AddonPage = __esm({
    "src/core/ui/components/AddonPage.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_settings();
      init_alerts();
      init_sheets();
      init_isValidHttpUrl();
      init_lazy();
      init_metro();
      init_common();
      init_components();
      init_components2();
      init_dist();
      import_fuzzysort = __toESM(require_fuzzysort());
      import_react5 = __toESM(require_react());
      import_react_native20 = __toESM(require_react_native());
      ({ showSimpleActionSheet, hideActionSheet } = lazyDestructure(() => findByProps("showSimpleActionSheet")));
    }
  });

  // src/core/ui/settings/pages/Plugins/usePluginCardStyles.ts
  var usePluginCardStyles;
  var init_usePluginCardStyles = __esm({
    "src/core/ui/settings/pages/Plugins/usePluginCardStyles.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_common();
      init_styles();
      usePluginCardStyles = createStyles({
        smallIcon: {
          tintColor: tokens.colors.LOGO_PRIMARY,
          height: 18,
          width: 18
        },
        badgeIcon: {
          tintColor: tokens.colors.LOGO_PRIMARY,
          height: 12,
          width: 12
        },
        badgesContainer: {
          flexWrap: "wrap",
          flexDirection: "row",
          gap: 6,
          borderRadius: 6,
          padding: 4
        }
      });
    }
  });

  // src/core/plugins/quickinstall/forumPost.tsx
  function useExtractThreadContent(thread, _firstMessage = null, actionSheet3 = false) {
    if (thread.guild_id !== KETTU_DISCORD_SERVER_ID)
      return;
    var postType;
    if (thread.parent_id === KETTU_PLUGINS_CHANNEL_ID) {
      postType = "Plugin";
    } else if (thread.parent_id === KETTU_THEMES_CHANNEL_ID && isThemeSupported()) {
      postType = "Theme";
    } else
      return;
    var { firstMessage } = actionSheet3 ? useFirstForumPostMessage(thread) : {
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
  function useInstaller(thread, firstMessage = null, actionSheet3 = false) {
    var [postType, url2] = useExtractThreadContent(thread, firstMessage, actionSheet3) ?? [];
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
  function InputAlert2({ title, confirmText, confirmColor, onConfirm, cancelText, placeholder, initialValue = "", secureTextEntry }) {
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
  var init_alerts2 = __esm({
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
      showInputAlert = (options) => showCustomAlert(InputAlert2, options);
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
  var import_react_native21, showSimpleActionSheet2, handleClick, getChannelId, getChannel, url_default;
  var init_url = __esm({
    "src/core/plugins/quickinstall/url.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_i18n();
      init_alerts2();
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
      import_react_native21 = __toESM(require_react_native());
      showSimpleActionSheet2 = findExports(byMutableProp("showSimpleActionSheet"));
      handleClick = findByPropsLazy("handleClick");
      ({ getChannelId } = lazyDestructure(() => channels));
      ({ getChannel } = lazyDestructure(() => findByProps("getChannel")));
      url_default = () => {
        var patches3 = new Array();
        patches3.push(after("showSimpleActionSheet", showSimpleActionSheet2, (args) => {
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
              onConfirmSecondary: () => import_react_native21.Linking.openURL(url2)
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
          var content = [
            "**CloudCord Debug Info**",
            `> CloudCord: ${info.bunny.version} (${info.bunny.loader.name} ${info.bunny.loader.version})`,
            `> Discord: ${info.discord.version} (${info.discord.build})`,
            `> React: ${info.react.version} (RN ${info.react.nativeVersion})`,
            `> Hermes: ${info.hermes.version} (bcv${info.hermes.bytecodeVersion})`,
            `> System: ${info.os.name} ${info.os.version} ${info.os.sdk ? `(SDK ${info.os.sdk})` : ""}`.trimEnd(),
            `> Device: ${info.device.model} (${info.device.codename})`
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

  // src/core/ui/settings/pages/Plugins/components/PluginCard.tsx
  function getHighlightColor() {
    return (0, import_chroma_js3.default)(tokens.unsafe_rawColors.YELLOW_300).alpha(0.3).hex();
  }
  function Title() {
    var styles = usePluginCardStyles();
    var { plugin, result } = useCardContext();
    var highlightedNode = result[0].highlight((m2, i) => /* @__PURE__ */ jsx(Text, {
      style: {
        backgroundColor: getHighlightColor()
      },
      children: m2
    }, i));
    var icon = plugin.icon && findAssetId(plugin.icon);
    var textNode = /* @__PURE__ */ jsx(Text, {
      numberOfLines: 1,
      variant: "heading-lg/semibold",
      children: highlightedNode.length ? highlightedNode : plugin.name
    });
    return /* @__PURE__ */ jsxs(import_react_native22.View, {
      style: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6
      },
      children: [
        icon && /* @__PURE__ */ jsx(import_react_native22.Image, {
          style: styles.smallIcon,
          source: icon
        }),
        textNode
      ]
    });
  }
  function Authors() {
    var { plugin, result } = useCardContext();
    var styles = usePluginCardStyles();
    if (!plugin.authors)
      return null;
    var highlightedNode = result[2].highlight((m2, i) => /* @__PURE__ */ jsx(Text, {
      style: {
        backgroundColor: getHighlightColor()
      },
      children: m2
    }, i));
    var badges = plugin.getBadges();
    var authorText = highlightedNode.length > 0 ? highlightedNode : plugin.authors.map((a) => a.name).join(", ");
    return /* @__PURE__ */ jsxs(import_react_native22.View, {
      style: {
        flexDirection: "row",
        flexWrap: "wrap",
        flexShrink: 1,
        gap: 4
      },
      children: [
        /* @__PURE__ */ jsxs(Text, {
          variant: "text-sm/semibold",
          color: "text-muted",
          children: [
            "by ",
            authorText
          ]
        }),
        badges.length > 0 && /* @__PURE__ */ jsx(import_react_native22.View, {
          style: styles.badgesContainer,
          children: badges.map((b3, i) => /* @__PURE__ */ jsx(import_react_native22.Image, {
            source: b3.source,
            style: styles.badgeIcon
          }, i))
        })
      ]
    });
  }
  function Description() {
    var { plugin, result } = useCardContext();
    var highlightedNode = result[1].highlight((m2, i) => /* @__PURE__ */ jsx(Text, {
      style: {
        backgroundColor: getHighlightColor()
      },
      children: m2
    }, i));
    return /* @__PURE__ */ jsx(Text, {
      variant: "text-md/medium",
      children: highlightedNode.length ? highlightedNode : plugin.description
    });
  }
  function PluginCard({ result, item: plugin }) {
    plugin.usePluginState();
    var [, forceUpdate] = React.useReducer(() => ({}), 0);
    var cardContextValue = (0, import_react6.useMemo)(() => ({
      plugin,
      result
    }), [
      plugin,
      result
    ]);
    var core = isCorePlugin(plugin.id);
    return /* @__PURE__ */ jsx(CardContext.Provider, {
      value: cardContextValue,
      children: /* @__PURE__ */ jsx(Card, {
        children: /* @__PURE__ */ jsxs(Stack, {
          spacing: 16,
          children: [
            /* @__PURE__ */ jsxs(import_react_native22.View, {
              style: {
                flexDirection: "row",
                justifyContent: "space-between"
              },
              children: [
                /* @__PURE__ */ jsxs(import_react_native22.View, {
                  style: {
                    flexShrink: 1
                  },
                  children: [
                    /* @__PURE__ */ jsx(Title, {}),
                    /* @__PURE__ */ jsx(Authors, {})
                  ]
                }),
                /* @__PURE__ */ jsx(import_react_native22.View, {
                  children: /* @__PURE__ */ jsxs(Stack, {
                    spacing: 12,
                    direction: "horizontal",
                    children: [
                      /* @__PURE__ */ jsx(Actions, {}),
                      /* @__PURE__ */ jsx(import_react_native22.View, {
                        style: core ? {
                          opacity: 0.5
                        } : void 0,
                        children: /* @__PURE__ */ jsx(TableSwitch, {
                          value: core ? true : plugin.isEnabled(),
                          disabled: core,
                          onValueChange: (v2) => {
                            if (!core) {
                              plugin.toggle(v2);
                              forceUpdate();
                            }
                          }
                        })
                      })
                    ]
                  })
                })
              ]
            }),
            /* @__PURE__ */ jsx(Description, {})
          ]
        })
      })
    });
  }
  var import_chroma_js3, import_react6, import_react_native22, CardContext, useCardContext, Actions;
  var init_PluginCard = __esm({
    "src/core/ui/settings/pages/Plugins/components/PluginCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_usePluginCardStyles();
      init_assets();
      init_common();
      init_components();
      init_sheets();
      import_chroma_js3 = __toESM(require_chroma_js());
      import_react6 = __toESM(require_react());
      import_react_native22 = __toESM(require_react_native());
      init_plugins4();
      CardContext = /* @__PURE__ */ (0, import_react6.createContext)(null);
      useCardContext = () => (0, import_react6.useContext)(CardContext);
      Actions = () => {
        var { plugin } = useCardContext();
        var navigation2 = NavigationNative.useNavigation();
        return /* @__PURE__ */ jsxs(import_react_native22.View, {
          style: {
            flexDirection: "row",
            gap: 6
          },
          children: [
            /* @__PURE__ */ jsx(IconButton, {
              size: "sm",
              variant: "secondary",
              icon: findAssetId("WrenchIcon"),
              disabled: !plugin.getPluginSettingsComponent(),
              onPress: () => navigation2.push("PUPU_CUSTOM_PAGE", {
                title: plugin.name,
                render: plugin.getPluginSettingsComponent()
              })
            }),
            /* @__PURE__ */ jsx(IconButton, {
              size: "sm",
              variant: "secondary",
              icon: findAssetId("CircleInformationIcon-primary"),
              onPress: () => void showSheet("PluginInfoActionSheet", plugin.resolveSheetComponent(), {
                plugin,
                navigation: navigation2
              })
            })
          ]
        });
      };
    }
  });

  // src/metro/common/stores.ts
  var UserStore;
  var init_stores = __esm({
    "src/metro/common/stores.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_wrappers();
      UserStore = findByStoreNameLazy("UserStore");
    }
  });

  // src/core/ui/settings/pages/Plugins/sheets/TitleComponent.tsx
  function TitleComponent({ plugin }) {
    var users = FluxUtils.useStateFromStoresArray([
      UserStore
    ], () => {
      plugin.authors?.forEach((a) => a.id && maybeFetchUser(a.id));
      return plugin.authors?.map((a) => UserStore.getUser(a.id));
    });
    var { authors } = plugin;
    var authorTextNode = [];
    if (authors) {
      var _loop2 = function(author2) {
        authorTextNode.push(/* @__PURE__ */ jsx(Text, {
          onPress: () => showUserProfileActionSheet({
            userId: author2.id
          }),
          variant: "text-md/medium",
          children: author2.name
        }));
        authorTextNode.push(", ");
      };
      for (var author of authors)
        _loop2(author);
      authorTextNode.pop();
    }
    return /* @__PURE__ */ jsxs(import_react_native23.View, {
      style: {
        gap: 4
      },
      children: [
        /* @__PURE__ */ jsx(import_react_native23.View, {
          children: /* @__PURE__ */ jsx(Text, {
            variant: "heading-xl/semibold",
            children: plugin.name
          })
        }),
        /* @__PURE__ */ jsx(import_react_native23.View, {
          style: {
            flexDirection: "row",
            flexShrink: 1
          },
          children: authors?.length && /* @__PURE__ */ jsxs(import_react_native23.View, {
            style: {
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: "#00000016",
              borderRadius: 32
            },
            children: [
              users.length && /* @__PURE__ */ jsx(AvatarPile, {
                size: "xxsmall",
                names: plugin.authors?.map((a) => a.name),
                totalCount: plugin.authors?.length,
                children: users.map((a) => /* @__PURE__ */ jsx(Avatar, {
                  size: "xxsmall",
                  user: a
                }))
              }),
              /* @__PURE__ */ jsx(Text, {
                variant: "text-md/medium",
                children: authorTextNode
              })
            ]
          })
        })
      ]
    });
  }
  var import_react_native23, showUserProfileActionSheet, maybeFetchUser;
  var init_TitleComponent = __esm({
    "src/core/ui/settings/pages/Plugins/sheets/TitleComponent.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_lazy();
      init_metro();
      init_common();
      init_components();
      init_stores();
      import_react_native23 = __toESM(require_react_native());
      showUserProfileActionSheet = findByNameLazy("showUserProfileActionSheet");
      ({ getUser: maybeFetchUser } = lazyDestructure(() => findByProps("getUser", "fetchProfile")));
    }
  });

  // src/core/ui/settings/pages/Plugins/sheets/PluginInfoActionSheet.tsx
  var PluginInfoActionSheet_exports = {};
  __export(PluginInfoActionSheet_exports, {
    default: () => PluginInfoActionSheet
  });
  function PluginInfoIconButton(props) {
    var { onPress } = props;
    props.onPress &&= () => {
      hideSheet("PluginInfoActionSheet");
      onPress?.();
    };
    return /* @__PURE__ */ jsx(IconButton, {
      ...props
    });
  }
  function PluginInfoActionSheet({ plugin, navigation: navigation2 }) {
    plugin.usePluginState();
    var [loading, setLoading] = (0, import_react7.useState)(false);
    var isVendettaPlugin = plugin.id.includes("/");
    var isCorePlugin2 = plugin.id.startsWith("bunny.") || plugin.id.startsWith("vendetta.");
    var copyPluginUrl = () => {
      var url2 = plugin.id;
      if (isVendettaPlugin) {
        url2 = plugin.id;
      } else {
        try {
          var pluginAny = plugin;
          var repoUrl = (
            //@ts-expect-error
            pluginAny._manifest?.parentRepository || //@ts-expect-error
            pluginAny.manifest?.parentRepository
          );
          url2 = repoUrl ? `${repoUrl}/builds/${plugin.id}` : plugin.id;
        } catch (e) {
          url2 = plugin.id;
        }
      }
      clipboard.setString(url2);
      showToast("Copied to clipboard!", findAssetId("toast_copy_link"));
    };
    var refetchPlugin = () => _async_to_generator(function* () {
      setLoading(true);
      try {
        if (isVendettaPlugin) {
          var vdPlugin = VdPluginManager.plugins[plugin.id];
          if (vdPlugin.enabled)
            VdPluginManager.stopPlugin(plugin.id, false);
          yield VdPluginManager.fetchPlugin(plugin.id);
          if (vdPlugin.enabled)
            yield VdPluginManager.startPlugin(plugin.id);
          showToast("Plugin refreshed successfully");
        } else {
          showToast("Plugin refreshed successfully");
        }
      } catch (e) {
        showToast("Failed to refresh plugin");
      } finally {
        setLoading(false);
      }
    })();
    var clearPluginData = () => {
      showConfirmationAlert({
        title: "Clear Data",
        content: "Are you sure you want to clear all data for this plugin? This action cannot be undone.",
        confirmText: "Clear",
        confirmColor: "red",
        cancelText: "Cancel",
        onConfirm: () => _async_to_generator(function* () {
          hideSheet("PluginInfoActionSheet");
          try {
            if (isVendettaPlugin) {
              var vdPlugin = VdPluginManager.plugins[plugin.id];
              if (vdPlugin.enabled)
                VdPluginManager.stopPlugin(plugin.id, false);
              yield purgeStorage(plugin.id);
              if (vdPlugin.enabled)
                yield VdPluginManager.startPlugin(plugin.id);
            } else {
              yield purgeStorage2(`plugins/storage/${plugin.id}.json`);
            }
            showToast("Plugin data cleared successfully");
          } catch (e) {
            showToast("Failed to clear plugin data");
          }
        })()
      });
    };
    var uninstallPluginHandler = () => {
      if (isCorePlugin2) {
        showToast("Core plugins cannot be uninstalled");
        return;
      }
      showConfirmationAlert({
        title: "Uninstall Plugin",
        content: "Are you sure you want to uninstall this plugin? This action cannot be undone.",
        confirmText: "Uninstall",
        confirmColor: "red",
        cancelText: "Cancel",
        onConfirm: () => _async_to_generator(function* () {
          hideSheet("PluginInfoActionSheet");
          try {
            if (isVendettaPlugin) {
              yield VdPluginManager.removePlugin(plugin.id);
            } else {
            }
            showToast("Plugin uninstalled successfully");
          } catch (e) {
            showToast(`Failed to uninstall plugin: ${e instanceof Error ? e.message : String(e)}`);
          }
        })()
      });
    };
    return /* @__PURE__ */ jsx(ActionSheet, {
      children: /* @__PURE__ */ jsxs(import_react_native24.ScrollView, {
        contentContainerStyle: {
          gap: 12,
          marginBottom: 12
        },
        children: [
          /* @__PURE__ */ jsx(import_react_native24.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 24,
              justifyContent: "space-between",
              width: "100%"
            },
            children: /* @__PURE__ */ jsx(TitleComponent, {
              plugin
            })
          }),
          /* @__PURE__ */ jsxs(import_react_native24.View, {
            style: {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 22,
              paddingHorizontal: 4
            },
            children: [
              /* @__PURE__ */ jsx(PluginInfoIconButton, {
                label: "Configure",
                variant: "secondary",
                disabled: !plugin.getPluginSettingsComponent(),
                icon: findAssetId("WrenchIcon"),
                onPress: () => {
                  navigation2.push("PUPU_CUSTOM_PAGE", {
                    title: plugin.name,
                    render: () => /* @__PURE__ */ jsx(ScaledPluginSettings, {
                      component: plugin.getPluginSettingsComponent()
                    })
                  });
                }
              }),
              !isCorePlugin2 && /* @__PURE__ */ jsx(PluginInfoIconButton, {
                label: "Refetch",
                variant: "secondary",
                icon: findAssetId("RetryIcon"),
                onPress: refetchPlugin,
                disabled: loading
              }),
              !isCorePlugin2 && /* @__PURE__ */ jsx(PluginInfoIconButton, {
                label: "Copy URL",
                variant: "secondary",
                icon: findAssetId("LinkIcon"),
                onPress: copyPluginUrl
              }),
              /* @__PURE__ */ jsx(PluginInfoIconButton, {
                label: "Clear Data",
                variant: "secondary",
                icon: findAssetId("FileIcon"),
                onPress: clearPluginData
              }),
              !isCorePlugin2 && /* @__PURE__ */ jsx(PluginInfoIconButton, {
                label: "Uninstall",
                variant: "secondary",
                icon: findAssetId("TrashIcon"),
                onPress: uninstallPluginHandler
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Card, {
            children: [
              /* @__PURE__ */ jsx(Text, {
                variant: "text-md/semibold",
                color: "text-primary",
                style: {
                  marginBottom: 4,
                  color: "text-strong"
                },
                children: "Description"
              }),
              /* @__PURE__ */ jsx(Text, {
                variant: "text-md/medium",
                children: plugin.description
              })
            ]
          })
        ]
      })
    });
  }
  var import_react7, import_react_native24;
  var init_PluginInfoActionSheet = __esm({
    "src/core/ui/settings/pages/Plugins/sheets/PluginInfoActionSheet.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_sheets();
      init_components();
      init_common();
      init_toasts();
      init_alerts2();
      init_plugins();
      init_storage();
      init_storage2();
      init_assets();
      import_react7 = __toESM(require_react());
      import_react_native24 = __toESM(require_react_native());
      init_TitleComponent();
      init_ScaledPluginSettings();
    }
  });

  // src/core/ui/settings/pages/Plugins/models/bunny.ts
  function unifyBunnyPlugin(manifest) {
    return {
      id: manifest.id,
      name: manifest.display.name,
      description: manifest.display.description,
      authors: manifest.display.authors,
      getBadges() {
        return [
          {
            source: {
              uri: kettu_default
            }
          }
        ];
      },
      isEnabled: () => isPluginEnabled(manifest.id),
      isInstalled: () => manifest.id in pluginSettings,
      usePluginState() {
        useObservable([
          pluginSettings
        ]);
      },
      toggle(start) {
        try {
          start ? enablePlugin(manifest.id, true) : disablePlugin(manifest.id);
        } catch (e) {
          console.error(e);
        }
      },
      resolveSheetComponent() {
        return Promise.resolve({
          default: (init_PluginInfoActionSheet(), __toCommonJS(PluginInfoActionSheet_exports)).default
        });
      },
      getPluginSettingsComponent() {
        return getPluginSettingsComponent(manifest.id);
      }
    };
  }
  var init_bunny = __esm({
    "src/core/ui/settings/pages/Plugins/models/bunny.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_settings3();
      init_plugins4();
      init_storage2();
    }
  });

  // src/core/ui/settings/pages/Plugins/models/vendetta.ts
  function unifyVdPlugin(vdPlugin) {
    return {
      id: vdPlugin.id,
      name: vdPlugin.manifest.name,
      description: vdPlugin.manifest.description,
      authors: vdPlugin.manifest.authors,
      icon: vdPlugin.manifest.vendetta?.icon,
      getBadges() {
        return [];
      },
      isEnabled: () => vdPlugin.enabled,
      isInstalled: () => Boolean(vdPlugin && VdPluginManager.plugins[vdPlugin.id]),
      usePluginState() {
        useProxy(VdPluginManager.plugins[vdPlugin.id]);
      },
      toggle(start) {
        start ? VdPluginManager.startPlugin(vdPlugin.id) : VdPluginManager.stopPlugin(vdPlugin.id);
      },
      resolveSheetComponent() {
        return Promise.resolve({
          default: (init_PluginInfoActionSheet(), __toCommonJS(PluginInfoActionSheet_exports)).default
        });
      },
      getPluginSettingsComponent() {
        return VdPluginManager.getSettings(vdPlugin.id);
      }
    };
  }
  var init_vendetta = __esm({
    "src/core/ui/settings/pages/Plugins/models/vendetta.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_plugins();
      init_storage();
    }
  });

  // src/core/ui/settings/pages/Plugins/index.tsx
  var Plugins_exports = {};
  __export(Plugins_exports, {
    default: () => Plugins
  });
  function PluginPage(props) {
    var items = props.useItems();
    return /* @__PURE__ */ jsx(AddonPage, {
      CardComponent: PluginCard,
      title: Strings.PLUGINS,
      searchKeywords: [
        "name",
        "description",
        (p) => p.authors?.map((a) => typeof a === "string" ? a : a.name).join() || ""
      ],
      sortOptions: {
        "Name (A-Z)": (a, b3) => a.name.localeCompare(b3.name),
        "Name (Z-A)": (a, b3) => b3.name.localeCompare(a.name)
      },
      safeModeHint: {
        message: Strings.SAFE_MODE_NOTICE_PLUGINS
      },
      items,
      ...props
    });
  }
  function Plugins() {
    useProxy(settings);
    var navigation2 = NavigationNative.useNavigation();
    return /* @__PURE__ */ jsx(PluginPage, {
      useItems: () => {
        useProxy(VdPluginManager.plugins);
        useObservable([
          pluginSettings
        ]);
        var corePlugins = [
          ...registeredPlugins.values()
        ].filter((p) => isPluginInstalled(p.id) && isCorePlugin(p.id)).map(unifyBunnyPlugin);
        var vdPlugins = Object.values(VdPluginManager.plugins).map(unifyVdPlugin);
        var bnPlugins = [
          ...registeredPlugins.values()
        ].filter((p) => isPluginInstalled(p.id) && !isCorePlugin(p.id)).map(unifyBunnyPlugin);
        return [
          ...corePlugins,
          ...vdPlugins,
          ...bnPlugins
        ];
      },
      ListHeaderComponent: () => {
        var unproxiedPlugins = Object.values(VdPluginManager.plugins).filter((p) => !p.id.startsWith(VD_PROXY_PREFIX) && !p.id.startsWith(BUNNY_PROXY_PREFIX));
        if (!unproxiedPlugins.length)
          return null;
        return /* @__PURE__ */ jsx(import_react_native25.View, {
          style: {
            marginVertical: 12,
            marginHorizontal: 10
          },
          children: /* @__PURE__ */ jsx(Card, {
            border: "strong",
            children: /* @__PURE__ */ jsxs(import_react_native25.View, {
              style: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row"
              },
              children: [
                /* @__PURE__ */ jsxs(import_react_native25.View, {
                  style: {
                    gap: 6,
                    flexShrink: 1
                  },
                  children: [
                    /* @__PURE__ */ jsx(Text, {
                      variant: "heading-md/bold",
                      children: "Unproxied Plugins Found"
                    }),
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-sm/medium",
                      color: "text-muted",
                      children: "Plugins installed from unproxied sources may run unverified code in this app without your awareness."
                    })
                  ]
                }),
                /* @__PURE__ */ jsx(import_react_native25.View, {
                  style: {
                    marginLeft: "auto"
                  },
                  children: /* @__PURE__ */ jsx(IconButton, {
                    size: "sm",
                    variant: "secondary",
                    icon: findAssetId("CircleInformationIcon-primary"),
                    style: {
                      marginLeft: 8
                    },
                    onPress: () => {
                      navigation2.push("PUPU_CUSTOM_PAGE", {
                        title: "Unproxied Plugins",
                        render: () => {
                          return /* @__PURE__ */ jsx(FlashList, {
                            data: unproxiedPlugins,
                            contentContainerStyle: {
                              padding: 8
                            },
                            ItemSeparatorComponent: () => /* @__PURE__ */ jsx(import_react_native25.View, {
                              style: {
                                height: 8
                              }
                            }),
                            renderItem: ({ item: p }) => /* @__PURE__ */ jsx(Card, {
                              children: /* @__PURE__ */ jsx(Text, {
                                variant: "heading-md/semibold",
                                children: p.id
                              })
                            })
                          });
                        }
                      });
                    }
                  })
                })
              ]
            })
          })
        });
      },
      installAction: {
        label: "Install a plugin",
        fetchFn: (url2) => _async_to_generator(function* () {
          if (!url2.startsWith(VD_PROXY_PREFIX) && !url2.startsWith(BUNNY_PROXY_PREFIX) && !settings.developerSettings) {
            openAlert2("bunny-plugin-unproxied-confirmation", /* @__PURE__ */ jsx(AlertModal3, {
              title: "Hold On!",
              content: "You're trying to install a plugin from an unproxied external source. This means you're trusting the creator to run their code in this app without your knowledge. Are you sure you want to continue?",
              extraContent: /* @__PURE__ */ jsx(Card, {
                children: /* @__PURE__ */ jsx(Text, {
                  variant: "text-md/bold",
                  children: url2
                })
              }),
              actions: /* @__PURE__ */ jsxs(AlertActions2, {
                children: [
                  /* @__PURE__ */ jsx(AlertActionButton3, {
                    text: "Continue",
                    variant: "primary",
                    onPress: () => {
                      VdPluginManager.installPlugin(url2).then(() => showToast(Strings.TOASTS_INSTALLED_PLUGIN, findAssetId("Check"))).catch((e) => openAlert2("bunny-plugin-install-failed", /* @__PURE__ */ jsx(AlertModal3, {
                        title: "Install Failed",
                        content: `Unable to install plugin from '${url2}':`,
                        extraContent: /* @__PURE__ */ jsx(Card, {
                          children: /* @__PURE__ */ jsx(Text, {
                            variant: "text-md/normal",
                            children: e instanceof Error ? e.message : String(e)
                          })
                        }),
                        actions: /* @__PURE__ */ jsx(AlertActionButton3, {
                          text: "Okay",
                          variant: "primary"
                        })
                      })));
                    }
                  }),
                  /* @__PURE__ */ jsx(AlertActionButton3, {
                    text: "Cancel",
                    variant: "secondary"
                  })
                ]
              })
            }));
          } else {
            return yield VdPluginManager.installPlugin(url2);
          }
        })()
      }
    });
  }
  var import_react_native25, openAlert2, AlertModal3, AlertActions2, AlertActionButton3;
  var init_Plugins = __esm({
    "src/core/ui/settings/pages/Plugins/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_i18n();
      init_AddonPage();
      init_PluginCard();
      init_plugins();
      init_storage();
      init_plugins4();
      init_assets();
      init_settings();
      init_storage2();
      init_toasts();
      init_constants();
      init_lazy();
      init_metro();
      init_common();
      init_components();
      import_react_native25 = __toESM(require_react_native());
      init_bunny();
      init_vendetta();
      ({ openAlert: openAlert2 } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
      ({ AlertModal: AlertModal3, AlertActions: AlertActions2, AlertActionButton: AlertActionButton3 } = lazyDestructure(() => findByProps("AlertModal", "AlertActions")));
    }
  });

  // src/core/ui/components/AddonCard.tsx
  function AddonCard(props) {
    var styles = useStyles3();
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(Stack, {
        spacing: 16,
        children: [
          /* @__PURE__ */ jsxs(import_react_native26.View, {
            style: {
              flexDirection: "row",
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsxs(import_react_native26.View, {
                style: styles.headerLeading,
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    style: styles.headerLabel,
                    children: props.headerLabel
                  }),
                  props.headerSublabel && /* @__PURE__ */ jsx(Text, {
                    style: styles.headerSubtitle,
                    children: props.headerSublabel
                  })
                ]
              }),
              /* @__PURE__ */ jsxs(import_react_native26.View, {
                style: [
                  styles.headerTrailing,
                  {
                    marginLeft: "auto"
                  }
                ],
                children: [
                  /* @__PURE__ */ jsxs(import_react_native26.View, {
                    style: styles.actions,
                    children: [
                      props.overflowActions && /* @__PURE__ */ jsx(IconButton, {
                        onPress: () => showSimpleActionSheet3({
                          key: "CardOverflow",
                          header: {
                            title: props.overflowTitle,
                            icon: props.headerIcon && /* @__PURE__ */ jsx(LegacyFormRow.Icon, {
                              style: {
                                marginRight: 8
                              },
                              source: findAssetId(props.headerIcon)
                            }),
                            onClose: () => hideActionSheet2()
                          },
                          options: props.overflowActions?.map((i) => ({
                            ...i,
                            icon: findAssetId(i.icon)
                          }))
                        }),
                        size: "sm",
                        variant: "secondary",
                        icon: findAssetId("CircleInformationIcon-primary")
                      }),
                      props.actions?.map(({ icon, onPress, disabled }) => /* @__PURE__ */ jsx(IconButton, {
                        onPress,
                        disabled,
                        size: "sm",
                        variant: "secondary",
                        icon: findAssetId(icon)
                      }))
                    ]
                  }),
                  props.toggleType && (props.toggleType === "switch" ? /* @__PURE__ */ jsx(FormSwitch, {
                    value: props.toggleValue(),
                    onValueChange: props.onToggleChange
                  }) : /* @__PURE__ */ jsx(import_react_native26.TouchableOpacity, {
                    onPress: () => {
                      props.onToggleChange?.(!props.toggleValue());
                    },
                    children: /* @__PURE__ */ jsx(FormRadio, {
                      selected: props.toggleValue()
                    })
                  }))
                ]
              })
            ]
          }),
          props.descriptionLabel && /* @__PURE__ */ jsx(Text, {
            variant: "text-md/medium",
            children: props.descriptionLabel
          })
        ]
      })
    });
  }
  var import_react_native26, hideActionSheet2, showSimpleActionSheet3, useStyles3;
  var init_AddonCard = __esm({
    "src/core/ui/components/AddonCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_lazy();
      init_components();
      init_wrappers();
      init_color();
      init_styles();
      import_react_native26 = __toESM(require_react_native());
      ({ hideActionSheet: hideActionSheet2 } = lazyDestructure(() => findByProps("openLazy", "hideActionSheet")));
      ({ showSimpleActionSheet: showSimpleActionSheet3 } = lazyDestructure(() => findByProps("showSimpleActionSheet")));
      useStyles3 = createStyles({
        card: {
          backgroundColor: semanticColors?.CARD_SECONDARY_BG,
          borderRadius: 12,
          overflow: "hidden"
        },
        header: {
          padding: 0
        },
        headerLeading: {
          flexDirection: "column",
          justifyContent: "center",
          scale: 1.2
        },
        headerTrailing: {
          display: "flex",
          flexDirection: "row",
          gap: 15,
          alignItems: "center"
        },
        headerLabel: {
          ...TextStyleSheet["heading-md/semibold"],
          color: semanticColors.MOBILE_TEXT_HEADING_PRIMARY
        },
        headerSubtitle: {
          ...TextStyleSheet["text-md/semibold"],
          color: semanticColors.TEXT_MUTED
        },
        descriptionLabel: {
          ...TextStyleSheet["text-md/semibold"],
          color: semanticColors.TEXT_NORMAL
        },
        actions: {
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 5
        },
        iconStyle: {
          tintColor: semanticColors.INTERACTIVE_ICON_DEFAULT,
          opacity: 0.2,
          height: 64,
          width: 64,
          left: void 0,
          right: "30%",
          top: "-10%"
        }
      });
    }
  });

  // src/core/ui/settings/pages/Themes/sheets/ThemeInfoActionSheet.tsx
  var ThemeInfoActionSheet_exports = {};
  __export(ThemeInfoActionSheet_exports, {
    default: () => ThemeInfoActionSheet
  });
  function ThemeInfoIconButton(props) {
    var { onPress } = props;
    props.onPress &&= () => {
      hideSheet("ThemeInfoActionSheet");
      onPress?.();
    };
    return /* @__PURE__ */ jsx(IconButton, {
      ...props,
      label: props.label
    });
  }
  function TitleComponent2({ theme }) {
    var { authors } = theme.data;
    return /* @__PURE__ */ jsxs(import_react_native27.View, {
      style: {
        gap: 4
      },
      children: [
        /* @__PURE__ */ jsx(import_react_native27.View, {
          children: /* @__PURE__ */ jsx(Text, {
            variant: "heading-xl/semibold",
            children: theme.data.name
          })
        }),
        /* @__PURE__ */ jsx(import_react_native27.View, {
          style: {
            flexDirection: "row",
            flexShrink: 1
          },
          children: authors && authors.length > 0 && /* @__PURE__ */ jsx(import_react_native27.TouchableOpacity, {
            style: {
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: "#00000016",
              borderRadius: 32
            },
            disabled: !authors.some((a) => a.id),
            children: /* @__PURE__ */ jsxs(Text, {
              variant: "text-md/medium",
              children: [
                "by ",
                authors.map((a) => a.name).join(", ")
              ]
            })
          })
        })
      ]
    });
  }
  function ThemeInfoActionSheet({ theme, navigation: navigation2 }) {
    var [themeState, setThemeState] = (0, import_react8.useState)({
      ...theme
    });
    var [loading, setLoading] = (0, import_react8.useState)(false);
    (0, import_react8.useEffect)(() => {
      var interval = setInterval(() => {
        setThemeState({
          ...theme
        });
      }, 500);
      return () => clearInterval(interval);
    }, [
      theme
    ]);
    var copyThemeUrl = () => {
      clipboard.setString(themeState.id);
      if (typeof showToast?.showCopyToClipboard === "function") {
        showToast.showCopyToClipboard();
      } else {
        showToast("Copied to clipboard");
      }
    };
    var refetchTheme = () => _async_to_generator(function* () {
      setLoading(true);
      try {
        yield fetchTheme(themeState.id, themeState.selected);
        showToast("Theme refreshed successfully");
      } catch (e) {
        console.error("Failed to refresh theme:", e);
        showToast("Failed to refresh theme");
      } finally {
        setLoading(false);
      }
    })();
    var removeThemeHandler = () => {
      showConfirmationAlert({
        title: Strings.HOLD_UP,
        content: formatString("ARE_YOU_SURE_TO_DELETE_THEME", {
          name: themeState.data.name
        }),
        confirmText: Strings.DELETE,
        cancelText: Strings.CANCEL,
        confirmColor: "red",
        onConfirm: () => _async_to_generator(function* () {
          hideSheet("ThemeInfoActionSheet");
          try {
            var wasSelected = yield removeTheme(themeState.id);
            if (wasSelected)
              selectTheme(null);
            showToast("Theme removed successfully");
          } catch (e) {
            console.error("Failed to remove theme:", e);
            showToast("Failed to remove theme");
          }
        })()
      });
    };
    var applyTheme = () => {
      try {
        selectTheme(themeState);
        hideSheet("ThemeInfoActionSheet");
        showToast(`Applied theme: ${themeState.data.name}`);
      } catch (e) {
        console.error("Failed to apply theme:", e);
        showToast("Failed to apply theme");
      }
    };
    return /* @__PURE__ */ jsx(ActionSheet, {
      children: /* @__PURE__ */ jsxs(import_react_native27.ScrollView, {
        contentContainerStyle: {
          gap: 12,
          marginBottom: 12
        },
        children: [
          /* @__PURE__ */ jsx(import_react_native27.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 24,
              justifyContent: "space-between",
              width: "100%"
            },
            children: /* @__PURE__ */ jsx(TitleComponent2, {
              theme: themeState
            })
          }),
          /* @__PURE__ */ jsxs(import_react_native27.View, {
            style: {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 65,
              paddingHorizontal: 8
            },
            children: [
              /* @__PURE__ */ jsx(ThemeInfoIconButton, {
                label: Strings.REFETCH,
                variant: "secondary",
                icon: findAssetId("RetryIcon"),
                onPress: refetchTheme,
                disabled: loading
              }),
              /* @__PURE__ */ jsx(ThemeInfoIconButton, {
                label: Strings.COPY_URL,
                variant: "secondary",
                icon: findAssetId("LinkIcon"),
                onPress: copyThemeUrl
              }),
              /* @__PURE__ */ jsx(ThemeInfoIconButton, {
                label: Strings.UNINSTALL,
                variant: "secondary",
                icon: findAssetId("TrashIcon"),
                onPress: removeThemeHandler
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Card, {
            children: [
              /* @__PURE__ */ jsx(Text, {
                variant: "text-md/semibold",
                style: {
                  marginBottom: 4,
                  color: semanticColors.MOBILE_TEXT_HEADING_PRIMARY
                },
                children: "Description"
              }),
              /* @__PURE__ */ jsx(Text, {
                variant: "text-md/medium",
                children: themeState.data.description || "No description provided."
              })
            ]
          })
        ]
      })
    });
  }
  var import_react8, import_react_native27;
  var init_ThemeInfoActionSheet = __esm({
    "src/core/ui/settings/pages/Themes/sheets/ThemeInfoActionSheet.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_assets();
      init_sheets();
      init_components();
      init_common();
      import_react8 = __toESM(require_react());
      import_react_native27 = __toESM(require_react_native());
      init_toasts();
      init_alerts2();
      init_themes();
      init_i18n();
      init_color();
    }
  });

  // src/core/ui/settings/pages/Themes/ThemeCard.tsx
  function ThemeCard({ item: theme }) {
    var navigation2 = NavigationNative.useNavigation();
    var [removed, setRemoved] = React2.useState(false);
    if (removed)
      return null;
    var { authors } = theme.data;
    return /* @__PURE__ */ jsx(AddonCard, {
      headerLabel: theme.data.name,
      headerSublabel: authors ? `by ${authors.map((i) => i.name).join(", ")}` : "",
      descriptionLabel: theme.data.description ?? "No description.",
      toggleType: !settings.safeMode?.enabled ? "radio" : void 0,
      toggleValue: () => themes[theme.id].selected,
      onToggleChange: (v2) => {
        try {
          selectTheme(v2 ? theme : null);
        } catch (e) {
          console.error("Error while selecting theme:", e);
        }
      },
      overflowTitle: theme.data.name,
      actions: [
        {
          icon: "CircleInformationIcon-primary",
          onPress: () => {
            var importPromise = Promise.resolve().then(() => (init_ThemeInfoActionSheet(), ThemeInfoActionSheet_exports));
            showSheet("ThemeInfoActionSheet", importPromise, {
              theme,
              navigation: navigation2
            });
          }
        }
      ]
    });
  }
  var init_ThemeCard = __esm({
    "src/core/ui/settings/pages/Themes/ThemeCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_AddonCard();
      init_themes();
      init_settings();
      init_sheets();
      init_common();
    }
  });

  // src/core/ui/settings/pages/Themes/index.tsx
  var Themes_exports = {};
  __export(Themes_exports, {
    default: () => Themes
  });
  function Themes() {
    useProxy(settings);
    useProxy(themes);
    return /* @__PURE__ */ jsx(AddonPage, {
      title: Strings.THEMES,
      searchKeywords: [
        "data.name",
        "data.description",
        (p) => p.data.authors?.map((a) => a.name).join(", ") ?? ""
      ],
      sortOptions: {
        "Name (A-Z)": (a, b3) => a.data.name.localeCompare(b3.data.name),
        "Name (Z-A)": (a, b3) => b3.data.name.localeCompare(a.data.name)
      },
      installAction: {
        label: "Install a theme",
        fetchFn: installTheme
      },
      items: Object.values(themes),
      safeModeHint: {
        message: formatString("SAFE_MODE_NOTICE_THEMES", {
          enabled: Boolean(settings.safeMode?.currentThemeId)
        }),
        footer: settings.safeMode?.currentThemeId && /* @__PURE__ */ jsx(Button, {
          size: "small",
          text: Strings.DISABLE_THEME,
          onPress: () => delete settings.safeMode?.currentThemeId,
          style: {
            marginTop: 8
          }
        })
      },
      CardComponent: ThemeCard,
      OptionsActionSheetComponent: () => {
        useObservable([
          colorsPref
        ]);
        return /* @__PURE__ */ jsxs(ActionSheet, {
          children: [
            /* @__PURE__ */ jsx(BottomSheetTitleHeader, {
              title: "Options"
            }),
            /* @__PURE__ */ jsxs(import_react_native28.View, {
              style: {
                paddingVertical: 20,
                gap: 12
              },
              children: [
                /* @__PURE__ */ jsxs(TableRowGroup, {
                  title: "Override Theme Type",
                  children: [
                    /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: "Auto",
                      icon: /* @__PURE__ */ jsx(TableRowIcon, {
                        source: findAssetId("RobotIcon")
                      }),
                      value: !colorsPref.type,
                      onValueChange: (enabled) => {
                        if (enabled) {
                          colorsPref.type = void 0;
                        } else {
                          colorsPref.type = "dark";
                        }
                        getCurrentTheme()?.data && updateBunnyColor(getCurrentTheme().data, {
                          update: true
                        });
                      }
                    }),
                    /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: "Dark",
                      icon: /* @__PURE__ */ jsx(TableRowIcon, {
                        source: findAssetId("ThemeDarkIcon")
                      }),
                      value: colorsPref.type === "dark",
                      onValueChange: (enabled) => {
                        colorsPref.type = enabled ? "dark" : void 0;
                        getCurrentTheme()?.data && updateBunnyColor(getCurrentTheme().data, {
                          update: true
                        });
                      }
                    }),
                    /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: "Light",
                      icon: /* @__PURE__ */ jsx(TableRowIcon, {
                        source: findAssetId("ThemeLightIcon")
                      }),
                      value: colorsPref.type === "light",
                      onValueChange: (enabled) => {
                        colorsPref.type = enabled ? "light" : void 0;
                        getCurrentTheme()?.data && updateBunnyColor(getCurrentTheme().data, {
                          update: true
                        });
                      }
                    })
                  ]
                }),
                /* @__PURE__ */ jsxs(TableRowGroup, {
                  title: "Chat Background",
                  children: [
                    /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: "Show Background",
                      icon: /* @__PURE__ */ jsx(TableRowIcon, {
                        source: findAssetId("ImageIcon")
                      }),
                      value: !colorsPref.customBackground,
                      onValueChange: (enabled) => {
                        colorsPref.customBackground = enabled ? null : "hidden";
                      }
                    }),
                    /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: "Hide Background",
                      icon: /* @__PURE__ */ jsx(TableRowIcon, {
                        source: findAssetId("DenyIcon")
                      }),
                      value: colorsPref.customBackground === "hidden",
                      onValueChange: (enabled) => {
                        colorsPref.customBackground = enabled ? "hidden" : null;
                      }
                    })
                  ]
                })
              ]
            })
          ]
        });
      }
    });
  }
  var import_react_native28;
  var init_Themes = __esm({
    "src/core/ui/settings/pages/Themes/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_i18n();
      init_AddonPage();
      init_ThemeCard();
      init_storage();
      init_themes();
      init_preferences();
      init_updater();
      init_assets();
      init_settings();
      init_storage2();
      init_components();
      import_react_native28 = __toESM(require_react_native());
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

  // src/core/ui/settings/pages/Fonts/FontEditor.tsx
  function promptDetachConfirmationForThen(fontName, cb) {
    if (fontName && fonts[fontName].source)
      openAlert3("revenge-fonts-detach-source-confirmation", /* @__PURE__ */ jsx(AlertModal4, {
        title: "Detach font pack URL?",
        content: "You need to detach the font pack URL from this font pack before you can manually edit its font entries. Do you want to detach the font pack URL?",
        actions: /* @__PURE__ */ jsxs(Stack, {
          children: [
            /* @__PURE__ */ jsx(AlertActionButton4, {
              text: "Detach",
              variant: "destructive",
              onPress: () => {
                delete fonts[fontName].source;
                cb();
              }
            }),
            /* @__PURE__ */ jsx(AlertActionButton4, {
              text: Strings.CANCEL,
              variant: "secondary"
            })
          ]
        })
      }));
    else
      cb();
  }
  function guessFontName(urls) {
    var fileNames = urls.map((url2) => {
      var { pathname } = new URL(url2);
      var fileName = pathname.replace(/\.[^/.]+$/, "");
      return fileName.split("/").pop();
    }).filter(Boolean);
    var shortest = fileNames.reduce((shortest2, name) => {
      return name.length < shortest2.length ? name : shortest2;
    }, fileNames[0] || "");
    return shortest?.replace(/-[A-Za-z]*$/, "") || null;
  }
  function RevengeFontsExtractor({ fonts: fonts2, setName }) {
    var currentTheme = getCurrentTheme().data;
    var themeFonts = currentTheme.fonts;
    var [fontName, setFontName] = (0, import_react9.useState)(guessFontName(Object.values(themeFonts)));
    var [error, setError] = (0, import_react9.useState)(void 0);
    return /* @__PURE__ */ jsxs(import_react_native29.View, {
      style: {
        padding: 8,
        paddingBottom: 16,
        gap: 12
      },
      children: [
        /* @__PURE__ */ jsx(TextInput, {
          autoFocus: true,
          size: "md",
          label: Strings.FONT_NAME,
          value: fontName,
          placeholder: fontName || "Whitney",
          onChange: setFontName,
          errorMessage: error,
          state: error ? "error" : void 0
        }),
        /* @__PURE__ */ jsx(Text, {
          variant: "text-xs/normal",
          color: "text-muted",
          children: formatString("THEME_EXTRACTOR_DESC", {
            fonts: Object.keys(themeFonts).join(Strings.SEPARATOR)
          })
        }),
        /* @__PURE__ */ jsx(Button, {
          size: "md",
          variant: "primary",
          text: Strings.EXTRACT,
          disabled: !fontName,
          onPress: () => {
            if (!fontName)
              return;
            try {
              validateFont({
                spec: 1,
                name: fontName,
                main: themeFonts
              });
              setName(fontName);
              Object.assign(fonts2, themeFonts);
              actionSheet2.hideActionSheet();
            } catch (e) {
              setError(String(e));
            }
          }
        })
      ]
    });
  }
  function JsonFontImporter({ fonts: fonts2, setName, setSource }) {
    var [fontLink, setFontLink] = (0, import_react9.useState)("");
    var [saving, setSaving] = (0, import_react9.useState)(false);
    var [error, setError] = (0, import_react9.useState)(void 0);
    return /* @__PURE__ */ jsxs(import_react_native29.View, {
      style: {
        padding: 8,
        paddingBottom: 16,
        gap: 12
      },
      children: [
        /* @__PURE__ */ jsx(TextInput, {
          autoFocus: true,
          size: "md",
          label: "Font Link",
          value: fontLink,
          placeholder: "https://link.to/font/pack.json",
          onChange: setFontLink,
          errorMessage: error,
          state: error ? "error" : void 0
        }),
        /* @__PURE__ */ jsx(Button, {
          size: "md",
          variant: "primary",
          text: "Import",
          disabled: !fontLink || saving,
          loading: saving,
          onPress: () => {
            setSaving(true);
            (() => _async_to_generator(function* () {
              var res = yield safeFetch(fontLink, {
                cache: "no-store"
              });
              var json = yield res.json();
              validateFont(json);
              setName(json.name);
              setSource(fontLink);
              Object.assign(fonts2, json.main);
            })())().then(() => actionSheet2.hideActionSheet()).catch((e) => setError(String(e))).finally(() => setSaving(false));
          }
        })
      ]
    });
  }
  function EntryEditorActionSheet(props) {
    var [familyName, setFamilyName] = (0, import_react9.useState)(props.name);
    var [fontUrl, setFontUrl] = (0, import_react9.useState)(props.fontEntries[props.name]);
    return /* @__PURE__ */ jsxs(import_react_native29.View, {
      style: {
        padding: 8,
        paddingBottom: 16,
        gap: 12
      },
      children: [
        /* @__PURE__ */ jsx(TextInput, {
          autoFocus: true,
          size: "md",
          label: "Family Name (to override)",
          value: familyName,
          placeholder: "ggsans-Bold",
          onChange: setFamilyName
        }),
        /* @__PURE__ */ jsx(TextInput, {
          size: "md",
          label: "Font URL",
          value: fontUrl,
          placeholder: "https://link.to/the/font.ttf",
          onChange: setFontUrl
        }),
        /* @__PURE__ */ jsx(Button, {
          size: "md",
          variant: "primary",
          text: "Apply",
          onPress: () => {
            delete props.fontEntries[props.name];
            props.fontEntries[familyName] = fontUrl;
            props.onChange();
            actionSheet2.hideActionSheet();
          }
        })
      ]
    });
  }
  function promptActionSheet(Component, fontEntries, props) {
    actionSheet2.openLazy(Promise.resolve({
      default: () => /* @__PURE__ */ jsx(ErrorBoundary, {
        children: /* @__PURE__ */ jsxs(ActionSheet, {
          children: [
            /* @__PURE__ */ jsx(BottomSheetTitleHeader, {
              title: "Import Font"
            }),
            /* @__PURE__ */ jsx(Component, {
              fonts: fontEntries,
              ...props
            })
          ]
        })
      })
    }), "FontEditorActionSheet");
  }
  function NewEntryRow({ fontName, fontEntry }) {
    var nameRef = (0, import_react9.useRef)();
    var urlRef = (0, import_react9.useRef)();
    var [nameSet, setNameSet] = (0, import_react9.useState)(false);
    var [error, setError] = (0, import_react9.useState)();
    return /* @__PURE__ */ jsxs(import_react_native29.View, {
      style: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "flex-start"
      },
      children: [
        /* @__PURE__ */ jsx(import_react_native29.View, {
          style: {
            flex: 1
          },
          children: /* @__PURE__ */ jsx(TextInput, {
            isRound: true,
            size: "md",
            label: nameSet ? nameRef.current : void 0,
            placeholder: nameSet ? "https://path.to/the/file.ttf" : "PostScript name (e.g. ggsans-Bold)",
            leadingIcon: () => nameSet ? null : /* @__PURE__ */ jsx(TableRow.Icon, {
              source: findAssetId("PlusSmallIcon")
            }),
            leadingText: nameSet ? nameRef.current : "",
            onChange: (text) => (nameSet ? urlRef : nameRef).current = text,
            errorMessage: error,
            state: error ? "error" : void 0
          })
        }),
        nameSet && /* @__PURE__ */ jsx(IconButton, {
          size: "md",
          variant: "secondary",
          onPress: () => {
            nameRef.current = "";
            setNameSet(false);
          },
          icon: findAssetId("TrashIcon")
        }),
        /* @__PURE__ */ jsx(IconButton, {
          size: "md",
          variant: "primary",
          onPress: () => promptDetachConfirmationForThen(fontName, () => {
            if (!nameSet && nameRef.current) {
              setNameSet(true);
            } else if (nameSet && nameRef.current && urlRef.current) {
              try {
                var parsedUrl = new URL(urlRef.current);
                if (!parsedUrl.protocol || !parsedUrl.host) {
                  throw "Invalid URL";
                }
                fontEntry[nameRef.current] = urlRef.current;
                nameRef.current = void 0;
                urlRef.current = void 0;
                setNameSet(false);
              } catch (e) {
                setError(String(e));
              }
            }
          }),
          icon: findAssetId(nameSet ? "PlusSmallIcon" : "ArrowLargeRightIcon")
        })
      ]
    });
  }
  function FontEditor(props) {
    var [name, setName] = (0, import_react9.useState)(props.name);
    var [source, setSource] = (0, import_react9.useState)(props.name && fonts[props.name].source);
    var [importing, setIsImporting] = (0, import_react9.useState)(false);
    var [errors, setErrors] = (0, import_react9.useState)();
    var memoEntry = (0, import_react9.useMemo)(() => {
      return createProxy(props.name ? {
        ...fonts[props.name].main
      } : {}).proxy;
    }, [
      props.name
    ]);
    var fontEntries = useProxy(memoEntry);
    var navigation2 = NavigationNative.useNavigation();
    var [, forceUpdate] = React.useReducer(() => ({}), 0);
    return /* @__PURE__ */ jsx(import_react_native29.ScrollView, {
      style: {
        flex: 1
      },
      contentContainerStyle: {
        paddingBottom: 38
      },
      children: /* @__PURE__ */ jsxs(Stack, {
        style: {
          paddingVertical: 24,
          paddingHorizontal: 12
        },
        spacing: 12,
        children: [
          !props.name ? /* @__PURE__ */ jsxs(TableRowGroup, {
            title: "Import",
            children: [
              getCurrentTheme()?.data?.fonts && /* @__PURE__ */ jsx(TableRow, {
                label: Strings.LABEL_EXTRACT_FONTS_FROM_THEME,
                subLabel: Strings.DESC_EXTRACT_FONTS_FROM_THEME,
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("HammerIcon")
                }),
                onPress: () => promptActionSheet(RevengeFontsExtractor, fontEntries, {
                  setName
                })
              }),
              /* @__PURE__ */ jsx(TableRow, {
                label: "Import font entries from a link",
                subLabel: "Directly import from a link with a pre-configured JSON file",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("LinkIcon")
                }),
                onPress: () => promptActionSheet(JsonFontImporter, fontEntries, {
                  setName,
                  setSource
                })
              })
            ]
          }) : /* @__PURE__ */ jsxs(TableRowGroup, {
            title: "Actions",
            children: [
              /* @__PURE__ */ jsx(TableRow, {
                label: "Refetch fonts from source",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  source: findAssetId("RetryIcon")
                }),
                onPress: () => _async_to_generator(function* () {
                  yield updateFont(fonts[props.name]);
                  navigation2.goBack();
                })()
              }),
              /* @__PURE__ */ jsx(TableRow, {
                variant: "danger",
                label: "Delete font pack",
                icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                  variant: "danger",
                  source: findAssetId("TrashIcon")
                }),
                onPress: () => removeFont(props.name).then(() => navigation2.goBack())
              })
            ]
          }),
          /* @__PURE__ */ jsx(TextInput, {
            size: "lg",
            value: name,
            label: Strings.FONT_NAME,
            placeholder: "Whitney",
            onChange: setName
          }),
          props.name && fonts[props.name].source && /* @__PURE__ */ jsx(TextInput, {
            size: "lg",
            value: source,
            label: "Font Pack URL",
            onChange: setSource
          }),
          /* @__PURE__ */ jsxs(TableRowGroup, {
            title: "Font Entries",
            children: [
              Object.entries(fontEntries).map(([name2, url2], index) => {
                var error = errors?.[index];
                return /* @__PURE__ */ jsx(TableRow, {
                  label: name2,
                  subLabel: error ? /* @__PURE__ */ jsx(Text, {
                    variant: "text-xs/medium",
                    color: "text-feedback-critical",
                    children: error.message
                  }) : url2,
                  trailing: /* @__PURE__ */ jsxs(Stack, {
                    spacing: 8,
                    direction: "horizontal",
                    children: [
                      /* @__PURE__ */ jsx(IconButton, {
                        size: "sm",
                        variant: "secondary",
                        icon: findAssetId("PencilIcon"),
                        onPress: () => promptDetachConfirmationForThen(props.name, () => promptActionSheet(EntryEditorActionSheet, fontEntries, {
                          name: name2,
                          fontEntries,
                          onChange: () => {
                            setErrors(void 0);
                            forceUpdate();
                          }
                        }))
                      }),
                      /* @__PURE__ */ jsx(IconButton, {
                        size: "sm",
                        variant: "secondary",
                        icon: findAssetId("TrashIcon"),
                        onPress: () => promptDetachConfirmationForThen(props.name, () => {
                          delete fontEntries[name2];
                          setErrors(void 0);
                        })
                      })
                    ]
                  })
                });
              }),
              /* @__PURE__ */ jsx(TableRow, {
                label: /* @__PURE__ */ jsx(NewEntryRow, {
                  fontName: props.name,
                  fontEntry: fontEntries
                })
              })
            ]
          }),
          errors && /* @__PURE__ */ jsx(Text, {
            variant: "text-sm/medium",
            color: "text-feedback-critical",
            children: "Some font entries cannot be imported. Please modify the entries and try again."
          }),
          /* @__PURE__ */ jsx(import_react_native29.View, {
            style: {
              flexDirection: "row",
              justifyContent: "flex-end",
              bottom: 0,
              left: 0
            },
            children: /* @__PURE__ */ jsx(Button, {
              size: "lg",
              loading: importing,
              disabled: importing || !name || Object.keys(fontEntries).length === 0,
              variant: "primary",
              text: props.name ? "Save" : "Import",
              onPress: () => _async_to_generator(function* () {
                if (!name)
                  return;
                setErrors(void 0);
                setIsImporting(true);
                if (!props.name) {
                  saveFont({
                    spec: 1,
                    name,
                    main: fontEntries,
                    source
                  }).then(() => navigation2.goBack()).catch((e) => setErrors(e)).finally(() => setIsImporting(false));
                } else {
                  Object.assign(fonts[props.name], {
                    name,
                    main: fontEntries
                  });
                  updateFont(fonts[props.name]).then(() => navigation2.goBack()).catch((e) => setErrors(e)).finally(() => setIsImporting(false));
                }
              })(),
              icon: findAssetId(props.name ? "toast_image_saved" : "DownloadIcon"),
              style: {
                marginLeft: 8
              }
            })
          })
        ]
      })
    });
  }
  var import_react9, import_react_native29, actionSheet2, openAlert3, AlertModal4, AlertActionButton4;
  var init_FontEditor = __esm({
    "src/core/ui/settings/pages/Fonts/FontEditor.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_i18n();
      init_storage();
      init_fonts();
      init_themes();
      init_assets();
      init_utils();
      init_lazy();
      init_common();
      init_components();
      init_wrappers();
      init_components2();
      import_react9 = __toESM(require_react());
      import_react_native29 = __toESM(require_react_native());
      actionSheet2 = findByPropsLazy("hideActionSheet");
      ({ openAlert: openAlert3 } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
      ({ AlertModal: AlertModal4, AlertActionButton: AlertActionButton4 } = lazyDestructure(() => findByProps("AlertModal", "AlertActions")));
    }
  });

  // src/core/ui/settings/pages/Fonts/FontCard.tsx
  function FontCard({ item: font }) {
    useProxy(fonts);
    var navigation2 = NavigationNative.useNavigation();
    var selected = fonts.__selected === font.name;
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsx(Stack, {
        spacing: 16,
        children: /* @__PURE__ */ jsxs(import_react_native30.View, {
          style: {
            flexDirection: "row",
            alignItems: "center"
          },
          children: [
            /* @__PURE__ */ jsx(import_react_native30.View, {
              children: /* @__PURE__ */ jsx(Text, {
                variant: "heading-lg/semibold",
                children: font.name
              })
            }),
            /* @__PURE__ */ jsx(import_react_native30.View, {
              style: {
                marginLeft: "auto"
              },
              children: /* @__PURE__ */ jsxs(Stack, {
                spacing: 12,
                direction: "horizontal",
                children: [
                  /* @__PURE__ */ jsx(IconButton, {
                    onPress: () => {
                      navigation2.push("BUNNY_CUSTOM_PAGE", {
                        title: "Edit Font",
                        render: () => /* @__PURE__ */ jsx(FontEditor, {
                          name: font.name
                        })
                      });
                    },
                    size: "sm",
                    variant: "secondary",
                    disabled: selected,
                    icon: findAssetId("WrenchIcon")
                  }),
                  /* @__PURE__ */ jsx(Button, {
                    size: "sm",
                    variant: selected ? "secondary" : "primary",
                    text: selected ? "Unapply" : "Apply",
                    onPress: () => _async_to_generator(function* () {
                      yield selectFont(selected ? null : font.name);
                      showConfirmationAlert({
                        title: Strings.HOLD_UP,
                        content: "Reload Discord to apply changes?",
                        confirmText: Strings.RELOAD,
                        cancelText: Strings.CANCEL,
                        confirmColor: "red",
                        onConfirm: BundleUpdaterManager.reload
                      });
                    })()
                  })
                ]
              })
            })
          ]
        })
      })
    });
  }
  var import_react_native30, useToken2;
  var init_FontCard = __esm({
    "src/core/ui/settings/pages/Fonts/FontCard.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_i18n();
      init_alerts2();
      init_storage();
      init_fonts();
      init_assets();
      init_modules();
      init_lazy();
      init_metro();
      init_common();
      init_components();
      import_react_native30 = __toESM(require_react_native());
      init_FontEditor();
      ({ useToken: useToken2 } = lazyDestructure(() => findByProps("useToken")));
    }
  });

  // src/core/ui/settings/pages/Fonts/index.tsx
  var Fonts_exports = {};
  __export(Fonts_exports, {
    default: () => Fonts
  });
  function Fonts() {
    useProxy(settings);
    useProxy(fonts);
    var navigation2 = NavigationNative.useNavigation();
    return /* @__PURE__ */ jsx(AddonPage, {
      title: Strings.FONTS,
      searchKeywords: [
        "name",
        "description"
      ],
      sortOptions: {
        "Name (A-Z)": (a, b3) => a.name.localeCompare(b3.name),
        "Name (Z-A)": (a, b3) => b3.name.localeCompare(a.name)
      },
      items: Object.values(fonts),
      safeModeHint: {
        message: Strings.SAFE_MODE_NOTICE_FONTS
      },
      CardComponent: FontCard,
      installAction: {
        label: "Install a font",
        onPress: () => {
          navigation2.push("BUNNY_CUSTOM_PAGE", {
            title: "Import Font",
            render: () => /* @__PURE__ */ jsx(FontEditor, {})
          });
        }
      }
    });
  }
  var init_Fonts = __esm({
    "src/core/ui/settings/pages/Fonts/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_i18n();
      init_AddonPage();
      init_FontEditor();
      init_storage();
      init_fonts();
      init_settings();
      init_common();
      init_FontCard();
    }
  });

  // src/core/ui/settings/pages/PluginBrowser/index.tsx
  var PluginBrowser_exports = {};
  __export(PluginBrowser_exports, {
    default: () => BrowserPage
  });
  function normalizeIdFromInstallUrl(url2) {
    return url2.endsWith("/") ? url2 : url2 + "/";
  }
  function InstallButton({ addon, isPluginMode, installing, setInstalling, setRefreshTick }) {
    var normId = normalizeIdFromInstallUrl(addon.installUrl);
    var [installed, setInstalled] = React2.useState(() => isPluginMode ? Boolean(VdPluginManager.plugins[normId]) : Boolean(themes[addon.installUrl]));
    React2.useEffect(() => {
      setInstalled(isPluginMode ? Boolean(VdPluginManager.plugins[normId]) : Boolean(themes[addon.installUrl]));
    }, [
      addon.installUrl,
      setRefreshTick,
      isPluginMode
    ]);
    var installAddon = () => _async_to_generator(function* () {
      if (installing.has(normId))
        return;
      setInstalling((prev) => new Set(prev).add(normId));
      try {
        if (isPluginMode) {
          yield VdPluginManager.installPlugin(normId, true);
        } else {
          yield installTheme(addon.installUrl);
        }
        showToast(`Installed ${addon.name}`, findAssetId("CheckIcon"));
        setInstalled(true);
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), findAssetId("CircleXIcon-primary"));
      } finally {
        setInstalling((prev) => {
          var s = new Set(prev);
          s.delete(normId);
          return s;
        });
        setRefreshTick((t) => t + 1);
      }
    })();
    var uninstallAddon = () => _async_to_generator(function* () {
      try {
        if (isPluginMode) {
          yield VdPluginManager.removePlugin(normId);
        } else {
          yield removeTheme(addon.installUrl);
        }
        showToast(`Uninstalled ${addon.name}`, findAssetId("TrashIcon"));
        setInstalled(false);
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), findAssetId("CircleXIcon-primary"));
      } finally {
        setRefreshTick((t) => t + 1);
      }
    })();
    var promptInstall = () => {
      if (!isPluginMode)
        return installAddon();
      var plugin = addon;
      var needsWarn = plugin.status && plugin.status !== "working" || plugin.warningMessage && plugin.warningMessage.trim().length > 0;
      if (!needsWarn)
        return installAddon();
      var lines = [];
      if (plugin.status && plugin.status !== "working") {
        if (plugin.status === "broken")
          lines.push("This plugin is marked as broken, please be aware you may encounter issues");
        else if (plugin.status === "warning")
          lines.push("This plugin may have issues");
        else
          lines.push(`Status: ${plugin.status}`);
      }
      if (plugin.warningMessage)
        lines.push(plugin.warningMessage);
      openAlert("plugins-list-install-warning", /* @__PURE__ */ jsx(AlertModal, {
        title: "Warning!",
        content: "This plugin may not work as expected.",
        extraContent: /* @__PURE__ */ jsx(Text, {
          variant: "text-sm/normal",
          color: "text-muted",
          children: lines.join("\n\n")
        }),
        actions: /* @__PURE__ */ jsxs(AlertActions, {
          children: [
            /* @__PURE__ */ jsx(AlertActionButton2, {
              text: "Install Anyway",
              variant: "primary",
              onPress: () => {
                dismissAlert("plugins-list-install-warning");
                installAddon();
              }
            }),
            /* @__PURE__ */ jsx(AlertActionButton2, {
              text: "Cancel",
              variant: "secondary",
              onPress: () => dismissAlert("plugins-list-install-warning")
            })
          ]
        })
      }));
    };
    return /* @__PURE__ */ jsx(Button, {
      size: "sm",
      loading: installing.has(normId),
      text: !installed ? installing.has(normId) ? "Installing..." : "Install" : "Uninstall",
      disabled: installing.has(normId),
      onPress: !installed ? promptInstall : uninstallAddon,
      variant: !installed ? "primary" : "destructive",
      icon: findAssetId(!installed ? "DownloadIcon" : "TrashIcon")
    });
  }
  function TrailingButtons({ addon, isPluginMode, installing, setInstalling, setRefreshTick }) {
    var copyAddonLink = () => {
      clipboard.setString(addon.installUrl);
      showToast.showCopyToClipboard?.();
    };
    var copySourceUrl = () => {
      var plugin = addon;
      clipboard.setString(plugin.sourceUrl);
      showToast.showCopyToClipboard?.();
    };
    var openAddonMenu = () => {
      var actions = [
        {
          label: `Copy ${isPluginMode ? "Plugin" : "Theme"} Link`,
          icon: findAssetId("CopyIcon"),
          onPress: copyAddonLink
        }
      ];
      if (isPluginMode && addon.sourceUrl) {
        actions.push({
          label: "Copy Source URL",
          icon: findAssetId("CopyIcon"),
          onPress: copySourceUrl
        });
      }
      var sheetKey = `${isPluginMode ? "plugin" : "theme"}-menu`;
      showSheet(sheetKey, () => /* @__PURE__ */ jsx(ActionSheet, {
        children: /* @__PURE__ */ jsx(TableRowGroup, {
          title: `${isPluginMode ? "Plugin" : "Theme"} Info`,
          children: actions.map((action, index) => /* @__PURE__ */ jsx(TableRow, {
            label: action.label,
            icon: /* @__PURE__ */ jsx(TableRow.Icon, {
              source: action.icon
            }),
            onPress: () => {
              action.onPress();
              hideSheet(sheetKey);
            }
          }, index))
        })
      }));
    };
    return /* @__PURE__ */ jsxs(Stack, {
      spacing: 8,
      direction: "horizontal",
      children: [
        /* @__PURE__ */ jsx(IconButton, {
          size: "sm",
          onPress: openAddonMenu,
          variant: "secondary",
          icon: findAssetId("MoreHorizontalIcon")
        }),
        /* @__PURE__ */ jsx(InstallButton, {
          addon,
          isPluginMode,
          installing,
          setInstalling,
          setRefreshTick
        })
      ]
    });
  }
  function AddonCard2({ addon, isPluginMode, installing, setInstalling, setRefreshTick }) {
    var { name, description, authors } = addon;
    var plugin = addon;
    var statusColor = "text-normal";
    if (isPluginMode) {
      if (plugin.status === "working")
        statusColor = "#4ADE80";
      if (plugin.status === "broken")
        statusColor = "#EF4444";
      if (plugin.status === "warning")
        statusColor = "#F59E0B";
    }
    return /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsxs(Stack, {
        spacing: 16,
        children: [
          /* @__PURE__ */ jsxs(import_react_native31.View, {
            style: {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsxs(import_react_native31.View, {
                style: {
                  flexShrink: 1
                },
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    numberOfLines: 1,
                    variant: "heading-lg/semibold",
                    children: name
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    variant: "text-md/semibold",
                    color: "text-muted",
                    children: [
                      "by ",
                      authors?.join(", ") || "Unknown"
                    ]
                  }),
                  isPluginMode && /* @__PURE__ */ jsxs(Text, {
                    variant: "text-md/semibold",
                    style: {
                      color: statusColor
                    },
                    children: [
                      "Status: ",
                      plugin.status
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsx(import_react_native31.View, {
                children: /* @__PURE__ */ jsx(TrailingButtons, {
                  addon,
                  isPluginMode,
                  installing,
                  setInstalling,
                  setRefreshTick
                })
              })
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            variant: "text-md/medium",
            children: description
          }),
          isPluginMode && plugin.warningMessage && /* @__PURE__ */ jsxs(Text, {
            variant: "text-sm/medium",
            color: "text-muted",
            children: [
              "Warning: ",
              plugin.warningMessage
            ]
          })
        ]
      })
    });
  }
  function BrowserPage() {
    var navigation2 = NavigationNative.useNavigation();
    var [mode, setMode] = React2.useState("plugins");
    var [plugins2, setPlugins] = React2.useState([]);
    var [themesList, setThemesList] = React2.useState([]);
    var [loading, setLoading] = React2.useState(true);
    var [error, setError] = React2.useState(null);
    var [searchQuery, setSearchQuery] = React2.useState("");
    var [installing, setInstalling] = React2.useState(/* @__PURE__ */ new Set());
    var [refreshTick, setRefreshTick] = React2.useState(0);
    var [sort, setSort] = React2.useState("Newest");
    React2.useEffect(() => {
      navigation2.setOptions({
        title: "Browser"
      });
    }, [
      navigation2
    ]);
    var fetchData = React2.useCallback((isPluginMode) => _async_to_generator(function* () {
      setLoading(true);
      setError(null);
      try {
        var url2 = isPluginMode ? PLUGIN_URL2 : THEME_URL;
        var response = yield safeFetch(url2);
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        var data = yield response.json();
        var addonList = [];
        if (Array.isArray(data)) {
          addonList = data;
        } else if (isPluginMode && data.OFFICIAL_PLUGINS) {
          addonList = data.OFFICIAL_PLUGINS;
        } else if (!isPluginMode) {
          addonList = data.OFFICIAL_THEMES || data.themes || data.THEMES || data.items || [];
        }
        if (isPluginMode) {
          setPlugins(addonList);
        } else {
          setThemesList(addonList);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        if (isPluginMode) {
          setPlugins([]);
        } else {
          setThemesList([]);
        }
      } finally {
        setLoading(false);
      }
    })(), []);
    var fetchPlugins = React2.useCallback(() => fetchData(true), [
      fetchData
    ]);
    var fetchThemes = React2.useCallback(() => fetchData(false), [
      fetchData
    ]);
    React2.useEffect(() => {
      fetchPlugins();
      fetchThemes();
    }, [
      fetchPlugins,
      fetchThemes
    ]);
    var filterList = (list) => {
      if (!list)
        return [];
      var q3 = searchQuery.toLowerCase();
      if (!q3)
        return list;
      return list.filter((p) => p.name.toLowerCase().includes(q3) || p.description.toLowerCase().includes(q3) || (p.authors || []).some((a) => a.toLowerCase().includes(q3)));
    };
    var sortedAndFiltered = React2.useMemo(() => {
      var list = filterList(mode === "plugins" ? plugins2 : themesList);
      var getStatusPriority = (status, sortBy) => {
        if (sortBy === "Working First") {
          return status === "working" || status === "warning" ? 0 : 1;
        }
        if (sortBy === "Broken First") {
          return status === "broken" ? 0 : 1;
        }
        return 0;
      };
      switch (sort) {
        case "Newest":
          return [
            ...list
          ].reverse();
        case "Oldest":
          return [
            ...list
          ];
        case "Name (A\u2013Z)":
          return [
            ...list
          ].sort((a, b3) => a.name.localeCompare(b3.name));
        case "Name (Z\u2013A)":
          return [
            ...list
          ].sort((a, b3) => b3.name.localeCompare(a.name));
        case "Working First":
          if (mode === "plugins") {
            return [
              ...list
            ].sort((a, b3) => {
              var pa = getStatusPriority(a.status, "Working First");
              var pb = getStatusPriority(b3.status, "Working First");
              return pa !== pb ? pa - pb : a.name.localeCompare(b3.name);
            });
          }
          return list;
        case "Broken First":
          if (mode === "plugins") {
            return [
              ...list
            ].sort((a, b3) => {
              var pa = getStatusPriority(a.status, "Broken First");
              var pb = getStatusPriority(b3.status, "Broken First");
              return pa !== pb ? pa - pb : a.name.localeCompare(b3.name);
            });
          }
          return list;
        default:
          return list;
      }
    }, [
      plugins2,
      themesList,
      mode,
      searchQuery,
      sort
    ]);
    if (error) {
      return /* @__PURE__ */ jsx(import_react_native31.View, {
        style: {
          flex: 1,
          paddingHorizontal: 8,
          justifyContent: "center",
          alignItems: "center"
        },
        children: /* @__PURE__ */ jsxs(Card, {
          style: {
            gap: 8
          },
          children: [
            /* @__PURE__ */ jsx(Text, {
              style: {
                textAlign: "center"
              },
              variant: "heading-lg/bold",
              children: "An error occurred while fetching the repository"
            }),
            /* @__PURE__ */ jsx(Text, {
              style: {
                textAlign: "center"
              },
              variant: "text-sm/medium",
              color: "text-muted",
              children: error
            }),
            /* @__PURE__ */ jsx(Button, {
              size: "lg",
              text: "Refetch",
              onPress: () => fetchData(mode === "plugins"),
              icon: findAssetId("RetryIcon")
            })
          ]
        })
      });
    }
    return /* @__PURE__ */ jsxs(import_react_native31.View, {
      style: {
        flex: 1
      },
      children: [
        /* @__PURE__ */ jsx(import_react_native31.View, {
          style: {
            paddingHorizontal: 10
          },
          children: /* @__PURE__ */ jsxs(Stack, {
            spacing: 12,
            children: [
              /* @__PURE__ */ jsx(import_react_native31.View, {
                style: {
                  flexDirection: "row",
                  paddingTop: 10
                },
                children: /* @__PURE__ */ jsxs(import_react_native31.View, {
                  style: {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center"
                  },
                  children: [
                    /* @__PURE__ */ jsx(Button, {
                      size: "md",
                      text: "Plugins",
                      variant: mode === "plugins" ? "primary" : "secondary",
                      onPress: () => setMode("plugins"),
                      style: {
                        flex: 1
                      }
                    }),
                    /* @__PURE__ */ jsx(import_react_native31.View, {
                      style: {
                        width: 8
                      }
                    }),
                    /* @__PURE__ */ jsx(Button, {
                      size: "md",
                      text: "Themes",
                      variant: mode === "themes" ? "primary" : "secondary",
                      onPress: () => setMode("themes"),
                      style: {
                        flex: 1
                      }
                    })
                  ]
                })
              }),
              /* @__PURE__ */ jsxs(import_react_native31.View, {
                style: {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingBottom: 6
                },
                children: [
                  /* @__PURE__ */ jsx(Search_default, {
                    placeholder: `Search ${mode}...`,
                    isRound: true,
                    onChangeText: setSearchQuery,
                    style: {
                      flex: 1
                    }
                  }),
                  /* @__PURE__ */ jsx(import_react_native31.View, {
                    style: {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8
                    },
                    children: /* @__PURE__ */ jsx(IconButton, {
                      size: "md",
                      variant: "tertiary",
                      icon: findAssetId("MoreVerticalIcon"),
                      disabled: !!searchQuery,
                      onPress: () => showSimpleActionSheet4({
                        key: "AddonListSortOptions",
                        header: {
                          title: "Sort Options",
                          onClose: () => hideActionSheet3("AddonListSortOptions")
                        },
                        options: Object.entries(Sort).map(([key, value]) => ({
                          label: value,
                          onPress: () => {
                            setSort(value);
                          }
                        }))
                      })
                    })
                  })
                ]
              })
            ]
          })
        }),
        /* @__PURE__ */ jsx(FlashList, {
          data: sortedAndFiltered,
          refreshing: loading,
          onRefresh: mode === "plugins" ? fetchPlugins : fetchThemes,
          estimatedItemSize: 200,
          contentContainerStyle: {
            paddingBottom: 90,
            paddingHorizontal: 5
          },
          ListHeaderComponent: mode === "plugins" ? /* @__PURE__ */ jsx(import_react_native31.View, {
            style: {
              paddingVertical: 6,
              paddingHorizontal: 8
            },
            children: /* @__PURE__ */ jsx(Card, {
              border: "strong",
              children: /* @__PURE__ */ jsx(import_react_native31.View, {
                style: {
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "row"
                },
                children: /* @__PURE__ */ jsxs(import_react_native31.View, {
                  style: {
                    gap: 6,
                    flexShrink: 1
                  },
                  children: [
                    /* @__PURE__ */ jsx(Text, {
                      variant: "heading-md/bold",
                      children: "Unproxied Plugins"
                    }),
                    /* @__PURE__ */ jsx(Text, {
                      variant: "text-sm/medium",
                      color: "text-muted",
                      children: "Plugins installed from this source have not been checked for safety, install at your own risk"
                    })
                  ]
                })
              })
            })
          }) : null,
          //@ts-ignore
          renderItem: ({ item: addon }) => /* @__PURE__ */ jsx(import_react_native31.View, {
            style: {
              paddingVertical: 6,
              paddingHorizontal: 8
            },
            children: /* @__PURE__ */ jsx(AddonCard2, {
              addon,
              isPluginMode: mode === "plugins",
              installing,
              setInstalling,
              setRefreshTick
            })
          })
        })
      ]
    });
  }
  var import_react_native31, showSimpleActionSheet4, hideActionSheet3, PLUGIN_URL2, THEME_URL, Sort;
  var init_PluginBrowser = __esm({
    "src/core/ui/settings/pages/PluginBrowser/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_common();
      import_react_native31 = __toESM(require_react_native());
      init_components();
      init_assets();
      init_safeFetch();
      init_toasts();
      init_Search();
      init_plugins();
      init_themes();
      init_common();
      init_sheets();
      init_wrappers2();
      init_alerts();
      init_components();
      init_lazy();
      init_metro();
      ({ showSimpleActionSheet: showSimpleActionSheet4 } = lazyDestructure(() => findByProps("showSimpleActionSheet")));
      ({ hideActionSheet: hideActionSheet3 } = findByProps("hideActionSheet"));
      PLUGIN_URL2 = "https://raw.githubusercontent.com/Purple-EyeZ/Plugins-List/refs/heads/main/src/plugins-data.json";
      THEME_URL = "https://raw.githubusercontent.com/kmmiio99o/theme-marketplace/refs/heads/main/themes.json";
      Sort = /* @__PURE__ */ function(Sort2) {
        Sort2["DateNewest"] = "Newest";
        Sort2["DateOldest"] = "Oldest";
        Sort2["NameAZ"] = "Name (A\u2013Z)";
        Sort2["NameZA"] = "Name (Z\u2013A)";
        Sort2["WorkingFirst"] = "Working First";
        Sort2["BrokenFirst"] = "Broken First";
        return Sort2;
      }(Sort || {});
    }
  });

  // src/core/ui/hooks/useFS.ts
  function useFileExists(path, prefix) {
    var [state, setState] = (0, import_react10.useState)(2);
    var check = () => fileExists(path, {
      prefix
    }).then((exists) => setState(exists ? 1 : 0)).catch(() => setState(3));
    var customFS = (0, import_react10.useMemo)(() => new Proxy(fs_exports, {
      get(target, p, receiver) {
        var val = Reflect.get(target, p, receiver);
        if (typeof val !== "function")
          return;
        return (...args) => {
          var promise = (check(), val(...args));
          if (promise?.constructor?.name === "Promise") {
            setState(2);
            promise.finally(check);
          }
          return promise;
        };
      }
    }), []);
    (0, import_react10.useEffect)(() => void check(), []);
    return [
      state,
      customFS
    ];
  }
  var import_react10, CheckState;
  var init_useFS = __esm({
    "src/core/ui/hooks/useFS.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_fs();
      import_react10 = __toESM(require_react());
      CheckState = /* @__PURE__ */ function(CheckState2) {
        CheckState2[CheckState2["FALSE"] = 0] = "FALSE";
        CheckState2[CheckState2["TRUE"] = 1] = "TRUE";
        CheckState2[CheckState2["LOADING"] = 2] = "LOADING";
        CheckState2[CheckState2["ERROR"] = 3] = "ERROR";
        return CheckState2;
      }({});
    }
  });

  // src/core/ui/settings/pages/Developer/AssetDisplay.tsx
  function AssetDisplay({ asset }) {
    return /* @__PURE__ */ jsx(TableRow, {
      variant: displayable.has(asset.type) ? "default" : "danger",
      label: asset.name,
      subLabel: `Index: ${asset.id} Type: ${asset.type}`,
      icon: displayable.has(asset.type) ? /* @__PURE__ */ jsx(import_react_native32.Image, {
        source: asset.id,
        style: {
          width: 32,
          height: 32
        }
      }) : /* @__PURE__ */ jsx(TableRow.Icon, {
        variant: "danger",
        source: findAssetId(asset.type in iconMap ? iconMap[asset.type] : iconMap.default)
      }),
      onPress: () => openAlert4("revenge-asset-display-details", /* @__PURE__ */ jsx(AlertModal5, {
        title: asset.name,
        content: `Index: ${asset.id}
Module ID: ${asset.moduleId}
Type: ${asset.type}`,
        extraContent: displayable.has(asset.type) ? /* @__PURE__ */ jsx(import_react_native32.Image, {
          resizeMode: "contain",
          source: asset.id,
          style: {
            flex: 1,
            width: "auto",
            height: 192
          }
        }) : /* @__PURE__ */ jsxs(Text, {
          variant: "text-sm/medium",
          color: "text-danger",
          style: {
            width: "100%",
            textAlign: "center"
          },
          children: [
            "Asset type ",
            asset.type.toUpperCase(),
            " is not supported for preview."
          ]
        }),
        actions: /* @__PURE__ */ jsxs(Stack, {
          children: [
            /* @__PURE__ */ jsx(AlertActionButton5, {
              text: "Copy asset name",
              variant: "primary",
              onPress: () => copyToClipboard(asset.name)
            }),
            /* @__PURE__ */ jsx(AlertActionButton5, {
              text: "Copy asset index",
              variant: "secondary",
              onPress: () => copyToClipboard(asset.id.toString())
            })
          ]
        })
      }))
    });
  }
  var import_react_native32, openAlert4, AlertModal5, AlertActionButton5, displayable, iconMap, copyToClipboard;
  var init_AssetDisplay = __esm({
    "src/core/ui/settings/pages/Developer/AssetDisplay.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_assets();
      init_lazy();
      init_metro();
      init_common();
      init_components();
      init_toasts();
      import_react_native32 = __toESM(require_react_native());
      ({ openAlert: openAlert4 } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
      ({ AlertModal: AlertModal5, AlertActionButton: AlertActionButton5 } = lazyDestructure(() => findByProps("AlertModal", "AlertActions")));
      displayable = /* @__PURE__ */ new Set([
        "png",
        "jpg",
        "svg"
      ]);
      iconMap = {
        jsona: "ic_file_text",
        lottie: "ic_image",
        webm: "CirclePlayIcon-primary",
        ttf: "ic_add_text",
        default: "UnknownGameIcon"
      };
      copyToClipboard = (text) => {
        clipboard.setString(text);
        showToast.showCopyToClipboard();
      };
    }
  });

  // src/core/ui/settings/pages/Developer/AssetBrowser.tsx
  function AssetBrowser() {
    var [search, setSearch] = React.useState("");
    var [showNonImages, setShowNonImages] = React.useState(false);
    var all = (0, import_react11.useMemo)(() => Array.from(iterateAssets()), []);
    var filteredData = (0, import_react11.useMemo)(() => {
      var result = all.filter((a) => a.name.includes(search) || a.id.toString() === search);
      if (!showNonImages) {
        result = result.filter((a) => displayable2.has(a.type));
      }
      return result;
    }, [
      all,
      search,
      showNonImages
    ]);
    return /* @__PURE__ */ jsx(ErrorBoundary, {
      children: /* @__PURE__ */ jsxs(import_react_native33.View, {
        style: {
          flex: 1
        },
        children: [
          /* @__PURE__ */ jsxs(import_react_native33.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              margin: 10
            },
            children: [
              /* @__PURE__ */ jsx(import_react_native33.View, {
                style: {
                  flex: 1,
                  marginRight: 10
                },
                children: /* @__PURE__ */ jsx(Search_default, {
                  onChangeText: (v2) => setSearch(v2)
                })
              }),
              /* @__PURE__ */ jsx(import_react_native33.TouchableOpacity, {
                style: {
                  padding: 12,
                  backgroundColor: showNonImages ? "#0f1013" : "#303139",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  minWidth: 44,
                  minHeight: 44
                },
                onPress: () => setShowNonImages(!showNonImages),
                children: /* @__PURE__ */ jsx(import_react_native33.Image, {
                  style: {
                    width: 20,
                    height: 20
                  },
                  source: findAssetId("ic_image")
                })
              })
            ]
          }),
          /* @__PURE__ */ jsx(import_react_native33.ScrollView, {
            children: /* @__PURE__ */ jsxs(import_react_native33.View, {
              style: {
                flex: 1,
                borderRadius: 16,
                paddingHorizontal: 12,
                overflow: "hidden",
                backgroundColor: "transparent"
              },
              children: [
                showNonImages && /* @__PURE__ */ jsx(Text, {
                  variant: "text-sm/medium",
                  color: "text-danger",
                  style: {
                    marginBottom: 16
                  },
                  children: "Some assets types cannot be displayed and will be marked in red."
                }),
                /* @__PURE__ */ jsx(import_react_native33.FlatList, {
                  data: filteredData,
                  renderItem: ({ item }) => /* @__PURE__ */ jsx(AssetDisplay, {
                    asset: item,
                    showNonImages
                  }),
                  contentContainerStyle: {
                    overflow: "hidden",
                    backgroundColor: "transparent",
                    borderRadius: 16
                  },
                  scrollEnabled: false,
                  keyExtractor: (a) => a.id.toString()
                })
              ]
            })
          })
        ]
      })
    });
  }
  var import_react11, import_react_native33, displayable2;
  var init_AssetBrowser = __esm({
    "src/core/ui/settings/pages/Developer/AssetBrowser.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_AssetDisplay();
      init_assets();
      init_components();
      init_components2();
      import_react11 = __toESM(require_react());
      import_react_native33 = __toESM(require_react_native());
      displayable2 = /* @__PURE__ */ new Set([
        "png",
        "jpg",
        "svg"
      ]);
    }
  });

  // src/core/ui/settings/pages/Developer/index.tsx
  var Developer_exports = {};
  __export(Developer_exports, {
    default: () => Developer
  });
  function Developer() {
    var [rdtFileExists, fs] = useFileExists("preloads/reactDevtools.js");
    var [isDebuggerConnected, setIsDebuggerConnected] = (0, import_react12.useState)(isConnectedToDebugger2());
    var styles = useStyles4();
    var navigation2 = NavigationNative.useNavigation();
    useProxy(settings);
    useProxy(loaderConfig);
    (0, import_react12.useEffect)(() => {
      var interval = setInterval(() => {
        setIsDebuggerConnected(isConnectedToDebugger2());
      }, 1e3);
      return () => clearInterval(interval);
    }, []);
    var handleDebuggerConnect = () => {
      if (isDebuggerConnected) {
        disconnectFromDebugger2();
        setIsDebuggerConnected(false);
      } else {
        connectToDebugger2(settings.debuggerUrl);
        setTimeout(() => setIsDebuggerConnected(isConnectedToDebugger2()), 100);
      }
    };
    return /* @__PURE__ */ jsx(ErrorBoundary, {
      children: /* @__PURE__ */ jsx(import_react_native35.ScrollView, {
        style: {
          flex: 1
        },
        contentContainerStyle: {
          paddingBottom: 38
        },
        children: /* @__PURE__ */ jsxs(Stack, {
          style: {
            paddingVertical: 24,
            paddingHorizontal: 12
          },
          spacing: 24,
          children: [
            /* @__PURE__ */ jsxs(TableRowGroup, {
              title: Strings.DEBUGGER_URL,
              children: [
                /* @__PURE__ */ jsx(TextInput, {
                  placeholder: "127.0.0.1:9090",
                  size: "md",
                  leadingIcon: () => /* @__PURE__ */ jsx(LegacyFormText, {
                    style: styles.leadingText,
                    children: "ws://"
                  }),
                  defaultValue: settings.debuggerUrl,
                  onChange: (v2) => settings.debuggerUrl = v2
                }),
                /* @__PURE__ */ jsx(Stack, {
                  style: {
                    marginTop: 4,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: "hidden"
                  },
                  children: /* @__PURE__ */ jsx(TableSwitchRow, {
                    label: Strings.AUTO_DEBUGGER,
                    subLabel: isDebuggerConnected ? "Connected" : void 0,
                    icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                      source: findAssetId("copy")
                    }),
                    value: settings.autoDebugger,
                    onValueChange: (v2) => {
                      settings.autoDebugger = v2;
                    }
                  })
                }),
                /* @__PURE__ */ jsx(TableRow, {
                  label: isDebuggerConnected ? "Disconnect from Debugger" : Strings.CONNECT_TO_DEBUG_WEBSOCKET,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId(isDebuggerConnected ? "ic_message_delete" : "copy")
                  }),
                  onPress: handleDebuggerConnect
                })
              ]
            }),
            isReactDevToolsPreloaded() && /* @__PURE__ */ jsx(Fragment, {
              children: /* @__PURE__ */ jsxs(TableRowGroup, {
                title: Strings.DEVTOOLS_URL,
                children: [
                  /* @__PURE__ */ jsx(TextInput, {
                    placeholder: "127.0.0.1:8097",
                    size: "md",
                    leadingIcon: () => /* @__PURE__ */ jsx(LegacyFormText, {
                      style: styles.leadingText,
                      children: "ws://"
                    }),
                    defaultValue: settings.devToolsUrl,
                    onChange: (v2) => settings.devToolsUrl = v2
                  }),
                  /* @__PURE__ */ jsx(Stack, {
                    style: {
                      marginTop: 4,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      overflow: "hidden"
                    },
                    children: /* @__PURE__ */ jsx(TableSwitchRow, {
                      label: Strings.AUTO_DEVTOOLS,
                      icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                        source: findAssetId("ic_badge_staff")
                      }),
                      value: settings.autoDevTools,
                      onValueChange: (v2) => {
                        settings.autoDevTools = v2;
                      }
                    })
                  }),
                  /* @__PURE__ */ jsx(TableRow, {
                    label: Strings.CONNECT_TO_REACT_DEVTOOLS,
                    icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                      source: findAssetId("ic_badge_staff")
                    }),
                    onPress: () => _async_to_generator(function* () {
                      if (!settings.devToolsUrl?.trim()) {
                        showToast("Invalid devTools URL!", findAssetId("Small"));
                        return;
                      }
                      try {
                        var devTools = globalThis[getReactDevToolsProp() || "__vendetta_rdc"];
                        if (!devTools?.connectToDevTools) {
                          showToast("Invalid devTools URL!", findAssetId("Small"));
                          return;
                        }
                        yield devTools.connectToDevTools({
                          host: settings.devToolsUrl.split(":")?.[0],
                          resolveRNStyle: import_react_native35.StyleSheet.flatten
                        });
                      } catch (error) {
                        showToast("Invalid devTools URL!", findAssetId("Small"));
                      }
                    })()
                  })
                ]
              })
            }),
            isLoaderConfigSupported() && /* @__PURE__ */ jsx(Fragment, {
              children: /* @__PURE__ */ jsxs(TableRowGroup, {
                title: "Loader config",
                children: [
                  /* @__PURE__ */ jsx(TableSwitchRow, {
                    label: Strings.LOAD_FROM_CUSTOM_URL,
                    subLabel: Strings.LOAD_FROM_CUSTOM_URL_DEC,
                    icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                      source: findAssetId("copy")
                    }),
                    value: loaderConfig.customLoadUrl.enabled,
                    onValueChange: (v2) => {
                      loaderConfig.customLoadUrl.enabled = v2;
                    }
                  }),
                  loaderConfig.customLoadUrl.enabled && /* @__PURE__ */ jsx(TableRow, {
                    label: /* @__PURE__ */ jsx(TextInput, {
                      defaultValue: loaderConfig.customLoadUrl.url,
                      size: "md",
                      onChange: (v2) => loaderConfig.customLoadUrl.url = v2,
                      placeholder: "http://localhost:4040/kettu.js",
                      label: Strings.PUPU_URL
                    })
                  }),
                  isReactDevToolsPreloaded() && isVendettaLoader() && /* @__PURE__ */ jsx(TableSwitchRow, {
                    label: Strings.LOAD_REACT_DEVTOOLS,
                    subLabel: `${Strings.VERSION}: ${getReactDevToolsVersion()}`,
                    icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                      source: findAssetId("ic_badge_staff")
                    }),
                    value: loaderConfig.loadReactDevTools,
                    onValueChange: (v2) => {
                      loaderConfig.loadReactDevTools = v2;
                    }
                  })
                ]
              })
            }),
            /* @__PURE__ */ jsxs(TableRowGroup, {
              title: "Other",
              children: [
                /* @__PURE__ */ jsx(TableRow, {
                  label: Strings.CLEAR_BUNDLE,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId("TrashIcon")
                  }),
                  onPress: () => {
                    openAlert5("pupu-clear-bundle-reload-confirmation", /* @__PURE__ */ jsx(AlertModal6, {
                      title: Strings.MODAL_RELOAD_REQUIRED,
                      content: Strings.MODAL_RELOAD_REQUIRED_DESC,
                      actions: /* @__PURE__ */ jsxs(Stack, {
                        children: [
                          /* @__PURE__ */ jsx(AlertActionButton6, {
                            text: Strings.RELOAD,
                            variant: "destructive",
                            onPress: () => import_react_native34.NativeModules.BundleUpdaterManager.reload()
                          }),
                          /* @__PURE__ */ jsx(AlertActionButton6, {
                            text: Strings.CANCEL,
                            variant: "secondary"
                          })
                        ]
                      })
                    }));
                  }
                }),
                /* @__PURE__ */ jsx(TableRow, {
                  arrow: true,
                  label: Strings.ASSET_BROWSER,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId("ic_image")
                  }),
                  trailing: TableRow.Arrow,
                  onPress: () => navigation2.push("PUPU_CUSTOM_PAGE", {
                    title: Strings.ASSET_BROWSER,
                    render: AssetBrowser
                  })
                }),
                /* @__PURE__ */ jsx(TableRow, {
                  arrow: true,
                  label: Strings.ERROR_BOUNDARY_TOOLS_LABEL,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId("ic_warning_24px")
                  }),
                  onPress: () => showSimpleActionSheet5({
                    key: "ErrorBoundaryTools",
                    header: {
                      title: "Which ErrorBoundary do you want to trip?",
                      icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                        style: {
                          marginRight: 8
                        },
                        source: findAssetId("ic_warning_24px")
                      }),
                      onClose: () => hideActionSheet4()
                    },
                    options: [
                      // @ts-expect-error
                      // Of course, to trigger an error, we need to do something incorrectly. The below will do!
                      {
                        label: Strings.PUPU,
                        onPress: () => navigation2.push("PUPU_CUSTOM_PAGE", {
                          render: () => /* @__PURE__ */ jsx("undefined", {})
                        })
                      },
                      {
                        label: "Discord",
                        isDestructive: true,
                        onPress: () => navigation2.push("PUPU_CUSTOM_PAGE", {
                          noErrorBoundary: true
                        })
                      }
                    ]
                  })
                }),
                /* @__PURE__ */ jsx(TableRow, {
                  label: Strings.INSTALL_REACT_DEVTOOLS,
                  subLabel: Strings.RESTART_REQUIRED_TO_TAKE_EFFECT,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId("DownloadIcon")
                  }),
                  trailing: /* @__PURE__ */ jsx(Button, {
                    size: "sm",
                    loading: rdtFileExists === CheckState.LOADING,
                    disabled: rdtFileExists === CheckState.LOADING,
                    variant: rdtFileExists === CheckState.TRUE ? "secondary" : "primary",
                    text: rdtFileExists === CheckState.TRUE ? Strings.UNINSTALL : Strings.INSTALL,
                    onPress: () => _async_to_generator(function* () {
                      if (rdtFileExists === CheckState.FALSE) {
                        fs.downloadFile(RDT_EMBED_LINK, "preloads/reactDevtools.js").then(() => showToast("Successfully installed! A reload is required", findAssetId("DownloadIcon")));
                      } else if (rdtFileExists === CheckState.TRUE) {
                        fs.removeFile("preloads/reactDevtools.js");
                      }
                    })(),
                    icon: findAssetId(rdtFileExists === CheckState.TRUE ? "TrashIcon" : "DownloadIcon"),
                    style: {
                      marginLeft: 8
                    }
                  })
                }),
                /* @__PURE__ */ jsx(TableSwitchRow, {
                  label: Strings.ENABLE_EVAL_COMMAND,
                  subLabel: Strings.ENABLE_EVAL_COMMAND_DESC,
                  icon: /* @__PURE__ */ jsx(TableRow.Icon, {
                    source: findAssetId("PencilIcon")
                  }),
                  value: !!settings.enableEvalCommand,
                  onValueChange: (v2) => {
                    settings.enableEvalCommand = v2;
                  }
                })
              ]
            })
          ]
        })
      })
    });
  }
  var import_react_native34, import_react_native35, import_react12, hideActionSheet4, showSimpleActionSheet5, openAlert5, AlertModal6, AlertActionButton6, RDT_EMBED_LINK, useStyles4;
  var init_Developer = __esm({
    "src/core/ui/settings/pages/Developer/index.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_async_to_generator();
      init_jsxRuntime();
      init_i18n();
      init_useFS();
      init_AssetBrowser();
      init_storage();
      init_assets();
      init_debug();
      init_loader();
      init_settings();
      init_lazy();
      init_common();
      init_components();
      init_wrappers();
      init_color();
      init_components2();
      init_styles();
      import_react_native34 = __toESM(require_react_native());
      import_react_native35 = __toESM(require_react_native());
      init_toasts();
      import_react12 = __toESM(require_react());
      ({ hideActionSheet: hideActionSheet4 } = lazyDestructure(() => findByProps("openLazy", "hideActionSheet")));
      ({ showSimpleActionSheet: showSimpleActionSheet5 } = lazyDestructure(() => findByProps("showSimpleActionSheet")));
      ({ openAlert: openAlert5 } = lazyDestructure(() => findByProps("openAlert", "dismissAlert")));
      ({ AlertModal: AlertModal6, AlertActionButton: AlertActionButton6 } = lazyDestructure(() => findByProps("AlertModal", "AlertActions")));
      RDT_EMBED_LINK = "https://codeberg.org/raincord/raindevtools/raw/branch/dev/dist/index.bundle";
      useStyles4 = createStyles({
        leadingText: {
          ...TextStyleSheet["heading-md/semibold"],
          color: semanticColors.TEXT_MUTED,
          marginRight: -4
        }
      });
    }
  });

  // src/core/ui/settings/index.ts
  function initSettings() {
    registerSection({
      name: "CloudCord",
      items: [
        {
          key: "KETTU",
          title: () => Strings.PUPU,
          icon: {
            uri: "https://raw.githubusercontent.com/xohus/cloudcord/main/cloudcord-favicon.png"
          },
          render: () => Promise.resolve().then(() => (init_General(), General_exports)),
          useTrailing: () => `(${"v0.1"})`
        },
        {
          key: "FAKE_PROFILE",
          title: () => "FakeProfile",
          icon: {
            uri: fakeprofile_default
          },
          render: () => Promise.resolve().then(() => (init_FakeProfile(), FakeProfile_exports))
        },
        {
          key: "CLOUD_SYNC",
          title: () => "Cloud Sync",
          icon: {
            uri: "https://images.weserv.nl/?url=raw.githubusercontent.com/nexpid/CloudSync/main/assets/icon-bright.svg&w=128&h=128&output=png"
          },
          render: () => Promise.resolve().then(() => (init_CloudSync(), CloudSync_exports))
        },
        {
          key: "BUNNY_PLUGINS",
          title: () => Strings.PLUGINS,
          icon: findAssetId("AppsIcon"),
          render: () => Promise.resolve().then(() => (init_Plugins(), Plugins_exports))
        },
        {
          key: "BUNNY_THEMES",
          title: () => Strings.THEMES,
          icon: findAssetId("PaintPaletteIcon"),
          render: () => Promise.resolve().then(() => (init_Themes(), Themes_exports)),
          usePredicate: () => isThemeSupported()
        },
        {
          key: "BUNNY_FONTS",
          title: () => Strings.FONTS,
          icon: findAssetId("LettersIcon"),
          render: () => Promise.resolve().then(() => (init_Fonts(), Fonts_exports)),
          usePredicate: () => isFontSupported()
        },
        {
          key: "KETTU_BROWSER",
          title: () => Strings.BROWSER,
          icon: findAssetId("ChannelListMagnifyingGlassIcon"),
          render: () => Promise.resolve().then(() => (init_PluginBrowser(), PluginBrowser_exports))
        },
        {
          key: "BUNNY_DEVELOPER",
          title: () => Strings.DEVELOPER,
          icon: findAssetId("WrenchIcon"),
          render: () => Promise.resolve().then(() => (init_Developer(), Developer_exports)),
          usePredicate: () => useProxy(settings).developerSettings ?? false
        }
      ]
    });
    registerSection({
      name: "Bunny",
      items: []
    });
    registerSection({
      name: "Revenge",
      items: []
    });
    registerSection({
      name: "Vendetta",
      items: []
    });
  }
  var init_settings3 = __esm({
    "src/core/ui/settings/index.ts"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_fakeprofile();
      init_kettu();
      init_i18n();
      init_storage();
      init_assets();
      init_loader();
      init_settings();
      init_settings2();
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
  var import_react13, import_react_native36, makeIcon, PatchedFormRow, PatchedFormSwitchRow, PatchedFormSection, PatchedForms, initVendettaObject;
  var init_api3 = __esm({
    "src/core/vendetta/api.tsx"() {
      "use strict";
      init_asyncIteratorSymbol();
      init_promiseAllSettled();
      init_jsxRuntime();
      init_alerts2();
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
      import_react13 = __toESM(require_react());
      import_react_native36 = __toESM(require_react_native());
      init_plugins();
      makeIcon = (leading) => leading;
      PatchedFormRow = (props) => /* @__PURE__ */ (0, import_react13.createElement)(TableRow, {
        label: props.label,
        subLabel: props.subLabel,
        icon: makeIcon(props.leading),
        trailing: props.trailing,
        onPress: props.onPress,
        disabled: props.disabled,
        arrow: props.arrow
      });
      PatchedFormRow.Icon = Forms.FormRow?.Icon ?? TableRow.Icon;
      PatchedFormRow.Arrow = Forms.FormRow?.Arrow ?? TableRow.Arrow;
      PatchedFormSwitchRow = (props) => /* @__PURE__ */ (0, import_react13.createElement)(TableSwitchRow, {
        label: props.label,
        subLabel: props.subLabel,
        icon: makeIcon(props.leading),
        value: !!props.value,
        onValueChange: props.onValueChange,
        disabled: props.disabled
      });
      PatchedFormSection = (props) => /* @__PURE__ */ (0, import_react13.createElement)(TableRowGroup, {
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
                      (0, import_react13.useEffect)(() => console.warn("Discord has removed 'ActionSheetContentContainer', please move into something else. This has been temporarily replaced with View"), []);
                      return /* @__PURE__ */ (0, import_react13.createElement)(import_react_native36.View, null, children);
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

  // src/lib/ui/index.ts
  var ui_exports = {};
  __export(ui_exports, {
    alerts: () => alerts_exports,
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
      init_alerts();
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
      init_patchErrorBoundary();
      init_fixes();
      init_i18n();
      init_settings3();
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
      init_settings2();
      init_debug();
      init_lib();
      src_default = () => _async_to_generator(function* () {
        yield Promise.all([
          initThemes(),
          injectFluxInterceptor(),
          patchSettings(),
          patchLogHook(),
          patchCommands(),
          patchJsx(),
          initVendettaObject(),
          initFetchI18nStrings(),
          initSettings(),
          fixes_default(),
          patchErrorBoundary(),
          updatePlugins(),
          updateFonts(),
          initPlugins(),
          VdPluginManager.initPlugins()
        ]).then(
          // Push them all to unloader
          (u) => u.forEach((f) => f && unload.push(f))
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
          `CloudCord: ${"v0.1"}`,
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
