# Codex Profile Board

Local dashboard for people who keep several Codex / ChatGPT accounts on one machine and want one place to watch their remaining limits.

## What it does

- keeps every profile in its own isolated `HOME`
- starts the Codex login flow per profile
- reads current usage from ChatGPT's Codex usage backend
- shows the remaining 5-hour and weekly windows as a compact board
- lets you rename and reorder profiles locally

The app is intentionally small: no database, no framework, no external auth service.

## How it works

Each profile gets its own `.codex/auth.json` and local state under `.data/profiles/*`.

When you add an account, the board:

1. creates an isolated profile shell
2. starts `codex login`
3. shows the device code in a modal
4. opens the OpenAI auth page in a new tab
5. reads the resulting access token from that profile's auth cache
6. fetches usage from `https://chatgpt.com/backend-api/wham/usage`

This means the board tracks the same Codex usage windows that the ChatGPT web UI uses, without mixing multiple accounts together.

## Stack

- Node.js 22+
- native `http`, `fs`, `child_process`
- `playwright-core` for local smoke checks
- vanilla HTML / CSS / JS on the frontend

## Requirements

- macOS or another environment where `codex` CLI is available in `PATH`
- Node.js 22+
- an installed `codex` CLI
- a browser session that can complete OpenAI / ChatGPT login

## Quick start

```bash
npm install
npm start
```

Then open:

```text
http://127.0.0.1:43123
```

## Typical flow

1. Click `Добавить аккаунт`.
2. Copy the device code from the modal if needed.
3. Finish the login in the opened browser tab.
4. Wait for the profile card to switch to a ready state.
5. Use `Обновить` to refresh the latest usage snapshot.

## Notes

- The board uses a private ChatGPT web endpoint for usage data. If OpenAI changes that endpoint, usage refresh may stop working until the connector is updated.
- Profile removal only removes the profile from the board. The local files can remain on disk by design.
- The old local Codex sqlite metrics still exist in the backend, but they are not shown in the main UI because they are not account limits.

## Project layout

```text
public/   UI
src/      server, auth flow, usage connector, local store
.data/    local runtime data, ignored in git
```

## License

MIT
