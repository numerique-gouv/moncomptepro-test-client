# MonComptePro Test Client

This is a minimal, nodeJS-based MonComptePro client, to be used for end-to-end testing.

It uses the https://github.com/panva/node-openid-client Library for the actual OIDC Logic.

This tool can be used to test the traditional Authorization Code Flow.

It also uses the `select_organization` & `update_userinfo` MonComptePro prompts.

This tool is full configured using environment variables.

## Run it with Docker

Pull the image:
```
docker pull rdubigny/moncomptepro-test-client
```

Run the container:
```
docker run -d --rm \
-p 3000:3000 \
-e PORT=3000 \
rdubigny/moncomptepro-test-client
```

## Run it with Docker Compose

In `docker-compose.yml`:
```yaml
version: '3.5'

services:
  oidc-test-client:
    image: rdubigny/moncomptepro-test-client
    ports:
      - 3000:3000
    environment:
      PORT: 3000
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

## Configuration

Available env variables and there default values are listed [here](.env).

You can use the app-test.moncomptepro.beta.gouv.fr oidc provider with the following client configuration:
```yaml
client_id: client_id
client_secret: client_secret
login_callbacks: ['http://localhost:3000/login-callback']
logout_callbacks: ['http://localhost:3000/']
authorized_scopes: openid email profile organization
```

More clients are available at: https://github.com/betagouv/moncomptepro/blob/master/scripts/fixtures.sql
