//

import { html } from "hono/html";
import { readFile } from "node:fs/promises";
import type { IdTokenClaims, TokenSet } from "openid-client";

//

const critical_css = await readFile(import.meta.resolveSync("./critical.css"));

//

export function Index(locals: {
  title: string;
  stylesheet_url: string;
  userinfo: string;
  idtoken: IdTokenClaims;
  oauth2token: TokenSet;
}) {
  const user_info = locals.userinfo
    ? html`<h2>Information utilisateur</h2>
        <pre><code>${JSON.stringify(locals.userinfo, null, 2)}</code></pre>`
    : "";
  const idtoken = locals.idtoken
    ? html`<h2>ID Token</h2>
        <pre><code>${JSON.stringify(locals.idtoken, null, 2)}</code></pre>`
    : "";
  const oauth2token = locals.oauth2token
    ? html`<h2>OAuth2 Token</h2>
        <pre><code>${JSON.stringify(locals.oauth2token, null, 2)}</code></pre>`
    : "";

  return html`<!doctype html>
    <html lang="fr-FR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>${locals.title}</title>
        <style>
          ${critical_css}
        </style>
        <link rel="stylesheet" href="${locals.stylesheet_url}" />
      </head>
      <body>
        <h1>${locals.title}</h1>
        <h2>Se connecter</h2>
        <div>
          <form action="/login" method="post">
            <button id="login" class="moncomptepro-button"></button>
          </form>
          <p>
            <a
              href="https://moncomptepro.beta.gouv.fr/"
              target="_blank"
              rel="noopener noreferrer"
              title="Qu’est-ce que MonComptePro ? - nouvelle fenêtre"
            >
              Qu’est-ce que MonComptePro ?
            </a>
          </p>
        </div>
        ${user_info} ${idtoken} ${oauth2token}
        <h2>Interactions</h2>
        <form action="/logout" method="post">
          <button id="logout">Se déconnecter</button>
        </form>
        <br />
        <form action="/select-organization" method="post">
          <button id="select-organization">Changer d’organisation</button>
        </form>
        <br />
        <form action="/update-userinfo" method="post">
          <button id="update-userinfo">Mettre à jour mes informations</button>
        </form>
        <br />
        <form action="/force-login" method="post">
          <button id="force-login">Forcer une reconnexion</button>
        </form>
        <br />
        <footer>
          <p>
            Source:
            <a href="https://github.com/betagouv/moncomptepro-test-client"
              >github.com/betagouv/moncomptepro-test-client</a
            >
          </p>
        </footer>
      </body>
    </html>`;
}
