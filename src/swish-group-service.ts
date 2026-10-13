import axios from "axios";
import fs from "node:fs";
import https from "node:https";
import { swishGroupRouter } from "./swish-group";

type Environment = Record<string, string | undefined>;

/** Shares the deployed merchant identity, without changing ordinary checkout. */
export function swishGroupTransport(env: Environment) {
  const mode = env.SWISH_MODE || env.SWISH_ENV;
  if (
    (mode !== "production" && mode !== "test") ||
    (env.SWISH_MODE && env.SWISH_ENV && env.SWISH_MODE !== env.SWISH_ENV)
  )
    throw new Error("Explicit, consistent Swish environment is required");
  const origin =
    mode === "production"
      ? "https://cpc.getswish.net"
      : "https://mss.cpc.getswish.net";
  // Reject conflicting legacy URLs rather than sending the certificate elsewhere.
  for (const [key, version] of [
    ["SWISH_API_URL", "v2"],
    ["SWISH_RETRIEVE_API_URL", "v1"],
  ]) {
    if (
      env[key] &&
      env[key]?.replace(/\/$/, "") !==
        `${origin}/swish-cpcapi/api/${version}/paymentrequests`
    )
      throw new Error("Swish API URL does not match its environment");
  }
  if (!env.SWISH_CERT_PATH) throw new Error("SWISH_CERT_PATH is required");
  const certificate = fs.readFileSync(env.SWISH_CERT_PATH);
  const pem = certificate.includes(Buffer.from("-----BEGIN CERTIFICATE-----"));
  if (pem && !env.SWISH_KEY_PATH)
    throw new Error("SWISH_KEY_PATH is required for a PEM certificate");
  const agent = new https.Agent({
    ...(pem
      ? { cert: certificate, key: fs.readFileSync(env.SWISH_KEY_PATH!) }
      : { pfx: certificate }),
    passphrase: env.SWISH_CERT_PASSPHRASE,
    ...(env.SWISH_CA_PATH ? { ca: fs.readFileSync(env.SWISH_CA_PATH) } : {}),
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  });
  return async (
    method: "GET" | "PUT" | "PATCH",
    path: string,
    data: unknown,
    signal: AbortSignal,
  ) => {
    if (!/^\/v[12]\/(paymentrequests|refunds)\/[A-F0-9]{32}$/.test(path))
      throw new Error("Invalid Swish resource");
    const response = await axios.request({
      method,
      url: `${origin}/swish-cpcapi/api${path}`,
      data,
      httpsAgent: agent,
      signal,
      timeout: 10000,
      maxRedirects: 0,
      maxContentLength: 64 * 1024,
      responseType: "json",
      headers: {
        "Content-Type":
          method === "PATCH"
            ? "application/json-patch+json"
            : "application/json",
      },
      validateStatus: () => true,
    });
    return { status: response.status, data: response.data as unknown };
  };
}

export function swishGroupService(env: Environment = process.env) {
  let transport: ReturnType<typeof swishGroupTransport> | undefined;
  return swishGroupRouter({
    secret: () => env.SWISH_INTERNAL_SECRET,
    callbackUrl: () => env.SWISH_GROUP_CALLBACK_URL,
    payeeAlias: () => env.SWISH_PAYEE_ALIAS,
    request: (...args) => {
      // A missing group configuration must not take ordinary checkout offline.
      transport ||= swishGroupTransport(env);
      return transport(...args);
    },
  });
}
