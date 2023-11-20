import "dotenv/config";
import express from "express";
import { generators, Issuer } from "openid-client";
import cookieSession from "cookie-session";
import morgan from "morgan";

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

app.set("view engine", "ejs");
app.use(
  cookieSession({
    name: "mcp_session",
    keys: ["key1", "key2"],
  }),
);
app.use(morgan("combined"));

const origin = `http://${process.env.HOST}:${process.env.PORT}`;
const redirectUri = `${origin}${process.env.CALLBACK_URL}`;

const getMcpClient = async () => {
  const mcpIssuer = await Issuer.discover(process.env.MCP_PROVIDER);

  return new mcpIssuer.Client({
    client_id: process.env.MCP_CLIENT_ID,
    client_secret: process.env.MCP_CLIENT_SECRET,
    redirect_uris: [redirectUri],
    response_types: ["code"],
    id_token_signed_response_alg: process.env.MCP_ID_TOKEN_SIGNED_RESPONSE_ALG,
    userinfo_signed_response_alg:
      process.env.MCP_USERINFO_SIGNED_RESPONSE_ALG || null,
  });
};

app.get("/", async (req, res, next) => {
  try {
    res.render("index", {
      title: process.env.SITE_TITLE,
      stylesheet_url: process.env.STYLESHEET_URL,
      userinfo: JSON.stringify(req.session.userinfo, null, 2),
      idtoken: JSON.stringify(req.session.idtoken, null, 2),
      oauth2token: JSON.stringify(req.session.oauth2token, null, 2),
    });
  } catch (e) {
    next(e);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const client = await getMcpClient();
    const code_verifier = generators.codeVerifier();
    req.session.verifier = code_verifier;
    const code_challenge = generators.codeChallenge(code_verifier);

    const redirectUrl = client.authorizationUrl({
      scope: process.env.MCP_SCOPES,
      code_challenge,
      code_challenge_method: "S256",
      login_hint: process.env.LOGIN_HINT,
    });

    res.redirect(redirectUrl);
  } catch (e) {
    next(e);
  }
});

app.get(process.env.CALLBACK_URL, async (req, res, next) => {
  try {
    const client = await getMcpClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(redirectUri, params, {
      code_verifier: req.session.verifier,
    });

    req.session.userinfo = await client.userinfo(tokenSet.access_token);
    req.session.idtoken = tokenSet.claims();
    req.session.oauth2token = tokenSet;

    res.redirect("/");
  } catch (e) {
    next(e);
  }
});

app.post("/select-organization", async (req, res, next) => {
  try {
    const client = await getMcpClient();
    const code_verifier = generators.codeVerifier();
    req.session.verifier = code_verifier;
    const code_challenge = generators.codeChallenge(code_verifier);

    const redirectUrl = client.authorizationUrl({
      scope: process.env.MCP_SCOPES,
      code_challenge,
      code_challenge_method: "S256",
      prompt: "select_organization",
    });

    res.redirect(redirectUrl);
  } catch (e) {
    next(e);
  }
});

app.post("/logout", async (req, res, next) => {
  try {
    req.session = null;
    const client = await getMcpClient();
    const redirectUrl = client.endSessionUrl({
      post_logout_redirect_uri: `${origin}/`,
    });

    res.redirect(redirectUrl);
  } catch (e) {
    next(e);
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(process.env);
});
