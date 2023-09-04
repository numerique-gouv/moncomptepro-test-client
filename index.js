import "dotenv/config";
import express from "express";
import { generators, Issuer } from "openid-client";
import cookieSession from "cookie-session";

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(
  cookieSession({
    name: "mcp_session",
    keys: ["key1", "key2"],
  }),
);

const redirectUri = `http://${process.env.HOST}:${process.env.PORT}${process.env.CALLBACK_URL}`;

const getMcpClient = async () => {
  const mcpIssuer = await Issuer.discover(process.env.MCP_PROVIDER);
  console.log("Discovered issuer %s", mcpIssuer.issuer);

  return new mcpIssuer.Client({
    client_id: process.env.MCP_CLIENT_ID,
    client_secret: process.env.MCP_CLIENT_SECRET,
    redirect_uris: [redirectUri],
    response_types: ["code"], // id_token_signed_response_alg (default "RS256")
    // token_endpoint_auth_method (default "client_secret_basic")
  });
};

app.get("/", async (req, res) => {
  res.render("index");
});

app.post("/login", async (req, res) => {
  const client = await getMcpClient();
  const code_verifier = generators.codeVerifier();
  req.session.verifier = code_verifier;
  const code_challenge = generators.codeChallenge(code_verifier);

  const redirectUrl = client.authorizationUrl({
    scope: process.env.MCP_SCOPES.replaceAll(",", " "),
    code_challenge,
    code_challenge_method: "S256",
  });

  res.redirect(redirectUrl);
});

app.get("/login-callback", async (req, res) => {
  const client = await getMcpClient();
  const params = client.callbackParams(req);
  const tokenSet = await client.callback(redirectUri, params, {
    code_verifier: req.session.verifier,
  });
  console.log("received and validated tokens %j", tokenSet);
  console.log("validated ID Token claims %j", tokenSet.claims());

  const userinfo = await client.userinfo(tokenSet.access_token);
  console.log("userinfo %j", userinfo);

  res.render("index", {
    userinfo: JSON.stringify(userinfo, null, 2),
    idtoken: JSON.stringify(tokenSet.claims(), null, 2),
    oauth2token: JSON.stringify(tokenSet, null, 2),
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
