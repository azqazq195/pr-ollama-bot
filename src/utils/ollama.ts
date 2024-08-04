import axios from "axios";

interface CodeReviewProps {
    patch: string,
    fileExtension: string | undefined
}

interface PullRequestSuggestionProps {
    commitMessages: string[],
}

class Ollama {
    private readonly baseUrl: string;
    private readonly model: string;

    constructor(baseUrl: string, model: string = 'llama3.1:8b') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async chat(
        type: 'code_review' | 'pull_request_suggestion',
        props: CodeReviewProps | PullRequestSuggestionProps
    ): Promise<string> {
        let prompt;
        switch (type) {
            case 'code_review':
                prompt = this.getCodeReviewPrompt(<CodeReviewProps>props);
                break;
            case "pull_request_suggestion":
                prompt = this.getPullRequestSuggestionProps(<PullRequestSuggestionProps>props)
                break;
            default:
                throw new Error(`Unsupported type "${type}"`);
        }

        const requestBody = {
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                    options: {
                        temperature: 0.1,
                        top_k: 10,
                        top_p: 0.1
                    }
                }
            ],
            stream: false
        };

        const response = await axios.post(`${this.baseUrl}/api/chat`, requestBody);
        const content = response.data?.message?.content?.trim();

        if (!content) {
            throw new Error('Received empty response from Ollama.');
        }

        return content;
    }

    getCodeReviewPrompt(props: CodeReviewProps) {
        const language = this.getLanguage(props.fileExtension);

        return `
            You are a code review assistant. Your task is to critically review the provided code. Focus on identifying issues, providing constructive feedback, and suggesting improvements. 
            
            Key points to consider:
            1. How can I improve the error handling in my ${language} code?
            2. I'm working on a ${language} project and I need you to review my code and suggest improvements.
            
            Provide your feedback in Korean and format the response in Markdown.
            
            Code is here.
            ======================
            
            ${props.patch}
            `
    }

    getPullRequestSuggestionProps(props: PullRequestSuggestionProps) {
        const commitMessages = props.commitMessages.join("\n");
        return `
            You are an assistant that summarizes Pull Requests. Your task is to analyze the provided commit messages and suggest a comprehensive summary of the changes made in this pull request.

            Key points to cover:
            1. List all new features introduced in the changes.
            2. List all refactor applied, including refactoring code and improvements.
            3. List any bug reports or issues mentioned.

            Provide the summary in Korean and format the response in Markdown.
            
            Commit messages is here.
            ======================
            ${commitMessages}
        `;
    }

    getLanguage(fileExtension: string | undefined): string {
        if (!fileExtension) {
            return 'UnKnown';
        }

        switch (fileExtension) {
            case 'js':
            case 'jsx':
                return 'JavaScript';
            case 'ts':
            case 'tsx':
                return 'TypeScript';
            case 'py':
                return 'Python';
            case 'java':
                return 'Java';
            case 'cpp':
            case 'cc':
            case 'cxx':
            case 'c':
                return 'C++';
            case 'cs':
                return 'C#';
            case 'rb':
                return 'Ruby';
            case 'php':
                return 'PHP';
            case 'html':
            case 'htm':
                return 'HTML';
            case 'css':
                return 'CSS';
            // Add more extensions as needed
            default:
                return 'Unknown';
        }
    }
}

export const ollama = new Ollama('http://localhost:11434');

