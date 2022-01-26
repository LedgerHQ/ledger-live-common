import axios from "axios";
import { getEnv } from "../../../env";

export default axios.create({
  baseURL: getEnv("CARDANO_API_ENDPOINT"),
  headers: {
    authorization: getEnv("CARDANO_API_ENDPOINT_AUTH"),
  },
});
