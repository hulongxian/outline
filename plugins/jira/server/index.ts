import { Minute } from "@shared/utils/time";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/jira";
import { Jira } from "./jira";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.UnfurlProvider,
    value: { unfurl: Jira.unfurl, cacheExpiry: Minute.seconds },
  },
]);
