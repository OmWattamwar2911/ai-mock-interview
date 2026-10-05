# @rehearse/compiler

Fastify sandbox service backed by Judge0. It exposes single-input execution and
normalised multi-test execution for assessment and technical interview code.

Health: `GET /health`

Internal requests require `x-internal-key`.

`POST /v1/execute` runs one program with custom stdin. `POST /v1/run-tests`
runs a bounded test set and returns `ACCEPTED`, `WRONG_ANSWER`, `COMPILE_ERROR`,
`RUNTIME_ERROR`, `TIME_LIMIT`, or `MEMORY_LIMIT`.
