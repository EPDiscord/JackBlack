# jack black

a blackjack bot, powered by discordjs, docker, and postgres

## how to run

### env vars
in bot.env, the following things should exist:

*NOTE: var names are case sensitive!*

- `token`: the bot token
- `bot_uid`: the snowflake of the bot account
- `POSTGRES_USER`: database user
- `POSTGRES_PASSWORD`: database password

entire thing is a container image, that uses docker-compose

run using `docker compose up --build`

### config

the `config/emoji.json` contains a lookup table of all emojis needed by the bot - the emojis are all attached to the bot itself

## features

- `/balance` command - shows you your balance
- `/blackjack` command - plays blackjack
- `/daily` command - claims your daily amount, is currently at 60 (there is a constant defined at top of deck.js
- `/loan` command - borrow money
- `/stats` command - server admin only, shows you the server's statistics gathered
- `/transfer` command - transfer money between users
