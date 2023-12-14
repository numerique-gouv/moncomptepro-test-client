//

import { Hono, type Env } from "hono";
import { CookieStore, Session, sessionMiddleware } from "hono-sessions";
import { logger } from "hono/logger";
import { ok } from "node:assert";
import { env as process_env } from "node:process";
import {
  Issuer,
  TokenSet,
  generators,
  type IdTokenClaims,
} from "openid-client";
import Youch from "youch";
import { z } from "zod";
import { Index } from "./views";

//

const env = z
  .object({
    CALLBACK_URL: z.string().default("/login-callback"),
    HOST: z.string(),
    LOGIN_HINT: z.string().default(""),
    MCP_CLIENT_ID: z.string(),
    MCP_CLIENT_SECRET: z.string(),
    MCP_ID_TOKEN_SIGNED_RESPONSE_ALG: z.string().default("RS256"),
    MCP_PROVIDER: z.string(),
    MCP_SCOPES: z.string().default("openid email profile organization"),
    MCP_USERINFO_SIGNED_RESPONSE_ALG: z.string().optional(),
    PORT: z.coerce.number().default(3000),
    SITE_TITLE: z.string().default("Bonjour monde !"),
    STYLESHEET_URL: z.string().default("https://unpkg.com/bamboo.css"),
  })
  .parse(process_env);

const redirectUri = `${env.HOST}${env.CALLBACK_URL}`;

//

interface Session_Context extends Env {
  Variables: {
    session: Session & {
      get(key: "verifier"): string;
      set(key: "verifier", value: string): void;
    } & {
      get(key: "userinfo"): string;
      set(key: "userinfo", value: string): void;
    } & {
      get(key: "idtoken"): IdTokenClaims;
      set(key: "idtoken", value: IdTokenClaims): void;
    } & {
      get(key: "oauth2token"): TokenSet;
      set(key: "oauth2token", value: TokenSet): void;
    };
  };
}
const hono = new Hono<Session_Context>();

//

hono.use("*", logger());

hono.use(
  "*",
  sessionMiddleware({
    store: new CookieStore(),
    encryptionKey: "a secret with minimum length of 32 characters",
    sessionCookieName: "mcp_session",
  }),
);

//

hono.get("/", ({ html, get }) => {
  const session = get("session") || new Session();

  return html(
    Index({
      title: env.SITE_TITLE,
      stylesheet_url: env.STYLESHEET_URL,
      userinfo: session.get("userinfo"),
      idtoken: session.get("idtoken"),
      oauth2token: session.get("oauth2token"),
    }),
  );
});

hono.post("/login", async function ({ redirect, get }) {
  const session = get("session");

  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  session.set("verifier", code_verifier);

  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    login_hint: env.LOGIN_HINT,
  });

  return redirect(redirectUrl);
});

hono.get(env.CALLBACK_URL, async function ({ req, redirect, get }) {
  const session = get("session");
  const client = await getMcpClient();
  const params = client.callbackParams(req.raw.url);
  const tokenSet = await client.callback(redirectUri, params, {
    code_verifier: session.get("verifier") as string,
  });

  ok(tokenSet.access_token, "Missing tokenSet.access_token");

  session.set("userinfo", await client.userinfo(tokenSet.access_token));
  session.set("idtoken", tokenSet.claims());
  session.set("oauth2token", tokenSet);

  return redirect("/");
});

hono.post("/select-organization", async function ({ req, redirect, get }) {
  const session = get("session");
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  session.set("verifier", code_verifier);
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    prompt: "select_organization",
  });

  return redirect(redirectUrl);
});

hono.post("/update-userinfo", async ({ get, redirect }) => {
  const session = get("session");
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  session.set("verifier", code_verifier);
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    prompt: "update_userinfo",
  });

  return redirect(redirectUrl);
});

hono.post("/logout", async ({ get, redirect }) => {
  const session = get("session");
  session.deleteSession();

  const client = await getMcpClient();
  const redirectUrl = client.endSessionUrl({
    post_logout_redirect_uri: `${env.HOST}/`,
  });

  return redirect(redirectUrl);
});

hono.post("/force-login", async ({ get, redirect }) => {
  const session = get("session");
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  session.set("verifier", code_verifier);
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    claims: { id_token: { auth_time: { essential: true } } },
    code_challenge,
    code_challenge_method: "S256",
    prompt: "login",
    // alternatively, you can use the 'max_age: 0'
    // if so, claims parameter is not necessary as auth_time will be returned
  });

  return redirect(redirectUrl);
});

hono.onError(async (error, { html, req }) => {
  const youch = new Youch(error, req.raw);
  return html(await youch.toHTML());
});

export default hono;

//

const getMcpClient = async () => {
  const mcpIssuer = await Issuer.discover(env.MCP_PROVIDER);

  return new mcpIssuer.Client({
    client_id: env.MCP_CLIENT_ID,
    client_secret: env.MCP_CLIENT_SECRET,
    id_token_signed_response_alg: env.MCP_ID_TOKEN_SIGNED_RESPONSE_ALG,
    redirect_uris: [redirectUri],
    response_types: ["code"],
    userinfo_signed_response_alg: env.MCP_USERINFO_SIGNED_RESPONSE_ALG,
  });
};
