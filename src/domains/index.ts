import type { ToolDefinition } from "../types/shared.js";
import { gatewayTools } from "./gateways/tools.js";
import { transactionTools } from "./transactions/tools.js";
import { paymentMethodTools } from "./paymentMethods/tools.js";
import { certificateTools } from "./certificates/tools.js";
import { environmentTools } from "./environments/tools.js";
import { merchantProfileTools } from "./merchantProfiles/tools.js";
import { subMerchantTools } from "./subMerchants/tools.js";
import { eventTools } from "./events/tools.js";
import { protectionTools } from "./protection/tools.js";
import { scaTools } from "./sca/tools.js";
import { cardRefresherTools } from "./cardRefresher/tools.js";
import { networkTokenizationTools } from "./networkTokenization/tools.js";

export const allTools: ToolDefinition[] = [
  ...gatewayTools,
  ...transactionTools,
  ...paymentMethodTools,
  ...certificateTools,
  ...environmentTools,
  ...merchantProfileTools,
  ...subMerchantTools,
  ...eventTools,
  ...protectionTools,
  ...scaTools,
  ...cardRefresherTools,
  ...networkTokenizationTools,
];
