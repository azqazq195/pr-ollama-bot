import { Probot } from "probot";
import {handleIssueOpened} from "./handlers/issues.js";
import {handlePullRequestOpened} from "./handlers/pullRequest.js";

export default (app: Probot) => {
    app.onAny(async (context) => {
        app.log.info({ event: context.name, action: context.payload });
    });

    app.on("issues.opened", handleIssueOpened);
    app.on("pull_request.opened", handlePullRequestOpened);
};