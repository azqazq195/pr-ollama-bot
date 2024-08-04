import {Context} from "probot";
import {codeReview} from "./code-review.js";
import {pullRequestSuggestion} from "./pull-request-suggestion.js";

export const handlePullRequest = async (context: Context<"pull_request">) => {
    await pullRequestSuggestion(context);
    await codeReview(context);
}