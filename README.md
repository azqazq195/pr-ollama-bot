# pr-conductor

> A GitHub App built with [Probot](https://github.com/probot/probot) that Pull Requeset Conductor GitHub App built with Proto.

## Setup

```sh
# Install dependencies
npm install

# Build Typescript
npm run build

# Run the bot
npm run start
```

## Docker

```sh
# 1. Build container
docker build -t pr-ollama-bot .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> pr-ollama-bot
```

## Contributing

If you have suggestions for how pr-conductor could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2024 seongha.moon
