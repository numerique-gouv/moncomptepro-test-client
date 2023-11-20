# MonComptePro Test Client

This is a minimal, nodeJS-based MonComptePro client, to be used for end-to-end testing.

It uses the https://github.com/panva/node-openid-client Library for the actual OIDC Logic.

This tool can be used to test the traditional Authorization Code Flow.

It also tests the `select_organization` MonComptePro prompt.

This tool is full configured using environment variables.

## Configuration

Available env variables and there default values are listed [here](.env).

## Run it with Docker

Pull the image:
```
docker pull ghcr.io/rdubigny/moncomptepro-test-client
```

Run the container:
```
docker run -d --rm \
-p 9009:9009 \
-e MCP_CLIENT_ID=test-id \
-e MCP_CLIENT_SECRET=test-secret \
-e MCP_PROVIDER: https://app-test.moncomptepro.beta.gouv.fr... \
ghcr.io/rdubigny/moncomptepro-test-client
```

## Run it with Docker Compose

In `docker-compose.yml`:
```yaml
version: '3.5'

services:
  oidc-test-client:
    image: rdubigny/moncomptepro-test-client # ghcr.io/beryju/oidc-test-client
    ports:
      - 9009:9009
    environment:
      SITE_TITLE: Mon site
      STYLESHEET_URL: https://unpkg.com/axist@latest/dist/axist.min.css
      PORT: 9009
      MCP_CLIENT_ID: test-id
      MCP_CLIENT_SECRET: test-secret
      MCP_PROVIDER: https://app-test.moncomptepro.beta.gouv.fr
      MCP_SCOPES: openid email organization
      CALLBACK_URL: /auth/callback
```

Run the container:
```
docker-compose up
```

## Run it with Node.js v16 or higher

Install the dependencies:
```
npm i
```

Run the server:
```
npm start
```
