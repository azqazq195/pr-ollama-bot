import { Context } from "probot";

export const handleIssueOpened = async (context: Context<"issues.opened">) => {
    context.log.info("Issues opened");
    const issueComment = context.issue({
        body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
};