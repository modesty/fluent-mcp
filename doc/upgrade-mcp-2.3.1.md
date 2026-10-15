# MCP SDK 2.3.1 upgrade

Date: 2026-10-14

`@modelcontextprotocol/server` is pinned to **2.3.1**, with its exact runtime dependency `@modelcontextprotocol/core@2.3.1` recorded in `package-lock.json`. npm's public registry reports 2.3.1 as the latest server release at the time of this upgrade. The lockfile contains the published tarball URLs, integrity hashes, and Apache-2.0 license metadata for both packages. No other dependency version changes.

The existing production integration already satisfies the updated APIs. Both MCP revisions (2026-07-28 and 2025-11-25), the 17 tools, prompts, resources, input/output schemas, cache hints, progress, lazy ServiceNow authentication, working-directory resolution, and process cancellation retain their existing contracts. The upstream stdio EOF fix now closes disconnected connections and cancels their work.

## Release and API review

Reviewed every release between 2.0.0 and 2.3.1 against the published declarations and implementation. Sources: the pinned official [server changelog](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/packages/server/CHANGELOG.md), [core changelog](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/packages/core/CHANGELOG.md), and [2.3.1 release](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.1).

| Release | Changed or added API / behavior | Fluent MCP decision |
| --- | --- | --- |
| 2.1.0 | `StdioServerTransport` closes on stdin EOF/close, fires `onclose` once, aborts in-flight handlers, and suppresses their responses. | Keep stdin open while awaiting responses. Added real-stream tests with a live CLI child for both protocol eras. |
| 2.1.0 | Cancellation recognizes JSON-RPC IDs `0` and `''`; initialize cancellation notifications are suppressed. | Added child-process cancellation coverage for ID `0` alongside ID `1` in both eras. |
| 2.1.0 | Added `ScopeChallenge`, `ScopeChallengeHandler`, `requireScopes`, primitive `scopeChallenge` callbacks, and `AuthInfo.resourceMetadataUrl`. | These serve MCP HTTP OAuth. ServiceNow CLI authentication remains separate and unchanged. |
| 2.1.0 | Added `DEFAULT_MAX_REQUEST_BODY_SIZE`, `readRequestBody`, `IsLegacyRequestOptions`, `LegacyStatelessFallbackOptions`, and HTTP `maxRequestBodySize`; SDK-owned HTTP reads default to 4 MiB and batches are capped at 100. Required HTTP headers are enforced more strictly. | Stdio-only server; no HTTP transport or adapter to migrate. Stdio's existing 10 MB buffer bound is unchanged. |
| 2.1.0 | `SdkError` / `SdkHttpError` accept standard `ErrorOptions` as a fourth constructor argument. Core adds DPoP client APIs (`DpopSession`, `generateDpopKeyPair`, `accessTokenHash`, `isDpopNonceChallenge`, `withDpop`, `withDpopFromProvider`) and OAuth schema/error support. | No SDK error wrapping or MCP OAuth client implementation to migrate. |
| 2.2.0 | Fixed notification rejection handling on closed connections, HTTP factory reuse behavior, and completion of subscriptions honoring no notification types. | Retain best-effort progress notification handling and a fresh server per factory invocation. |
| 2.3.0 | A server permits one active connection; concurrent `connect()` reuse fails with `ALREADY_CONNECTED`. Stateless HTTP transports permit one request. | Existing `serveStdio(() => this.buildServer(), { legacy: 'serve' })` already creates fresh registered instances. Added real discovery-probe → legacy-handshake coverage. |
| 2.3.0 | Added `McpServerOptions.maxToolInputElements`, disabled by default. | Leave unset to preserve accepted tool inputs. |
| 2.3.0 | Added `VerifyBearerTokenOptions.expectedResource` for token audience checking and browser-extension origin scheme wildcards. | HTTP-only functionality; no new options or dependencies needed. |
| 2.3.0 | Tool schema conversion is lazy; omitted optional prompt arguments validate as `{}`; no-schema `registerPrompt` callback typing is corrected. | Retain canonical registry-backed `tools/list`, strict Zod schemas, concrete output schemas, and custom prompt handlers. Verify schema parity and successful execution across both eras. |
| 2.3.0 | Explicit-schema Tasks `tasks/get` / `tasks/cancel` handlers can run on modern connections. | No Tasks extension is advertised or implemented. |
| 2.3.0 | Package license metadata changes to Apache-2.0; the shipped license retains earlier MIT contribution terms. | Lockfile metadata updated by npm. This project's own license is unchanged. |
| 2.3.1 | Server updates its core dependency to 2.3.1; release also updates npm documentation and adds optional audience checking to the separate legacy package. | Install server and transitive core 2.3.1; do not add `server-legacy` (dual-era stdio remains supplied by `server`). |

## Deprecations

- Since 2.1.0, read standard `error.cause` instead of deprecated `error.data.cause`. No deprecated-slot usage exists in this repository.
- Since core 2.2.0, constructing `ClientCredentialsProvider`, `PrivateKeyJwtProvider`, `StaticPrivateKeyJwtProvider`, or `CrossAppAccessProvider` without `expectedIssuer` is deprecated. None is used here.
- No removed or newly deprecated API is used by the current server. Roots, Sampling, Elicitation, and MCP Logging remain unused; existing capabilities and cache hints stay intact.

## Verification

