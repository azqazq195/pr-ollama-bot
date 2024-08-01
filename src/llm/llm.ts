import axios from "axios";

export default class Ollama {
    private readonly baseUrl: string;
    private readonly model: string;

    constructor(baseUrl: string, model: string = 'llama3.1:8b') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    /**
     * codeReview 함수는 제공된 코드 패치를 분석하고 리뷰 결과를 반환합니다.
     * @param patch - 코드의 변경 사항을 포함하는 문자열
     * @returns 리뷰 결과를 설명하는 문자열
     */
    async codeReview(patch: string): Promise<string> {
        const requestBody = {
            model: this.model,
            messages: [
                { role: 'user', content: patch }
            ],
            stream: false
        };

        try {
            const response = await axios.post(`${this.baseUrl}/api/chat`, requestBody);
            return response.data?.choices?.[0]?.message?.content?.trim() || 'No response';
        } catch (error) {
            console.error('Error during code review:', error);
            throw new Error('Failed to perform code review');
        }
    }
}
