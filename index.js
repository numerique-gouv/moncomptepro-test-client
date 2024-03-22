import "dotenv/config";
import express from "express";
import { Issuer } from "openid-client";
import cookieSession from "cookie-session";
import morgan from "morgan";
import * as crypto from "crypto";

const port = parseInt(process.env.PORT, 10) || 3000;
const origin = `${process.env.HOST}`;
const redirectUri = `${origin}${process.env.CALLBACK_URL}`;

const app = express();

app.set("view engine", "ejs");
app.use(
  cookieSession({
    name: "mcp_session",
    keys: ["key1", "key2"],
  }),
);
app.use(morgan("combined"));

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
      showAgentConnectButton: process.env.SHOW_AGENTCONNECT_BUTTON === "true",
    });
  } catch (e) {
    next(e);
  }
});

const getAuthorizationControllerFactory = (extraParams) => {
  return async (req, res, next) => {
    try {
      const client = await getMcpClient();
      const acr_values = process.env.ACR_VALUES
        ? process.env.ACR_VALUES.split(",")
        : null;
      const login_hint = process.env.LOGIN_HINT || null;
      const scope = process.env.MCP_SCOPES;
      const nonce = crypto.randomBytes(16).toString("hex");
      const state = crypto.randomBytes(16).toString("hex");

      req.session.state = state;
      req.session.nonce = nonce;

      const redirectUrl = client.authorizationUrl({
        scope,
        login_hint,
        acr_values,
        nonce,
        state,
        ...extraParams,
      });

      res.redirect(redirectUrl);
    } catch (e) {
      next(e);
    }
  };
};

app.post("/login", getAuthorizationControllerFactory());

app.post(
  "/select-organization",
  getAuthorizationControllerFactory({
    prompt: "select_organization",
  }),
);

app.post(
  "/update-userinfo",
  getAuthorizationControllerFactory({
    prompt: "update_userinfo",
  }),
);

app.post(
  "/force-login",
  getAuthorizationControllerFactory({
    claims: { id_token: { auth_time: { essential: true } } },
    prompt: "login",
    // alternatively, you can use the 'max_age: 0'
    // if so, claims parameter is not necessary as auth_time will be returned
  }),
);

app.get(process.env.CALLBACK_URL, async (req, res, next) => {
  try {
    const client = await getMcpClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(redirectUri, params, {
      nonce: req.session.nonce,
      state: req.session.state,
    });

    req.session.nonce = null;
    req.session.state = null;
    req.session.userinfo = await client.userinfo(tokenSet.access_token);
    req.session.idtoken = tokenSet.claims();
    req.session.oauth2token = tokenSet;

    res.redirect("/");
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
