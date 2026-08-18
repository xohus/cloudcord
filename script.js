document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    function setTheme(isLight) {
        if (isLight) {
            document.body.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        }
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isCurrentlyLight = document.body.classList.contains('light');
            setTheme(!isCurrentlyLight);
        });
    }

    // 2. Scroll Reveal & Stagger Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.05
    };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
    });

    setTimeout(() => {
        document.querySelectorAll('.hero-content.reveal').forEach(el => el.classList.add('active'));
    }, 100);

    // 3. Modal Logic
    const modal = document.getElementById('download-modal');
    const heroBtn = document.getElementById('hero-download-btn');
    const navBtn = document.getElementById('nav-download');
    const closeBtn = modal ? modal.querySelector('.close-modal') : null;

    function openModal(e) {
        if (e) e.preventDefault();
        if (modal) modal.classList.add('show');
    }
    function closeModal() {
        if (modal) modal.classList.remove('show');
    }

    if (heroBtn) heroBtn.addEventListener('click', openModal);
    if (navBtn) navBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // 4. Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#download') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 5. Populate Plugins
    const pluginsGrid = document.getElementById('plugins-grid');
    const searchInput = document.getElementById('plugin-search');
    const marqueeTrack = document.getElementById('marquee-track');
    
    const pluginsRaw = "ChatInputButtonAPI,CommandsAPI,DynamicImageModalAPI,MemberListDecoratorsAPI,MessageAccessoriesAPI,MessageDecorationsAPI,MessageEventsAPI,MessagePopoverAPI,MessageUpdaterAPI,NicknameIconsAPI,ServerListAPI,UserSettingsAPI,AccountPanelServerProfile,AlwaysAnimate,AlwaysExpandRoles,AlwaysTrust,AnonymiseFileNames,AppleMusicRichPresence,AutoDNDWhilePlaying,BetterFolders,BetterGifAltText,BetterGifPicker,BetterRoleContext,BetterRoleDot,BetterSessions,BetterSettings,BetterUploadButton,BiggerStreamPreview,BlurNSFW,CallTimer,CharacterCounter,ClearURLs,ClientTheme,ColorSighted,ConsoleJanitor,ConsoleShortcuts,CopyEmojiMarkdown,CopyFileContents,CopyStickerLinks,CopyUserURLs,CrashHandler,CustomCommands,CustomIdle,CustomRPC,Dearrow,Decor,DisableCallIdle,DontRoundMyTimestamps,Experiments,ExpressionCloner,F8Break,FakeNitro,FakeProfileThemes,FavoriteEmojiFirst,FavoriteGifSearch,FixCodeblockGap,FixImagesQuality,FixSpotifyEmbeds,FixYoutubeEmbeds,ForceOwnerCrown,FriendInvites,FriendsSince,FullSearchContext,FullUserInChatbox,GameActivityToggle,GifPaste,GreetStickerPicker,HideMedia,IgnoreActivities,ILoveSpam,ImageFilename,ImageLink,ImageZoom,ImplicitRelationships,IrcColors,KeepCurrentChannel,LastFMRichPresence,LoadingQuotes,MemberCount,MentionAvatars,MessageClickActions,MessageLatency,MessageLinkEmbeds,MessageLogger,MoreQuickReactions,MutualGroupDMs,NewGuildSettings,NoBlockedMessages,NoDevtoolsWarning,NoF1,NoMaskedUrlPaste,NoMiddleClickPaste,NoMosaic,NoOnboardingDelay,NoPendingCount,NoProfileThemes,NoReplyMention,NoServerEmojis,NoSystemBadge,NotificationVolume,NoTypingAnimation,NoUnblockToJump,OnePingPerDM,OpenInApp,OverrideForumDefaults,PauseInvitesForever,PermissionFreeWill,PermissionsViewer,PetPet,PictureInPicture,PinDMs,PlainFolderIcon,PlatformIndicators,PreviewMessage,QuickMention,QuickReply,ReactErrorDecoder,ReadAllNotificationsButton,RelationshipNotifier,ReplaceGoogleSearch,ReplyTimestamp,RevealAllSpoilers,ReverseImageSearch,ReviewDB,RoleColorEverywhere,SecretRingToneEnabler,Summaries,SendTimestamps,ServerInfo,ServerListIndicators,ShikiCodeblocks,ShowAllMessageButtons,ShowConnections,ShowHiddenChannels,ShowHiddenThings,ShowMeYourName,ShowTimeoutDuration,SilentMessageToggle,SilentTyping,SortFriends,SpotifyCrack,SpotifyShareCommands,StartupTimings,StickerPaste,StreamerModeOn,SuperReactionTweaks,TextReplace,ThemeAttributes,Translate,TypingIndicator,TypingTweaks,Unindent,UnlockedAvatarZoom,UnsuppressEmbeds,UserMessagesPronouns,UserVoiceShow,USRBG,ValidReply,ValidUser,VoiceChatDoubleClick,VcNarrator,ViewIcons,ViewRaw,VoiceDownload,VoiceMessages,VolumeBooster,WhoReacted,XSOverlay,YoutubeAdblock,AudioPlayerAPI,HeaderBarAPI,ProfileCollectionsAPI,ProfileSectionsAPI,UserAreaAPI,ConcatenatedModules,AltKrispSwitch,AlwaysExpandProfiles,Animalese,AtSomeone,AutoZipper,BannersEverywhere,DecodeBase64,BetterActivities,BetterAudioPlayer,BetterBanReasons,BetterBlockedUsers,BetterCommands,BetterGifLoad,BetterInvites,BetterPlusReacts,BlockKeywords,BlockKrisp,BypassPinPrompt,BypassStatus,ChannelBadges,ChannelTabs,CleanChannelName,CleanerChannelGroups,ClickableRoles,ClientSideBlock,ClipsEnhancements,ClipUpload,CommandPalette,ContentWarning,CopyProfileColors,CopyStatusUrls,CopyUserMention,CursorBuddy,CustomFolderIcons,CustomSounds,CustomStatusTimeouts,CustomTimestamps,CustomUserColors,Declutter,DisableCameras,DiscordDevBanner,DownloadAllAttachments,DragFavoriteEmotes,Dragify,ExitSounds,ExportMessages,ProfileSpoofer,ContextMenuAPI,FastDeleteChannels,FavouriteAnything,FileUpload,FindReply,FixFileExtensions,FollowVoiceUser,FontLoader,ForwardAnywhere,FrequentQuickSwitcher,FriendCodes,FriendshipRanks,FriendTags,FullVCPFP,Ghosted,GifCollections,GitHubRepos,GlobalBadges,GoogleThat,GuildPickerDumper,HideChatButtons,HideMessages,HideServers,HomeTyping,HopOn,Husk,IconViewer,IdleAutoRestart,IgnoreCalls,Ingtoninator,InRole,InstantScreenshare,InvisibleChat,InviteDefaults,IRememberYou,Jumpscare,JumpTo,KeyboardNavigation,KeyboardSounds,KeywordNotify,LastActive,LimitlessScreenshare,LoginWithQR,MarkdownTables,MediaPlaybackSpeed,MessageBurst,MessageColors,MessageFetchTimer,MessageLinkTooltip,MessageLoggerEnhanced,MessageNotifier,MessagePeek,MessageTranslate,MicLoopbackTester,MiddleClickTweaks,MoreCommands,MoreStickers,MoreUserTags,Moyai,MusicControls,NeverPausePreviews,NewPluginsManager,NoNitroUpsell,NoPushToTalk,NormalizeMessageLinks,NoRoleHeaders,NoRPC,NotificationTitle,OrbolayBridge,PartyMode,CancelFriendRequest,PingNotifications,PinIcon,PlatformSpoofer,PolishWording,ProfileSets,Questify,QuickThemeSwitcher,Quoter,RandomVoice,RecentDMSwitcher,RemixRevived,RepeatMessages,ReplyPingControl,RichMagnetLinks,RichPresence,RPCEditor,SaveFavoriteGIFs,ScheduledMessages,SearchFix,SekaiStickers,SelfForward,ServerSearch,ShowBadgesInChat,ShowMessageEmbeds,ShowResourceChannels,ShowSongName,Signature,SilenceUsers,SincordToolbox,Equissant,Snowfall,Soggy,SongLink,SongSpotlight,SplitLargeMessages,SpotifyActivityToggle,StatusPresets,StatusWhileActive,SteamStatusSync,StickerBlocker,Streaks,StreamingCodecDisabler,TalkInReverse,ThemeLibrary,TidalEmbeds,TiktokTTS,Timezones,Title,ToastNotifications,ToggleVideoBind,ToneIndicators,Translate+,TriviaAI,UnitConverter,UniversalMention,UnlimitedAccounts,UnreadCountBadge,UrlHighlighter,UserPFP,VcNarratorCustom,VCPanelSettings,ViewRawVariant,VoiceButtons,VoiceChannelLog,VoiceChatUtilities,VoiceJoinMessages,VoiceMessageTranscriber,VoiceRejoin,VoiceStats,WaitForSlot,WebpackTarball,WhitelistedEmojis,WhosWatching,WigglyText,WriteUpperCase,ZipPreview,NoTrack,SincordHelper,Settings,CloudCord Core,ConcatenatedComponentExtractor,SupportHelper,FakeProfile,CloudCordProfiles,CloudCordHelper,UserpluginInstaller";
    const pluginsList = pluginsRaw.split(',').map(p => p.trim()).sort();

    // Render for plugins.html
    if (pluginsGrid) {
        const mobilePluginsRaw = `Written Numbers — turns numbers into written-out words.
petPet — generates a petting-style reaction for a user.
Osu! Stats — shows osu! player stats and recent games.
Global Badges — displays badges from other Discord clients on profiles.
SlowmodeExtended — adds more slowmode duration options.
ViewRaw — lets you inspect raw message data.
UtilCommands — adds utility commands similar to Aliucord’s core commands.
Create webhooks — adds webhook creation to Discord’s webhook management screen.
devkitplus — collection of developer/debugging utilities.
ThisWillCrashYourDiscord — joke/test plugin intended to crash Discord.
Staff Tags — adds extra labels to staff members.
Delete embeds — adds an option to suppress message embeds.
Typing Avatars — shows users’ avatars instead of the normal typing indicator.
TokenUtils — adds token-related utility commands.
No typing — prevents other users from seeing when you’re typing.
NoCompression — stops Discord compressing uploaded files.
FileSizeOnPicker — displays file sizes in the media picker.
Image search — provides quick reverse-image-search actions.
Breado's Quotes — gives you random quotes through a command.
Free Profile Colors — client-side profile color customization.
Custom Voice Messages — lets audio files be sent as voice messages.
No Embed Copy — stops tapping embeds from automatically copying their contents.
NoDelete — temporarily keeps deleted messages visible locally.
Hide call buttons — removes call buttons from DMs, profiles, and voice areas.
NoBandwidthKick — prevents Discord disconnecting an idle solo DM call.
AlwaysTrust — removes Discord’s untrusted-link confirmation dialog.
StickerUtils — utilities for Discord stickers.
RoleColorEverywhere — displays users’ top-role colors in more places.
ClientThemes — automatically loads a theme after startup.
SpotifyPreview — previews short clips from Spotify links.
Message Logger — temporarily records deleted messages for moderation use.
JumpTo — jumps to referenced messages or the start of forum posts.
FreeStickers — allows stickers to be sent without Nitro.
Custom Timestamps — changes how timestamps look in chat.
FirstMessage — command for quickly reaching the first message.
AltMediaPicker — replaces Discord’s normal attachment picker with an alternative one.
Cloud Sync — syncs installed plugins, themes, and fonts through cloud storage.
Twemoji Everywhere — replaces system emoji with Twitter/Twemoji-style emoji.
Local Pins — lets you locally pin messages.
Plugin Browser — provides another browser for proxied Vendetta plugins.
Monet Theme — generates Material You-style themes.
CopyRoleColor — copies a role’s color as a hex value.
Char Counter — displays a character counter above the message box.
Freecons — unlocks/customizes Discord app icons.
Clean URLs — strips tracking parameters from links.
BetterSearch — improves Discord’s message-search interface.
BetterFolders — adds extra behavior and customization to server folders.
Song Spotlight — displays chosen music on your Discord profile.
LastMessageDate — shows when a user last sent a message.
AnonymousFileNames — randomizes filenames before uploading.
Experiments — exposes Discord developer/experimental features.
NoTrack — disables some Discord analytics/tracking.
PinSettings — pins plugin settings inside Discord’s normal settings.
DOOM — embeds a playable DOOM environment inside Discord settings.
Tenor Gif Fix — sends/downloads Tenor media as GIFs instead of MP4s.
Use System Emoji — replaces Discord Twemoji with your device emoji.
Message Preview — previews a message before you send it.
FakeProfileThemesAndEffects — client-side profile themes/effects encoded through profile data.
HideMessages — locally hides selected messages.
System Info — displays device/system information through a command.
HideAppButton — hides Discord’s app button from the chat box.
BrainFuckEval — adds an evaluator for the Brainfuck programming language.
Freemoji — allows Nitro-style custom emoji sending without Nitro.
Quick Delete — removes the extra confirmation when deleting messages or embeds.
BetterBetterChatGestures — adds extra touch gestures to chat.
Better Chat Buttons — lets you hide or keep different chat-box buttons visible.
Antied — temporarily keeps message edits and deletions visible.
Dashless — visually changes dashes in channel names into spaces.
Dislate Lite — translates messages into selected languages.
PlatformIndicators — shows whether users are on desktop, mobile, web, etc.
Picture Links — makes avatars and profile banners directly clickable.
Stealmoji — makes saving/copying custom emoji easier on mobile.
UserBG — adds custom user profile backgrounds.
Kazum Kiryu Facecam — displays Kazuma Kiryu while you type.
NexxUtils — collection of miscellaneous Discord utilities.
Better Calls — adds extra calling options such as confirmations and silent calls.
Themes+ — expands Discord theme customization.
Bluetooth Audio Fix — prevents Discord switching Bluetooth devices into hands-free audio mode.
No Suggestions — removes Discord’s recurring channel suggestions.
Spotify Fix — stops Discord automatically pausing Spotify during calls.
Force Timestamp Locale — forces timestamps to use a selected language.
Urban Dictionary — looks up Urban Dictionary definitions.
Mute New Guilds — automatically mutes newly joined servers.
HideGiftButton — hides the gift button in chat.
MoreConfirm — adds confirmation prompts before irreversible actions.
NoAutoReplyMention — disables automatic mentions when replying.
NoIdle — keeps your Discord status from becoming idle in the background.
Last.fm — displays Last.fm listening activity on your profile.
Show Image Links — keeps the original URL visible for linked images.
Show Tag — displays users’ full Discord tags in message headers.
FriendInvites — creates friend-invite links.
CatFacts — sends random cat facts.
BetterBios — makes profile bios selectable and their links clickable.
shutupClyde — hides Clyde/system messages.
SplitLargeMessages — automatically splits messages above Discord’s character limit.
Moyai — Moyai-themed sound/reaction plugin.
Tablet Mode — toggles Discord’s tablet UI.
HoldGIFSend — puts a selected GIF into the composer before sending it.
Always Animate — keeps animated avatars and server icons animating.
Pastelize — gives otherwise uncolored usernames pastel colors based on user IDs.
Compact Mode — reduces message-header clutter for a compact chat layout.
Plugin Embeds — shows plugin information when plugin links are posted.
BetterTimestamps — replaces ordinary date/time text with Discord timestamp formatting.
HideServers — locally hides selected servers from the server list.
Addon List — generates a list of your installed plugins/themes.
uwuify — transforms messages into “uwu” style text.
Spotify Share Commands — adds commands for sharing Spotify content.
BetterChatGestures — adds additional gestures to Discord chat.
PronounDB — displays PronounDB pronouns as profile/message tags.
UserPFP — supports custom UserPFP profile images.
LoginSound — plays a custom sound when Discord starts/logs in.
ActionSheetFinder — developer utility for identifying Discord action-sheet keys.
Hidden Channels — displays channels that Discord normally hides from the channel list.
HideBlockedAndIgnoredMessages — fully removes blocked/ignored-message placeholders.
CopyBios — lets you directly copy profile bio text.
Plugins List — browser for plugins and themes from the Plugins List catalog.
KonoChan-Randomizer — displays random images from its configured image source.
catbox.moe — uploads larger files through an external file-hosting service.
FileContentPreview — previews text-file contents directly inside Discord.
Rich Presence — creates custom Discord Rich Presence activity.
Silent Messages — sends messages using Discord’s silent-message behavior.
NSFW Blur — automatically blurs previews and embedded media in age-restricted channels.
Read All — marks server and DM notifications as read with one command.
More Alts! — improves Discord’s built-in account-switching support.
Decor — adds community/custom avatar decorations.
Commands — collection of repaired/general-purpose commands.
Multi Scrobbler — displays listening activity from Last.fm, Libre.fm, or ListenBrainz.
Antied Zero — lighter version of Antied without its settings UI.
Radial Status v1.0.1 — turns presence indicators into rings around avatars.
Gif Categories — creates custom categories for saved GIFs.
ClipboardGIFSend — copies selected GIFs instead of immediately sending them.
RemoveBanner — completely hides server banners.
Christmas Counter — displays a countdown to Christmas.
ReviewDB — shows and posts community reviews on user profiles.
Better Eval — adds a dedicated JavaScript evaluation screen.
Let it Snow — renders falling snowflakes over Discord.
SilentLeave — provides a command for leaving a group DM quietly.
HypeSquadSwitcher — changes or removes your HypeSquad house.
Override User Avatars — locally replaces another user’s avatar with a custom image.
GifRoulette — sends a randomly selected GIF.
Animal Commands — adds commands that return animal pictures.
FavouriteAnything — lets you favorite images/videos, not only GIFs.
GTA VI Countdown — displays a countdown to GTA VI.
Jump To Top — adds a button for jumping to the beginning of a chat.
Text Replace — configurable automatic text replacement.
Realmoji — makes Freemoji-rendered emoji appear more like normal custom emoji locally.
BypassPinPrompt — removes Discord’s extra confirmation when pinning.
GuildLurk — changes how joined servers are displayed locally.
InfoCommands — shows information about users, servers, and invites.
ValidUser — turns unresolved @unknown-user mentions back into clickable mentions.
SilentDelete — changes local handling of deleted-message events.
UwUify — another configurable uwu-style text transformer.
Chatbox Avatar — opens your profile quickly from your chat-box avatar.
Piratifier — converts messages into pirate-style speech.
BetterCommandPopout — adds copy-command and copy-ID options to command popouts.
Next Translator — translates selected text into a chosen language.
PermissionViewer — displays user/channel permissions and server roles.
BringBackTenor — restores the older Tenor GIF-search experience.
StreamQuality — exposes higher Discord stream-quality options.
NoMentionCount — hides mention counters for selected servers/channels.
Keyword Tracker — alerts you when configured keywords appear.
RemoveUserBanner — hides user profile banners.
Server Drawer — adds an alternative server drawer around the YouBar.
SearchActionSheet — makes long-pressing search results open their action sheet.`;

        const mobilePluginsObj = mobilePluginsRaw
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.includes('—'))
            .map(l => {
                const idx = l.indexOf('—');
                const name = l.substring(0, idx).trim();
                const desc = l.substring(idx + 1).trim();
                return { name, desc };
            });

        const desktopPluginsObj = pluginsList.map(p => ({
            name: p,
            desc: "A native CloudCord plugin optimized for the desktop client."
        }));

        let activeTab = 'desktop';

        const tabDesktop = document.getElementById('tab-desktop');
        const tabMobile = document.getElementById('tab-mobile');
        const instructionText = document.getElementById('plugin-instructions');

        const renderPlugins = (filterText = '') => {
            pluginsGrid.innerHTML = '';
            
            const currentList = activeTab === 'desktop' ? desktopPluginsObj : mobilePluginsObj;
            const filtered = currentList.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
            
            if (filtered.length === 0) {
                pluginsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted)">No plugins found.</p>';
                return;
            }

            filtered.forEach(plugin => {
                const card = document.createElement('div');
                card.className = 'plugin-card';
                card.style.flexDirection = 'column';
                card.style.alignItems = 'flex-start';
                card.style.gap = '0.5rem';
                card.style.cursor = 'pointer';
                card.style.transition = 'transform 0.2s';
                card.onmouseover = () => card.style.transform = 'translateY(-2px)';
                card.onmouseout = () => card.style.transform = 'translateY(0)';
                
                card.setAttribute('onclick', `openPluginModal('${plugin.name.replace(/'/g, "\\'")}', '${plugin.desc.replace(/'/g, "\\'")}')`);
                
                card.innerHTML = `
                    <h4 style="font-size: 1.1rem; color: var(--accent-purple); word-break: break-word; margin-bottom: 0.25rem;">${plugin.name}</h4>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); font-weight: normal; margin-bottom: 0.75rem; line-height: 1.4;">${plugin.desc}</p>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-top: auto;">Click to view & install <span style="font-size: 1rem; color: var(--accent-purple);">→</span></span>
                `;
                pluginsGrid.appendChild(card);
            });
        };

        const switchTab = (tab) => {
            activeTab = tab;
            if (tab === 'desktop') {
                tabDesktop.classList.replace('btn-secondary', 'btn-primary');
                tabMobile.classList.replace('btn-primary', 'btn-secondary');
            } else {
                tabMobile.classList.replace('btn-secondary', 'btn-primary');
                tabDesktop.classList.replace('btn-primary', 'btn-secondary');
            }
            instructionText.innerHTML = `<strong>How to enable:</strong> Open User Settings, scroll to the CloudCord section, and choose Plugins.<br> Search for the plugin and enable it!`;
            
            renderPlugins(searchInput ? searchInput.value : '');
        };

        const pluginModal = document.getElementById('plugin-details-modal');
        const closePluginModal = document.querySelector('.close-plugin-modal');
        const pluginTitle = document.getElementById('modal-plugin-title');
        const pluginDesc = document.getElementById('modal-plugin-desc');
        const pluginCopyBtn = document.getElementById('modal-plugin-copy');
        
        if (closePluginModal && pluginModal) {
            closePluginModal.addEventListener('click', () => pluginModal.classList.remove('show'));
            window.addEventListener('click', (e) => {
                if (e.target === pluginModal) pluginModal.classList.remove('show');
            });
        }
        
        window.openPluginModal = (name, desc) => {
            if (!pluginModal) return;
            pluginTitle.innerText = name;
            pluginDesc.innerText = desc;
            pluginCopyBtn.innerText = "Copy Name";
            
            pluginCopyBtn.onclick = () => {
                navigator.clipboard.writeText(name).then(() => {
                    pluginCopyBtn.innerText = "Copied!";
                    setTimeout(() => pluginCopyBtn.innerText = "Copy Name", 2000);
                });
            };
            
            const installInstructions = document.getElementById('modal-install-instructions');
            if (installInstructions) {
                installInstructions.innerHTML = "1. Open <strong>User Settings</strong> in your client.<br>2. Scroll down to the <strong>CloudCord</strong> section and choose <strong>Plugins</strong>.<br>3. Search for the copied name below and enable it.";
            }
            
            pluginModal.classList.add('show');
        };

        if (tabDesktop && tabMobile) {
            tabDesktop.addEventListener('click', () => switchTab('desktop'));
            tabMobile.addEventListener('click', () => switchTab('mobile'));
        }

        switchTab('desktop');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderPlugins(e.target.value);
            });
        }
    }
    
    // Render marquee for index.html
    if (marqueeTrack) {
        const rowCount = 4;
        const rows = Array.from({length: rowCount}, () => document.createElement('div'));
        rows.forEach((row, i) => {
            row.className = 'marquee-row';
            if (i % 2 !== 0) row.classList.add('reverse');
            marqueeTrack.appendChild(row);
        });

        // Distribute plugins
        pluginsList.forEach((plugin, index) => {
            const div = document.createElement('div');
            div.className = 'plugin-item';
            div.textContent = plugin;
            rows[index % rowCount].appendChild(div);
        });

        // Duplicate for seamless loop
        pluginsList.forEach((plugin, index) => {
            const div = document.createElement('div');
            div.className = 'plugin-item';
            div.textContent = plugin;
            rows[index % rowCount].appendChild(div);
        });
    }

    // 6. Tilt Image Carousel (Hero Section)
    const tiltImages = document.querySelectorAll('.tilt-img');
    if (tiltImages.length > 0) {
        let currentImgIndex = 0;
        setInterval(() => {
            tiltImages[currentImgIndex].classList.remove('active');
            currentImgIndex = (currentImgIndex + 1) % tiltImages.length;
            tiltImages[currentImgIndex].classList.add('active');
        }, 4000); // Crossfade every 4 seconds
    }
    
    // 7. Exact verified CloudCord installs from the canonical usage service.
    const installCounter = document.getElementById('install-counter');
    if (installCounter) {
        let lastVerifiedCount = null;

        async function fetchVerifiedInstalls() {
            try {
                let response;
                try {
                    response = await fetch('/v1/usage/installs', {
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json' }
                    });
                } catch (e) {
                    // Fallback directly to worker
                    response = await fetch('https://cloudcord-profiles.ggxohus.workers.dev/v1/usage/installs', {
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json' }
                    });
                }

                if (!response || !response.ok) {
                    response = await fetch('https://cloudcord-profiles.ggxohus.workers.dev/v1/usage/installs', {
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json' }
                    });
                }

                if (!response.ok) throw new Error(`CloudCord usage service ${response.status}`);
                const payload = await response.json();
                const count = Number(payload?.count);
                if (!Number.isInteger(count) || count < 0) {
                    throw new Error('Invalid verified install response');
                }
                lastVerifiedCount = count;
                installCounter.innerText = count.toLocaleString();
                installCounter.title = 'Exact lifetime official CloudCord downloads from the canonical usage service';
            } catch (err) {
                console.error('Failed to fetch verified CloudCord installs', err);
                if (lastVerifiedCount === null) {
                    installCounter.innerText = '—';
                    installCounter.title = 'Verified count temporarily unavailable';
                }
            }
        }

        fetchVerifiedInstalls();
        setInterval(fetchVerifiedInstalls, 30000);
    }
});


