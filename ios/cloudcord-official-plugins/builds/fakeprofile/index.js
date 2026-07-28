(function(exports, metro, common, lazy, api, plugin) {
  "use strict";

  const React = common.React;
  const RN = common.ReactNative;
  const storage = plugin.storage;

  storage.enabled ??= false;
  storage.displayName ??= "Badge Collector";
  storage.username ??= "badgecollector";
  storage.nitroEnabled ??= true;
  storage.selectedFlags ??= {};
  storage.selectedExtras ??= {};
  storage.hiddenFlags ??= {};
  storage.hiddenExtras ??= {};
  storage.replaceMode ??= true;

  const FLAG_BADGES = [
    ["hypesquad", "HypeSquad Events", 4],
    ["bug1", "Bug Hunter 1", 8],
    ["bravery", "HypeSquad Bravery", 64],
    ["brilliance", "HypeSquad Brilliance", 128],
    ["balance", "HypeSquad Balance", 256],
    ["early", "Early Supporter", 512],
    ["bug2", "Bug Hunter 2", 16384],
    ["vdev", "Verified Developer", 131072],
    ["mod", "Former Moderator", 262144],
    ["active", "Active Developer", 4194304]
  ];

  const EXTRA_BADGES = [
    ["hypesquad_icon", "HypeSquad Events", "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png"],
    ["bug1_icon", "Bug Hunter", "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png"],
    ["bravery_icon", "HypeSquad Bravery", "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png"],
    ["brilliance_icon", "HypeSquad Brilliance", "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png"],
    ["balance_icon", "HypeSquad Balance", "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png"],
    ["early_icon", "Early Supporter", "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png"],
    ["bug2_icon", "Bug Hunter 2", "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png"],
    ["vdev_icon", "Verified Developer", "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png"],
    ["mod_icon", "Former Moderator", "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png"],
    ["active_icon", "Active Developer", "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png"],
    ["old_username", "Originally Known As", "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png"],
    ["quest", "Completed a Quest", "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png"],
    ["orbs", "Orbs Apprentice", "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png"],
    ["nitro_0", "Nitro Subscriber", "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"],
    ["nitro_1", "Nitro 1 Month", "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png"],
    ["nitro_2", "Nitro 2 Months", "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png"],
    ["nitro_3", "Nitro 3 Months", "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png"],
    ["nitro_6", "Nitro 6 Months", "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png"],
    ["nitro_12", "Nitro 1 Year", "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png"],
    ["nitro_24", "Nitro 2 Years", "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png"],
    ["nitro_36", "Nitro 3 Years", "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png"],
    ["nitro_72", "Nitro 6 Years", "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png"],
    ["boost_1", "Boost 1 Month", "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png"],
    ["boost_2", "Boost 2 Months", "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png"],
    ["boost_3", "Boost 3 Months", "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png"],
    ["boost_6", "Boost 6 Months", "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png"],
    ["boost_9", "Boost 9 Months", "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png"],
    ["boost_12", "Boost 1 Year", "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png"],
    ["boost_15", "Boost 15 Months", "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png"],
    ["boost_18", "Boost 18 Months", "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png"],
    ["boost_24", "Boost 2 Years", "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png"]
  ];

  let unpatches = [];
  let myId = null;
  let userCache = new WeakMap();
  let profileCache = new WeakMap();
  const debugState = {
    userStore: false,
    profileStore: false,
    avatarResolver: false,
    bannerResolver: false,
    last: "Ready"
  };

  function clearFakeCache() {
    userCache = new WeakMap();
    profileCache = new WeakMap();
  }

  function safeStore(name) {
    try { return metro.findByStoreName?.(name) || metro.findByStoreNameLazy?.(name); }
    catch { return null; }
  }

  function oldDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  }

  function mediaUri(key) {
    return String(storage[key]?.uri || "");
  }

  function saveMedia(key, asset) {
    const uri = asset?.fileCopyUri || asset?.uri;
    const name = String(asset?.fileName || asset?.name || "Selected image");
    const type = String(asset?.type || "").toLowerCase();

    if (!uri) throw new Error("No image was selected.");
    if (type && !type.startsWith("image/")) throw new Error("Choose an image or GIF.");

    storage[key] = { uri, name, type };
    debugState.last = `${key === "avatarMedia" ? "Profile picture" : "Banner"} selected: ${name}`;
    clearFakeCache();
    refreshDiscord();
  }

  async function pickFile(key) {
    let picker;
    try { picker = metro.findByProps?.("pickSingle", "isCancel"); } catch {}
    if (!picker?.pickSingle) throw new Error("The system file picker is unavailable.");

    try {
      const asset = await picker.pickSingle({
        type: picker.types?.images || "image/*",
        mode: "import",
        copyTo: "documentDirectory"
      });
      if (!asset) return false;
      saveMedia(key, asset);
      return true;
    } catch (error) {
      if (picker.isCancel?.(error)) return false;
      throw error;
    }
  }

  async function pickPhoto(key) {
    let picker;
    try { picker = metro.findByProps?.("launchImageLibrary"); } catch {}
    if (!picker?.launchImageLibrary) return pickFile(key);

    const result = await new Promise((resolve, reject) => {
      let returned;
      try {
        returned = picker.launchImageLibrary({
          mediaType: "photo",
          selectionLimit: 1,
          includeBase64: false,
          assetRepresentationMode: "current"
        }, resolve);
      } catch (error) {
        reject(error);
        return;
      }
      if (returned?.then) returned.then(resolve, reject);
    });
    if (result?.didCancel) return false;
    if (result?.errorCode) throw new Error(result.errorMessage || "The photo picker failed.");

    const asset = result?.assets?.[0];
    if (!asset) return false;
    saveMedia(key, asset);
    return true;
  }

  function selectedFlagMask() {
    let mask = 0;
    const selected = storage.selectedFlags || {};
    for (const [id, _label, flag] of FLAG_BADGES) if (selected[id]) mask |= flag;
    return mask;
  }

  function hiddenFlagMask() {
    let mask = 0;
    const hidden = storage.hiddenFlags || {};
    for (const [id, _label, flag] of FLAG_BADGES) if (hidden[id]) mask |= flag;
    return mask;
  }

  function withBadges(value) {
    const original = storage.replaceMode ? 0 : (Number(value || 0) & ~hiddenFlagMask());
    return original | selectedFlagMask();
  }

  function extraBadgeObjects(existing) {
    const hidden = storage.hiddenExtras || {};
    const selected = storage.selectedExtras || {};
    const out = storage.replaceMode ? [] : (Array.isArray(existing)
      ? existing.filter(b => {
          const badgeId = String(b?.id || b?.key || "").toLowerCase();
          const badgeDesc = String(b?.description || b?.label || "").toLowerCase();

          for (const hideId of Object.keys(hidden)) {
            if (!hidden[hideId]) continue;
            const h = hideId.toLowerCase();
            if (badgeId.includes(h) || badgeDesc.includes(h)) return false;
          }

          return true;
        })
      : []);

    for (const [id, description, icon] of EXTRA_BADGES) {
      if (selected[id] && !out.some(x => x?.id === id)) {
        out.push({ id, description, icon, iconSrc: icon });
      }
    }

    return out;
  }

  function setOwnValue(obj, key, value) {
    try {
      const oldDesc = Object.getOwnPropertyDescriptor(obj, key);
      const enumerable = oldDesc ? !!oldDesc.enumerable : true;

      if (!oldDesc || oldDesc.configurable) {
        Object.defineProperty(obj, key, {
          value,
          writable: true,
          enumerable,
          configurable: true
        });
        return;
      }

      if (oldDesc.writable) {
        obj[key] = value;
      }
    } catch {
      try { obj[key] = value; } catch {}
    }
  }

  function applyFake(obj, original) {
    if (!obj || !storage.enabled) return obj;

    const display = storage.displayName || original?.globalName || original?.displayName || original?.username || "Badge Collector";
    const username = storage.username || original?.username || "badgecollector";
    const flags = withBadges(original?.publicFlags ?? original?.flags ?? obj.publicFlags ?? obj.flags);

    setOwnValue(obj, "username", username);
    setOwnValue(obj, "globalName", display);
    setOwnValue(obj, "displayName", display);
    setOwnValue(obj, "publicFlags", flags);
    setOwnValue(obj, "flags", flags);
    setOwnValue(obj, "badges", extraBadgeObjects(original?.badges ?? obj.badges));
    setOwnValue(obj, "profileBadges", extraBadgeObjects(original?.profileBadges ?? obj.profileBadges));

    const avatar = mediaUri("avatarMedia");
    const banner = mediaUri("bannerMedia");

    if (avatar) {
      setOwnValue(obj, "avatarURL", avatar);
      setOwnValue(obj, "avatarUrl", avatar);
      setOwnValue(obj, "getAvatarURL", () => avatar);
    }

    if (banner) {
      setOwnValue(obj, "banner", banner);
      setOwnValue(obj, "bannerURL", banner);
      setOwnValue(obj, "bannerUrl", banner);
      setOwnValue(obj, "getBannerURL", () => banner);
    }

    if (storage.nitroEnabled) {
      setOwnValue(obj, "premiumType", 2);
      setOwnValue(obj, "premiumSince", oldDate(72));
      setOwnValue(obj, "premiumGuildSince", oldDate(24));
    }

    try { obj.hasFlag = flag => !!(flags & flag); } catch {}

    return obj;
  }

  function cloneWithDescriptors(original) {
    try {
      const clone = Object.create(Object.getPrototypeOf(original));

      for (const key of Reflect.ownKeys(original)) {
        try {
          const desc = Object.getOwnPropertyDescriptor(original, key);
          if (desc) Object.defineProperty(clone, key, desc);
        } catch {}
      }

      return clone;
    } catch {
      try { return { ...original }; }
      catch { return original; }
    }
  }

  function cloneObject(original, type) {
    if (!original || !storage.enabled) return original;

    const cache = type === "profile" ? profileCache : userCache;

    try {
      const cached = cache.get(original);
      if (cached) return cached;
    } catch {}

    const fake = applyFake(cloneWithDescriptors(original), original);

    try { cache.set(original, fake); } catch {}

    return fake;
  }

  function cloneUser(user) {
    if (!user || !storage.enabled) return user;

    try {
      if (myId && user.id !== myId) return user;
    } catch {}

    return cloneObject(user, "user");
  }

  function cloneProfile(profile, userId) {
    if (!profile || !storage.enabled) return profile;

    try {
      if (myId && userId && userId !== myId) return profile;
    } catch {}

    return cloneObject(profile, "profile");
  }

  function patchMediaResolvers() {
    const patch = (module, method, key) => {
      if (!module?.[method]) return;

      try {
        unpatches.push(api.patcher.instead(method, module, (args, original) => {
          const uri = mediaUri(key);
          if (!storage.enabled || !uri) return original(...args);

          const subject = args?.[0];
          const subjectId = typeof subject === "string" ? subject : subject?.id;
          if (myId && subjectId && subjectId !== myId) return original(...args);

          return uri;
        }));
      } catch {}
    };

    const avatarModule = metro.findByProps?.("getUserAvatarURL") || metro.findByProps?.("getAvatarURL", "getDefaultAvatarURL");
    const bannerModule = metro.findByProps?.("getUserBannerURL") || metro.findByProps?.("getBannerURL");
    debugState.avatarResolver = !!avatarModule;
    debugState.bannerResolver = !!bannerModule;

    patch(avatarModule, "getUserAvatarURL", "avatarMedia");
    patch(avatarModule, "getAvatarURL", "avatarMedia");
    patch(bannerModule, "getUserBannerURL", "bannerMedia");
    patch(bannerModule, "getBannerURL", "bannerMedia");
  }

  function patchStores() {
    const UserStore = safeStore("UserStore") || metro.findByProps?.("getCurrentUser", "getUser");
    debugState.userStore = !!UserStore;

    if (UserStore) {
      try { myId = UserStore.getCurrentUser?.()?.id || myId; } catch {}

      try {
        if (UserStore.getCurrentUser) {
          unpatches.push(api.patcher.instead("getCurrentUser", UserStore, (a, o) => {
            const user = o(...a);
            try { myId = user?.id || myId; } catch {}
            return cloneUser(user);
          }));
        }
      } catch {}

      try {
        if (UserStore.getUser) {
          unpatches.push(api.patcher.instead("getUser", UserStore, (a, o) => {
            const wantedId = a?.[0];

            if (wantedId && myId && wantedId !== myId) return o(...a);
            if (wantedId && !myId) return o(...a);

            return cloneUser(o(...a));
          }));
        }
      } catch {}
    }

    const ProfileStore = safeStore("UserProfileStore") || metro.findByProps?.("getUserProfile", "getGuildMemberProfile");
    debugState.profileStore = !!ProfileStore;

    if (ProfileStore) {
      try {
        if (ProfileStore.getUserProfile) {
          unpatches.push(api.patcher.instead("getUserProfile", ProfileStore, (a, o) => {
            const userId = a?.[0];

            if (userId && myId && userId !== myId) return o(...a);
            if (userId && !myId) return o(...a);

            return cloneProfile(o(...a), userId);
          }));
        }
      } catch {}

      try {
        if (ProfileStore.getGuildMemberProfile) {
          unpatches.push(api.patcher.instead("getGuildMemberProfile", ProfileStore, (a, o) => {
            const userId = a?.[0];

            if (userId && myId && userId !== myId) return o(...a);
            if (userId && !myId) return o(...a);

            return cloneProfile(o(...a), userId);
          }));
        }
      } catch {}
    }
  }

  function refreshDiscord() {
    clearFakeCache();

    try { (safeStore("UserStore") || metro.findByProps?.("getCurrentUser", "getUser"))?.emitChange?.(); } catch {}
    try { (safeStore("UserProfileStore") || metro.findByProps?.("getUserProfile", "getGuildMemberProfile"))?.emitChange?.(); } catch {}

    try {
      const Dispatcher = metro.findByProps?.("dispatch", "subscribe");
      Dispatcher?.dispatch?.({ type: "CURRENT_USER_UPDATE" });
      if (myId) Dispatcher?.dispatch?.({ type: "USER_PROFILE_UPDATE", userId: myId });
    } catch {}
  }

  function Settings() {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    const set = (key, value) => {
      storage[key] = value;
      clearFakeCache();
      forceUpdate();
    };

    const apply = () => {
      clearFakeCache();
      forceUpdate();
      refreshDiscord();
    };

    const Toggle = ({ label, sub, value, onPress }) => React.createElement(RN.Pressable, {
      onPress,
      style: { backgroundColor: value ? "#2f7d46" : "#2b2b2b", padding: 12, borderRadius: 10, marginBottom: 8 }
    },
      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 15, fontWeight: "800" } }, value ? `${label}: ON` : `${label}: OFF`),
      sub ? React.createElement(RN.Text, { style: { color: "#aaa", marginTop: 3, fontSize: 12 } }, sub) : null
    );

    const Field = ({ label, keyName, placeholder }) => React.createElement(RN.View, { style: { marginBottom: 14 } },
      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 8 } }, label),
      React.createElement(RN.TextInput, {
        defaultValue: String(storage[keyName] ?? ""),
        placeholder,
        placeholderTextColor: "#777",
        onChangeText: text => {
          storage[keyName] = text;
          clearFakeCache();
        },
        autoCorrect: false,
        autoCapitalize: "none",
        editable: true,
        style: { color: "#fff", backgroundColor: "#1f1f1f", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333" }
      })
    );

    const MediaField = ({ label, keyName, banner }) => {
      const uri = mediaUri(keyName);
      const choose = async picker => {
        try {
          if (await picker(keyName)) forceUpdate();
        } catch (error) {
          debugState.last = error?.message || "Could not open the picker.";
          forceUpdate();
          try { RN.Alert.alert("FakeProfile", debugState.last); } catch {}
        }
      };

      return React.createElement(RN.View, { style: { marginBottom: 14 } },
        React.createElement(RN.Text, { style: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 8 } }, label),
        React.createElement(RN.View, { style: { flexDirection: "row" } },
          React.createElement(RN.Pressable, {
            onPress: () => choose(pickPhoto),
            style: { flex: 1, backgroundColor: "#5865f2", padding: 11, borderRadius: 8, marginRight: 6 }
          }, React.createElement(RN.Text, { style: { color: "#fff", textAlign: "center", fontWeight: "800" } }, "Choose picture")),
          React.createElement(RN.Pressable, {
            onPress: () => choose(pickFile),
            style: { flex: 1, backgroundColor: "#35373c", padding: 11, borderRadius: 8, marginLeft: 6 }
          }, React.createElement(RN.Text, { style: { color: "#fff", textAlign: "center", fontWeight: "800" } }, "Choose file"))
        ),
        uri ? React.createElement(RN.View, { style: { marginTop: 9, backgroundColor: "#1f1f1f", borderRadius: 8, overflow: "hidden" } },
          React.createElement(RN.Image, {
            source: { uri },
            resizeMode: "cover",
            style: banner
              ? { width: "100%", height: 110, backgroundColor: "#111" }
              : { width: 88, height: 88, borderRadius: 44, alignSelf: "center", marginVertical: 10, backgroundColor: "#111" }
          }),
          React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", padding: 9 } },
            React.createElement(RN.Text, { numberOfLines: 1, style: { color: "#ddd", flex: 1, fontSize: 12 } }, storage[keyName]?.name || "Selected image"),
            React.createElement(RN.Pressable, {
              onPress: () => {
                storage[keyName] = null;
                clearFakeCache();
                forceUpdate();
                refreshDiscord();
              },
              style: { backgroundColor: "#4a2024", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }
            }, React.createElement(RN.Text, { style: { color: "#ff7b84", fontWeight: "800", fontSize: 12 } }, "Clear"))
          )
        ) : null
      );
    };

    const PreviewCard = () => {
      const avatar = mediaUri("avatarMedia");
      const banner = mediaUri("bannerMedia");
      const display = storage.displayName || "Badge Collector";
      const username = storage.username || "badgecollector";

      return React.createElement(RN.View, { style: { backgroundColor: "#1f2023", borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "#34363c" } },
        banner
          ? React.createElement(RN.Image, { source: { uri: banner }, resizeMode: "cover", style: { width: "100%", height: 112, backgroundColor: "#111" } })
          : React.createElement(RN.View, { style: { height: 112, backgroundColor: "#5865f2" } }),
        React.createElement(RN.View, { style: { paddingHorizontal: 16, paddingBottom: 16 } },
          avatar
            ? React.createElement(RN.Image, { source: { uri: avatar }, style: { width: 78, height: 78, borderRadius: 39, marginTop: -39, borderWidth: 5, borderColor: "#1f2023", backgroundColor: "#111" } })
            : React.createElement(RN.View, { style: { width: 78, height: 78, borderRadius: 39, marginTop: -39, borderWidth: 5, borderColor: "#1f2023", backgroundColor: "#35373c", alignItems: "center", justifyContent: "center" } },
                React.createElement(RN.Text, { style: { color: "#fff", fontSize: 28, fontWeight: "900" } }, display.slice(0, 1).toUpperCase())
              ),
          React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", marginTop: 8 } },
            React.createElement(RN.View, { style: { flex: 1 } },
              React.createElement(RN.Text, { style: { color: "#fff", fontSize: 19, fontWeight: "900" } }, display),
              React.createElement(RN.Text, { style: { color: "#aaa", fontSize: 13, marginTop: 2 } }, `@${username}`)
            ),
            React.createElement(RN.View, { style: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: storage.enabled ? "#285c38" : "#3b3d44" } },
              React.createElement(RN.Text, { style: { color: "#fff", fontSize: 11, fontWeight: "800" } }, storage.enabled ? "PREVIEW ON" : "PREVIEW OFF")
            )
          ),
          React.createElement(RN.Text, { style: { color: "#8e9297", fontSize: 12, marginTop: 10 } }, "Only you can see these preview changes on this device.")
        )
      );
    };

    const DiagnosticsCard = () => React.createElement(RN.View, { style: { backgroundColor: "#1f2023", borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: "#34363c" } },
      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 8 } }, "Diagnostics"),
      React.createElement(RN.Text, { style: { color: "#bbb", fontSize: 12, lineHeight: 18 } }, `Runtime patches: ${unpatches.length}`),
      React.createElement(RN.Text, { style: { color: "#bbb", fontSize: 12, lineHeight: 18 } }, `User store: ${debugState.userStore ? "Found" : "Missing"}`),
      React.createElement(RN.Text, { style: { color: "#bbb", fontSize: 12, lineHeight: 18 } }, `Profile store: ${debugState.profileStore ? "Found" : "Missing"}`),
      React.createElement(RN.Text, { style: { color: "#bbb", fontSize: 12, lineHeight: 18 } }, `Avatar resolver: ${debugState.avatarResolver ? "Found" : "Missing"}`),
      React.createElement(RN.Text, { style: { color: "#bbb", fontSize: 12, lineHeight: 18 } }, `Banner resolver: ${debugState.bannerResolver ? "Found" : "Missing"}`),
      React.createElement(RN.Text, { style: { color: "#8e9297", fontSize: 12, marginTop: 7 } }, debugState.last),
      React.createElement(RN.Pressable, {
        onPress: () => {
          debugState.last = `Preview check passed at ${new Date().toLocaleTimeString()}`;
          apply();
        },
        style: { backgroundColor: "#35373c", padding: 10, borderRadius: 8, marginTop: 10 }
      }, React.createElement(RN.Text, { style: { color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 12 } }, "Run preview check"))
    );

    const toggleFlag = id => {
      storage.selectedFlags = { ...(storage.selectedFlags || {}), [id]: !storage.selectedFlags?.[id] };
      clearFakeCache();
      forceUpdate();
      refreshDiscord();
    };

    const toggleExtra = id => {
      storage.selectedExtras = { ...(storage.selectedExtras || {}), [id]: !storage.selectedExtras?.[id] };
      clearFakeCache();
      forceUpdate();
      refreshDiscord();
    };

    const toggleHiddenFlag = id => {
      storage.hiddenFlags = { ...(storage.hiddenFlags || {}), [id]: !storage.hiddenFlags?.[id] };
      clearFakeCache();
      forceUpdate();
      refreshDiscord();
    };

    const toggleHiddenExtra = id => {
      storage.hiddenExtras = { ...(storage.hiddenExtras || {}), [id]: !storage.hiddenExtras?.[id] };
      clearFakeCache();
      forceUpdate();
      refreshDiscord();
    };

    return React.createElement(RN.ScrollView, { style: { flex: 1 }, contentContainerStyle: { padding: 16 } },
      React.createElement(PreviewCard),
      React.createElement(Toggle, { label: "Enabled", sub: "Local-only changes", value: !!storage.enabled, onPress: () => { set("enabled", !storage.enabled); refreshDiscord(); } }),
      React.createElement(Toggle, { label: "Replace Mode / Hide Owned", sub: "ON = hides all real owned badges and only shows selected badges", value: !!storage.replaceMode, onPress: () => { set("replaceMode", !storage.replaceMode); refreshDiscord(); } }),
      React.createElement(Toggle, { label: "Nitro / Boost Dates", sub: "72-month Nitro + 24-month boost", value: !!storage.nitroEnabled, onPress: () => { set("nitroEnabled", !storage.nitroEnabled); refreshDiscord(); } }),
      React.createElement(Field, { label: "Display name", keyName: "displayName", placeholder: "Badge Collector" }),
      React.createElement(Field, { label: "Username", keyName: "username", placeholder: "badgecollector" }),
      React.createElement(MediaField, { label: "Profile picture", keyName: "avatarMedia" }),
      React.createElement(MediaField, { label: "Profile banner", keyName: "bannerMedia", banner: true }),
      React.createElement(RN.Pressable, { onPress: () => { debugState.last = "Preview refreshed"; apply(); }, style: { backgroundColor: "#5865f2", padding: 13, borderRadius: 10, marginBottom: 16 } },
        React.createElement(RN.Text, { style: { color: "#fff", textAlign: "center", fontWeight: "800" } }, "Apply preview")
      ),
      React.createElement(DiagnosticsCard),

      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 8 } }, "Add Public Badge Flags"),
      ...FLAG_BADGES.map(([id, label]) => React.createElement(Toggle, { key: "add-flag-" + id, label, value: !!storage.selectedFlags?.[id], onPress: () => toggleFlag(id) })),

      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 14, marginBottom: 8 } }, "Add Nitro / Boost / Extra Icons"),
      ...EXTRA_BADGES.map(([id, label]) => React.createElement(Toggle, { key: "add-extra-" + id, label, value: !!storage.selectedExtras?.[id], onPress: () => toggleExtra(id) })),

      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 14, marginBottom: 8 } }, "Remove Owned Public Badges"),
      ...FLAG_BADGES.map(([id, label]) => React.createElement(Toggle, { key: "hide-flag-" + id, label: "Hide " + label, value: !!storage.hiddenFlags?.[id], onPress: () => toggleHiddenFlag(id) })),

      React.createElement(RN.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 14, marginBottom: 8 } }, "Remove Owned Nitro / Extra Icons"),
      ...EXTRA_BADGES.map(([id, label]) => React.createElement(Toggle, { key: "hide-extra-" + id, label: "Hide " + label, value: !!storage.hiddenExtras?.[id], onPress: () => toggleHiddenExtra(id) })),

      React.createElement(RN.Text, { style: { color: "#aaa", marginTop: 12, lineHeight: 18 } }, "Typing is saved without refreshing every letter now. Tap Apply / Refresh after editing text. Restart Discord if badges do not refresh instantly.")
    );
  }

  const index = {
    onLoad() {
      patchStores();
      patchMediaResolvers();
      debugState.last = `Loaded with ${unpatches.length} runtime patches`;
    },
    onUnload() {
      for (const unpatch of unpatches) try { unpatch?.(); } catch {}
      unpatches = [];
      clearFakeCache();
      refreshDiscord();
    },
    settings: Settings
  };

  exports.default = index;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;
})(
  {},
  typeof bunny !== "undefined" && bunny.metro ? bunny.metro : vendetta.metro,
  typeof bunny !== "undefined" && bunny.metro?.common ? bunny.metro.common : vendetta.metro.common,
  typeof bunny !== "undefined" ? bunny.utils?.lazy : undefined,
  typeof bunny !== "undefined" && bunny.api?.patcher ? bunny.api : vendetta,
  vendetta.plugin
);
