import {Context} from "probot";

export const handlePullRequestOpened = async (context: Context<"pull_request.opened">) => {
    const {repository, pull_request} = context.payload;

    await context.octokit.checks.create({
        owner: repository.owner.login,
        repo: repository.name,
        name: "PR Quality Check",
        head_sha: pull_request.head.sha,
        status: "completed",
        conclusion: "success",
        started_at: new Date().toISOString(),
        output: {
            title: "PR Quality Check",
            summary: "Running quality checks on the pull request...",
            text: "Detailed report will be available upon completion.",
        },
    });

    // Create a check run
    const check = await context.octokit.checks.create({
        owner: repository.owner.login,
        repo: repository.name,
        name: "PR Quality Check",
        head_sha: pull_request.head.sha,
        status: "in_progress",
        started_at: new Date().toISOString(),
        output: {
            title: "PR Quality Check",
            summary: "Running quality checks on the pull request...",
            text: "Detailed report will be available upon completion.",
        },
    });

    // Simulate some check process
    setTimeout(async () => {
        // Complete the check run
        await context.octokit.checks.update({
            owner: repository.owner.login,
            repo: repository.name,
            check_run_id: check.data.id,
            status: "completed",
            conclusion: "failure",
            completed_at: new Date().toISOString(),
            output: {
                title: "PR Quality Check",
                summary: "The PR passed all quality checks!",
                text: "No issues were found during the code quality check.",
                annotations: [
                    {
                        path: "src/main.js",
                        start_line: 10,
                        end_line: 10,
                        annotation_level: "warning",
                        message: "Line 10 has a potential issue.",
                        title: "Potential Issue",
                        raw_details: "The variable 'x' is not used."
                    }
                ]
            },
        });
    }, 1); // Simulate a 5-second check process

};

export const handlePullRequestSynchronize = async (context: Context<"pull_request.synchronize">) => {
    const {repository, pull_request} = context.payload;

    const chat = await loadChat(context);

    if (!chat) {
        console.log('Chat initialized failed');
        return 'no chat';
    }

    if (
        pull_request.state === 'closed' ||
        pull_request.locked
    ) {
        console.log('invalid event payload');
        return 'invalid event payload';
    }

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
        return 'no change';
    }

    console.time('gpt cost');

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
            const res = await chat?.codeReview(patch);

            if (!!res) {
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

    return 'success';
}
