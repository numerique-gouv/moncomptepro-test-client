# Publishing docker image

```
docker build -t betagouv/moncomptepro-test-client .
```

Authenticate to the github docker registery:

https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-with-a-personal-access-token-classic

Then

```
docker push ghcr.io/betagouv/moncomptepro-test-client
```