Local validation uses Node 22.23.3 and npm 12.2.0 on macOS. The existing 910 tests passed immediately after installation. Seven additional tests cover ID-zero cancellation, discovery fallback, and real stdio lifecycle behavior; tool schema parity assertions were also strengthened.

| Check | Result |
| --- | --- |
| Public-registry `npm ci` in a disposable project copy | Passed; manifest and lockfile hashes match this checkout. |
| `npm test`, working tree and clean install | Initial upgrade: 917 tests passed in both runs. Inspector follow-up: final working-tree suite and coverage run pass 918 tests with zero failures, cancellations, or skips. |
| `npm run test:coverage` | Final Inspector follow-up: 918 tests passed; 92.04% line coverage across loaded source files. |
| `npm run typecheck`, `npm run typecheck:test`, `npm run lint` | Passed. |
| `npm run build:dev`, `npm run build` | Passed. |
| `npm run validate:specs` | 75/75 clean; ATF parent index check passed. |
| `npm run validate:instructs` | 75/75 clean; zero unresolved tokens. |
| `npm run validate:snippets` | Original full run: 100 compiled, 72 expected failures, 10 blank UiAction snippets skipped. Inspector follow-up repaired and revalidated all ten changed snippets: 10/10 compile with zero skips. Combined coverage of all 182 is now 110 compiled and 72 existing expected failures; no unexpected failures. |
| Built production stdio smoke, both eras | All 17 tools, two prompts, 224 resources, empty templates, cache hints, structured content, real SDK 4.13.6 execution, Table explain, error responses, and clean EOF exit verified. |
| `npm run bundle` and extracted MCPB smoke | Clean production dependency install and manifest validation passed. Both protocol-era smoke checks passed from the extracted bundle; server/core are 2.3.1. |
| npm package / MCPB content inspection | No test, coverage, staging, or temporary npm configuration files shipped. |
| Installed dependency tree and lockfile | `npm ls --all` passed; server/core versions, tarball URLs, and integrity hashes match the installed lockfile. |

The real-wire tests also preserve all six modern cache hints, legacy responses without cache fields, strict tool input validation, and the absence of server-initiated requests. The stdio lifecycle tests abort an actual hanging CLI child after EOF and verify a single transport close and no response to the abandoned request. Existing positive-ID cancellation tests remain alongside ID-zero coverage.

Validation is local; hosted CI and a live ServiceNow instance deployment were not exercised. Historical 2.0.0 release and migration evidence remains unchanged. Current README and local AGENTS guidance reflect 2.3.1.


## Live MCP Inspector follow-up

Ran `npm run build && npm run inspect` and connected Inspector 2.10.0 to the built `dist/index.js`. The browser UI negotiated MCP 2025-11-25. All 17 tool parameter forms rendered without browser console errors. UI checks executed `sdk_info`, rendered resources, and retrieved both prompts, including a customized `coding_in_fluent` prompt.

An exhaustive sweep used the running Inspector's `/api/mcp/connect`, `/api/mcp/send`, and event-stream transport, with an isolated session of the same built server. This exercised the actual Inspector transport, rather than substituting a direct stdio test client.

- Read all **224 listed resources**, checking non-empty Markdown and MIME types; the template list is empty.
- Verified **332 resource-tool content paths**: 75 API specifications, 75 instructions, and all 182 snippet IDs advertised by the tools.
- Retrieved both prompts and customized `coding_in_fluent` with `table,business-rule,atf`.
- Checked strict tool argument rejection, missing-resource errors, missing-prompt errors, and real command progress notifications.
- Ran local build → pack → offline XML transform → rebuild → clean using disposable projects. The transform consumed SDK-generated property XML and produced a real `Property()` declaration in the second project. Clean left the output directory empty.

| Tool | Live result |
| --- | --- |
| `sdk_info` | Executed bundled CLI; SDK 4.13.6. |
| `explain_fluent_api` | Retrieved exact `property-api` documentation. |
| `get-api-spec`, `get-instruct`, `get-snippet` | Listings and all advertised content paths passed. |
| `check_auth_status` | Returned `skipped` because no instance URL is configured. |
| `init_fluent_app` | Returned the manual initialization command and set the disposable session directory. |
| `build_fluent_app`, `pack_fluent_app`, `clean_fluent_app` | Actual local SDK operations passed. |
| `fluent_transform` | Actual offline transform and subsequent build passed. |
| `download_fluent_dependencies` | Returned the manual dependency command; no instance download was executed. |
| `deploy_fluent_app` | Rejected the filesystem root as a working directory before spawning. |
| `download_fluent_app` | Rejected a zero timeout before authentication or execution. |
| `query_fluent_records` | Rejected an empty encoded query. |
| `cicd_fluent_app` | Rejected rollback without the required version. |
| `cicd_fluent_test` | Rejected a result read without the required result ID. |

The sweep found ten previously blank UI Action snippets: the default resource and nine additional IDs advertised by `get-snippet`. All ten now contain SDK-build-validated examples. A regression follows every advertised UI Action ID through the resource and tool paths; its negative control failed against a blank alternate snippet. Final tests pass **918/918**, all ten changed snippets compile, and the rebuilt MCPB contains the corrected content.

The Inspector guide and README now match the tested UI and protocol surface. Prompts are accessed by `prompts/list` / `prompts/get`; `sn-prompt://` is not a supported resource URI. The five instance-facing tools above were tested through validation guards only. Successful instance deployment, metadata download, record queries, app CI/CD, and ATF execution remain unverified without a configured instance.
