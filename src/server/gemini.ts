import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

export async function suggestTaskPriority(title: string, description: string): Promise<{
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
}> {
  const client = getAiClient();
  if (!client) {
    // High-fidelity local fallback engine in case API key is missing
    const lowKeywords = ['doc', 'documentation', 'minor', 'color', 'cleanup', 'optional', 'placeholder'];
    const highKeywords = ['critical', 'crash', 'security', 'auth', 'database', 'payment', 'login', 'broken', 'breach', 'audit', 'leak'];
    
    let priority: 'low' | 'medium' | 'high' = 'medium';
    let reasoning = 'Analysis performed by TaskFlow Local Heuristic model: The task is of standard development priority.';

    const textToAnalyze = `${title} ${description}`.toLowerCase();
    
    if (highKeywords.some(kw => textToAnalyze.includes(kw))) {
      priority = 'high';
      reasoning = `TaskFlow Local Heuristic model detected core security, authentication, or critical database keywords. Recommended priority elevated to High to prevent deployment blocks.`;
    } else if (lowKeywords.some(kw => textToAnalyze.includes(kw))) {
      priority = 'low';
      reasoning = `TaskFlow Local Heuristic model classified this as a refinement task (documentation or styling cleanup). Recommended priority lowered to Low.`;
    }
    
    return { priority, reasoning };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
You are an expert agile scrum master and technical product manager.
Analyze this software task and recommend a priority level: 'low', 'medium', or 'high'.
Provide a concise, professional 2-sentence explanation of your recommendation.

Task Title: "${title}"
Task Description: "${description}"

Return ONLY a valid JSON object matching this schema (do not wrap in markdown code blocks, just raw JSON):
{
  "priority": "low" | "medium" | "high",
  "reasoning": "string explanation"
}
      `,
    });

    const responseText = response.text || '';
    // Clean potential markdown wrappers
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedText);
    
    if (result && (result.priority === 'low' || result.priority === 'medium' || result.priority === 'high') && typeof result.reasoning === 'string') {
      return result;
    }
    throw new Error('Invalid Gemini output structure');
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    return {
      priority: 'medium',
      reasoning: 'AI Suggestion failed or was rate-limited. Defaulted to standard Medium priority.',
    };
  }
}

export async function generateProjectSummary(projectName: string, description: string, tasks: any[], activities: any[]): Promise<string> {
  const client = getAiClient();
  if (!client) {
    // High-fidelity fallback project summary
    const completedCount = tasks.filter(t => t.columnId && t.columnId.toLowerCase().includes('completed')).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return `### Project Health Report (Local Static Engine)
The **${projectName}** project is currently running with **${progress}% completion** (${completedCount}/${totalCount} tasks completed).

**Executive Summary:**
- Major active work focuses on high-priority development pipelines.
- Recent activities include task progression and board updates. 
- Recommendation: Ensure team assignments are balanced to prevent key-person bottlenecks. Configure your Gemini API key in AI Studio to get highly detailed context-specific executive reports.`;
  }

  try {
    const taskDetails = tasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (${t.subtasks?.length || 0} subtasks)`).join('\n');
    const activityDetails = activities.slice(0, 5).map(a => `- ${a.userName} did: ${a.details} (${new Date(a.createdAt).toLocaleDateString()})`).join('\n');

    const prompt = `
You are an elite enterprise agile coach and technical coordinator.
Generate an executive summary and health status report for the following software project.

Project Name: "${projectName}"
Project Description: "${description}"

Tasks list:
${taskDetails || 'No tasks defined yet.'}

Recent Activity logs:
${activityDetails || 'No recent activity.'}

Structure the response nicely using clean Markdown headers, bullet points, and high-density business-centric feedback.
Outline:
1. Executive Summary & Health Index (Excellent/On-track/At-risk)
2. Bottlenecks & Critical Path Risks
3. Recommended Action Items for Team Leaders
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Unable to generate report content at this time.';
  } catch (error) {
    console.error('Gemini Summary Error:', error);
    return `### Executive Project Summary (Fallback)
Unable to fetch real-time AI summary due to Gemini quota limits or network timeout. Please ensure your project is properly configured. Current status: ${tasks.length} total tasks with ${tasks.filter(t => t.priority === 'high').length} high-priority bottlenecks.`;
  }
}

export interface GroundingResult {
  answer: string;
  queries: string[];
  sources: Array<{ title: string; uri: string }>;
}

export async function researchTaskWithWeb(title: string, description: string): Promise<GroundingResult> {
  const client = getAiClient();
  if (!client) {
    return {
      answer: `### 🌐 Local Task Guide: "${title}"\n*(Note: Configure your Gemini API Key in the AI Studio settings to enable real-time Google Search grounding!)*\n\nBased on your task title, here is a general development guide:\n1. **Technical Setup**: Verify environment configuration and libraries.\n2. **Best Practices**: Use modular component files, strong typing with TypeScript, and proper state structures.\n3. **Validation**: Test boundary conditions and verify cross-browser compatibility.`,
      queries: [`best practices for ${title}`],
      sources: [
        { title: 'Local Development Guild Guide', uri: 'https://taskflow.pro/developer/docs' }
      ]
    };
  }

  try {
    const prompt = `
You are an elite principal engineer and agile coach.
Do real-time Google Search research and construct a crisp, implementation-focused Developer's Guide for this task:

Task Title: "${title}"
Task Description: "${description || 'No description provided'}"

Use the googleSearch tool to gather the latest technical guidelines, relevant libraries/packages, and security best practices.
Format your answer elegantly in Markdown. Include headers, bullet points, and code blocks where helpful.
At the end of your response, add a "💡 Quick Implementation Steps" checklist.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const queries = groundingMetadata?.webSearchQueries || [];
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Web Search Source',
      uri: chunk.web?.uri || ''
    })).filter((src: any) => src.uri) || [];

    return {
      answer: response.text || 'No response returned from Gemini.',
      queries,
      sources
    };
  } catch (error: any) {
    console.error('Gemini Task Grounded Research Error:', error);
    return {
      answer: `### ⚠️ Grounded Search Interrupted\nFailed to fetch web research: ${error.message || error}`,
      queries: [],
      sources: []
    };
  }
}

export async function researchGeneralWithWeb(query: string): Promise<GroundingResult> {
  const client = getAiClient();
  if (!client) {
    return {
      answer: `### 🌐 Grounded Query Response\n*(Note: Configure your Gemini API Key to enable real-time Google Search Grounding!)*\n\nYou asked: "${query}". Please configure the Gemini API key in AI Studio to run real web searches.`,
      queries: [query],
      sources: []
    };
  }

  try {
    const prompt = `
You are a senior agile consultant and tech research lead.
Perform web research using Google Search to answer this question comprehensively:
"${query}"

Use the googleSearch tool to locate the most up-to-date documentation, release notes, and community benchmarks.
Format the output in clean, scannable Markdown with headers, bullet points, and citations.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const queries = groundingMetadata?.webSearchQueries || [];
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Web Search Source',
      uri: chunk.web?.uri || ''
    })).filter((src: any) => src.uri) || [];

    return {
      answer: response.text || 'No response returned from Gemini.',
      queries,
      sources
    };
  } catch (error: any) {
    console.error('Gemini General Grounded Research Error:', error);
    return {
      answer: `### ⚠️ Grounded Search Interrupted\nFailed to complete research: ${error.message || error}`,
      queries: [],
      sources: []
    };
  }
}
