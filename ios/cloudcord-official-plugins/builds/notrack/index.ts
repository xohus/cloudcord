import { defineCorePlugin } from "..";
import { findByProps } from "@metro";
import { instead } from "@lib/api/patcher";
import { logger } from "@lib/utils/logger";

type PatchCleanupFn = () => void;

let patches: PatchCleanupFn[] = [];

const AnalyticsUtils = findByProps("AnalyticsActionHandlers");
const SuperPropUtils = findByProps("encodeProperties", "track");
const VoiceStateUtils = findByProps("getVoiceStateMetadata");
const CrashReportUtils = findByProps("submitLiveCrashReport");
const MetricsUtils = findByProps("_metrics");

interface SentryClient {
  getOptions: () => { enabled: boolean };
  close: () => void;
  open: () => void;
}

interface SentryScope {
  clear: () => void;
}

interface SentryHub {
  getClient: () => SentryClient | undefined;
  getStackTop: () => { scope: SentryScope };
  getScope: () => SentryScope;
  addBreadcrumb?: (breadcrumb: unknown) => void;
}

interface GlobalSentry {
  hub?: SentryHub;
}

const sentryGlobal = (globalThis as unknown as { __SENTRY__?: GlobalSentry })
  .__SENTRY__;
const sentryHub = sentryGlobal?.hub;
const sentryClient = sentryHub?.getClient();

const Sentry = {
  initializer: findByProps("initSentry"),
  main: sentryHub,
  client: sentryClient,
};

const noop = (prop: string, parent: Record<string, any>): PatchCleanupFn => {
  try {
    return instead(prop, parent, () => undefined);
  } catch (e) {
    return () => false;
  }
};

function patchNetwork(): PatchCleanupFn {
  const analyticsTest =
    /client-analytics\.braintreegateway\.com|discord\.com\/api\/v9\/(science|track)|app\.adjust\..*|.*\.ingest\.sentry\.io/;

  try {
    const unpatch = instead(
      "send",
      XMLHttpRequest.prototype,
      function (
        this: XMLHttpRequest & { __sentry_xhr__?: { url: string } },
        args: unknown[],
        orig: Function,
      ) {
        if (
          this.__sentry_xhr__?.url &&
          analyticsTest.test(this.__sentry_xhr__.url)
        ) {
          return undefined;
        }
        return orig.apply(this, args);
      },
    );
    return unpatch;
  } catch (e) {
    return () => false;
  }
}

function patchConsole(): PatchCleanupFn {
  type ConsoleFunction = Function & { __sentry_original__?: Function };
  type ConsoleFunctions = Record<string, ConsoleFunction>;

  const sentrified: ConsoleFunctions = {};

  try {
    (Object.keys(console) as Array<keyof Console>).forEach((key) => {
      const consoleFunc = (console as unknown as ConsoleFunctions)[key];
      if (consoleFunc) {
        sentrified[key] = consoleFunc;
        const originalFunc = consoleFunc.__sentry_original__;
        (console as unknown as ConsoleFunctions)[key] =
          originalFunc ?? consoleFunc;
      }
    });
  } catch (e) {
    logger.log("Failed to de-sentrify console functions!", e);
  }

  return () => {
    Object.keys(sentrified).forEach((key) => {
      if (sentrified[key]) {
        (console as unknown as ConsoleFunctions)[key] = sentrified[key];
      }
    });
  };
}

function patchMiscellaneous(): PatchCleanupFn {
  const miscPatches = [
    AnalyticsUtils?.AnalyticsActionHandlers &&
      noop("handleTrack", AnalyticsUtils.AnalyticsActionHandlers),
    AnalyticsUtils?.AnalyticsActionHandlers &&
      noop("handleFingerprint", AnalyticsUtils.AnalyticsActionHandlers),

    SuperPropUtils && noop("track", SuperPropUtils),

    VoiceStateUtils && noop("trackWithMetadata", VoiceStateUtils),

    CrashReportUtils && noop("submitLiveCrashReport", CrashReportUtils),

    MetricsUtils?._metrics && noop("push", MetricsUtils._metrics),
  ].filter(Boolean) as PatchCleanupFn[];

  return () => miscPatches.forEach((p) => p());
}

function patchSentry(): PatchCleanupFn {
  const sentryPatches: PatchCleanupFn[] = [];

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

export default defineCorePlugin({
  manifest: {
    id: "bunny.notrack",
    version: "1.0.0",
    type: "plugin",
    spec: 3,
    main: "",
    display: {
      name: "NoTrack",
      description: "Disables Discord's telemetry",
      authors: [{ name: "maisymoe" }],
    },
  },

  start() {
    patches = [
      patchNetwork(),
      patchConsole(),
      patchMiscellaneous(),
      patchSentry(),
    ].filter(Boolean);

    logger.log("NoTrack: Enabled - all telemetry tracking disabled");
  },

  stop() {
    patches.forEach((p) => p?.());
    patches = [];

    logger.log("NoTrack: Disabled - telemetry tracking restored");
  },
});
