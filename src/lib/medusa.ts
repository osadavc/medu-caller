import Medusa from "@medusajs/medusa-js";
import * as config from "../config";

const medusa = new Medusa({
  baseUrl: config.MEDUSA_BACKEND_URL,
  maxRetries: 3,
});

export default medusa;
