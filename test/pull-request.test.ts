import nock from "nock";
import myProbotApp from "../src/index.js";
import {Probot, ProbotOctokit} from "probot";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {describe, beforeEach, afterEach, test, expect} from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const payload = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "fixtures/pull-request.opened.json"),
        "utf-8",
    ),
);

const deployment = {
    ref: "hiimbex-patch-1",
    task: "deploy",
    auto_merge: true,
    required_contexts: [],
    payload: {
        schema: "rocks!",
    },
    environment: "production",
    description: "My Probot App's first deploy!",
    transient_environment: false,
    production_environment: true,
};

const deploymentStatus = {
    state: "success",
    log_url: "https://example.com",
    description: "My Probot App set a deployment status!",
    environment_url: "https://example.com",
    auto_inactive: true,
};

const privateKey = fs.readFileSync(
    path.join(__dirname, "fixtures/mock-cert.pem"),
    "utf-8",
);

describe("My Probot app", () => {
    let probot: any;

    beforeEach(() => {
        nock.disableNetConnect();
        probot = new Probot({
            appId: 123,
            privateKey,
            // disable request throttling and retries for testing
            Octokit: ProbotOctokit.defaults({
                retry: {enabled: false},
                throttle: {enabled: false},
            }),
        });
        // Load our app into probot
        probot.load(myProbotApp);
    });

    test("creates a deployment and a deployment status", async () => {
        const mock = nock("https://api.github.com")
            // Test that we correctly return a test token
            .post("/app/installations/2/access_tokens")
            .reply(200, {
                token: "test",
                permissions: {
                    deployments: "write",
                    pull_requests: "read",
                },
            })

            // Test that a deployment is created
            .post("/repos/hiimbex/testing-things/deployments", (body) => {
                expect(body).toStrictEqual(deployment)
                return true;
            })
            .reply(200, {id: 123})

            // Test that a deployment status is created
            .post(
                "/repos/hiimbex/testing-things/deployments/123/statuses",
                (body) => {
                    expect(body).toStrictEqual(deploymentStatus)
                    return true;
                },
            )
            .reply(200);

        // Receive a webhook event
        await probot.receive({name: "pull_request", payload});

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
