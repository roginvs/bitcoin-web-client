# Bitcoin web wallet

This is a simple bitcoin wallet which uses third-party web service to fetch unspend endpoints and to push signed transaction. All cryptography is happening on the browser side.

It is just a proof-of-concept and a playground for me to implement crypto on my own.

LOTS of crypto code is copied from this repo https://github.com/roginvs/bitcoin-scan so all unit tests are there

## Where is typescript?

This project is using plain javascript modules with type annonation. You can run typecheck via `npx --package typescript tsc`
