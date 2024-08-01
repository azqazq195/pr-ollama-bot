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

