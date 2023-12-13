//

import fastify_cookie, { type FastifyCookieOptions } from "@fastify/cookie";
import fastify_formbody from "@fastify/formbody";
import fastify_session, { type FastifySessionOptions } from "@fastify/session";
import pointOfView from "@fastify/view";
import ejs from "ejs";
import Fastify from "fastify";
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

const fastify = Fastify({ logger: true });
fastify.register(pointOfView, { engine: { ejs } });
fastify.register(fastify_formbody);
fastify.register(fastify_cookie, {} as FastifyCookieOptions);

declare module "fastify" {
  interface Session {
    verifier: string;
    userinfo: string;
    idtoken: IdTokenClaims;
    oauth2token: TokenSet;
  }
}

fastify.register(fastify_session, {
  cookieName: "mcp_session",
  secret: ["key1", "key2"],
  cookie: { secure: "auto" },
} as FastifySessionOptions);

fastify.get("/", function (req, reply) {
  reply.view("/views/index.ejs", {
    title: env.SITE_TITLE,
    stylesheet_url: env.STYLESHEET_URL,
    userinfo: JSON.stringify(req.session.userinfo, null, 2),
    idtoken: JSON.stringify(req.session.idtoken, null, 2),
    oauth2token: JSON.stringify(req.session.oauth2token, null, 2),
  });
});

fastify.post("/login", async function (req, reply) {
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  req.session.verifier = code_verifier;

  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    login_hint: env.LOGIN_HINT,
  });

  reply.redirect(redirectUrl);
});

fastify.get(env.CALLBACK_URL, async function (req, reply) {
  const client = await getMcpClient();
  const params = client.callbackParams(req.raw);
  const tokenSet = await client.callback(redirectUri, params, {
    code_verifier: req.session.verifier,
  });

  ok(tokenSet.access_token, "Missing tokenSet.access_token");

  req.session.userinfo = await client.userinfo(tokenSet.access_token);
  req.session.idtoken = tokenSet.claims();
  req.session.oauth2token = tokenSet;

  reply.redirect("/");
});

fastify.post("/select-organization", async function (req, reply) {
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  req.session.verifier = code_verifier;
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    prompt: "select_organization",
  });

  reply.redirect(redirectUrl);
});

fastify.post("/update-userinfo", async (req, reply) => {
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  req.session.verifier = code_verifier;
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: env.MCP_SCOPES,
    code_challenge,
    code_challenge_method: "S256",
    prompt: "update_userinfo",
  });

  reply.redirect(redirectUrl);
});

fastify.post("/logout", async (req, reply) => {
  await req.session.destroy();
  const client = await getMcpClient();
  const redirectUrl = client.endSessionUrl({
    post_logout_redirect_uri: `${env.HOST}/`,
  });

  reply.redirect(redirectUrl);
});

fastify.post("/force-login", async (req, reply) => {
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  req.session.verifier = code_verifier;
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

  reply.redirect(redirectUrl);
});

fastify.setErrorHandler(async function (error, request, reply) {
  try {
    const youch = new Youch(error, request.raw);
    const html = await youch.toHTML();
    reply.type("text/html").send(html);
  } catch (error) {
    reply.send(error);
  }
});

fastify.listen({ port: env.PORT }, () => {
  console.log(`App listening on port ${env.PORT}`);
  console.log(env);
});

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
