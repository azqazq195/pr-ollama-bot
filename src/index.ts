import {Probot} from "probot";
import {handlePullRequest} from "./pull-request/index.js";

export default (app: Probot) => {
    app.onAny(async (context) => {
        app.log.info({event: context.name});
    });

    app.on("pull_request", handlePullRequest)
};