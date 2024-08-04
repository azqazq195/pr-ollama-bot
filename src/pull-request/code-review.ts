import {Context} from "probot";
import {ollama} from "../utils/ollama.js";

export const codeReview = async (context: Context<"pull_request">): Promise<void> => {
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
        name: "Reviewing Pull Request with Ollam",
        head_sha: pull_request.head.sha,
        status: "in_progress",
        started_at: new Date().toISOString(),
        output: {
            title: "Pull Request Review",
            summary: "Running pull request reviewing...",
        },
    });

    const data = await context.octokit.repos.compareCommits({
        owner: repository.owner.login,
        repo: repository.name,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
    });

    let {files: changedFiles, commits} = data.data;

    if (context.payload.action === 'synchronize' && commits.length >= 2) {
        const {
            data: {files},
        } = await context.octokit.repos.compareCommits({
            owner: repository.owner.login,
            repo: repository.name,
            base: commits[commits.length - 2].sha,
            head: commits[commits.length - 1].sha,
        });

        const ignoreList = (process.env.IGNORE || process.env.ignore || '')
            .split('\n')
            .filter((v) => v !== '');

        const filesNames = files?.map((file) => file.filename) || [];
        changedFiles = changedFiles?.filter(
            (file) =>
                filesNames.includes(file.filename) &&
                !ignoreList.includes(file.filename)
        );
    }

    if (!changedFiles?.length) {
        console.log('no change found');
    } else {
        for (let i = 0; i < changedFiles.length; i++) {
            const file = changedFiles[i];
            const patch = file.patch || '';

            if (file.status !== 'modified' && file.status !== 'added') {
                continue;
            }

            if (!patch || patch.length > 10000) { // patch.length 알아보고 지우기
                console.log(
                    `${file.filename} skipped caused by its diff is too large`
                );
                continue;
            }
            try {
                const fileExtension = file.filename.split(".").pop();
                const res = await ollama.chat('code_review', {
                    patch: patch,
                    fileExtension: fileExtension,
                });

                if (res) {
                    await context.octokit.pulls.createReviewComment({
                        owner: repository.owner.login,
                        repo: repository.name,
                        pull_number: context.pullRequest().pull_number,
                        commit_id: commits[commits.length - 1].sha,
                        path: file.filename,
                        body: res,
                        position: patch.split('\n').length - 1,
                    });
                }
            } catch (e) {
                console.error(`review ${file.filename} failed`, e);
            }
        }
    }

    await context.octokit.checks.update({
        owner: repository.owner.login,
        repo: repository.name,
        check_run_id: check.data.id,
        status: "completed",
        conclusion: "success",
        completed_at: new Date().toISOString(),
        output: {
            title: "Pull Request Review",
            summary: "Code review finished"
        },
    });

    return;
}