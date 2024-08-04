import {Context} from "probot";
import {ollama} from "../utils/ollama.js";

export const pullRequestSuggestion = async (context: Context<"pull_request">): Promise<void> => {
    switch (context.payload.action) {
        case "opened":
        case "synchronize":
            break;
        default:
            return;
    }

    const {repository, pull_request} = context.payload;

    if (
        pull_request.state === 'closed' ||
        pull_request.locked
    ) {
        console.log('invalid event payload');
        return;
    }

    // Create an initial check run
    const check = await context.octokit.checks.create({
        owner: repository.owner.login,
        repo: repository.name,
        name: "Suggesting Pull Request Body with Ollama",
        head_sha: pull_request.head.sha,
        status: "in_progress",
        started_at: new Date().toISOString(),
        output: {
            title: "Pull Request Body Suggestion",
            summary: "Running suggest pull request body from commit messages...",
        },
    });

    const data = await context.octokit.repos.compareCommits({
        owner: repository.owner.login,
        repo: repository.name,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
    });

    const commits = data.data.commits;
    let commitMessages: string[] = [];
    commits.forEach((commit) => {
        commitMessages.push(commit.commit.message);
    });

    if (commitMessages.length == 0) {
        console.log("there is no commit message")
        return;
    }

    try {
        const res = await ollama.chat('pull_request_suggestion', {
            commitMessages: commitMessages,
        })

        if (res) {
            await context.octokit.issues.createComment({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: context.pullRequest().pull_number,
                body: res,
            })
        }
    } catch (e) {
        console.error(`pull request body suggestion failed`, e);
    }

    await context.octokit.checks.update({
        owner: repository.owner.login,
        repo: repository.name,
        check_run_id: check.data.id,
        status: "completed",
        conclusion: "success",
        completed_at: new Date().toISOString(),
        output: {
            title: "Pull Request Body Suggestion",
            summary: "Suggest pull request body finished",
        },
    });
}