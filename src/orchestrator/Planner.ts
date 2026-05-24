import { OpenAI } from 'openai';
import { TestPlan, TestStep } from '../types';
import { SecretManager } from '../security/SecretManager';

/**
 * TestPlanner is responsible for converting natural language test descriptions
 * into a structured, executable TestPlan (Directed Acyclic Graph).
 */
export class TestPlanner {
  private openai?: OpenAI;
  private secretManager: SecretManager;

  constructor() {
    this.secretManager = new SecretManager();
  }

  /**
   * Initializes the OpenAI client if the API key is available.
   */
  private async initOpenAI(): Promise<boolean> {
    if (this.openai) return true;

    const apiKey = await this.secretManager.getSecret('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      return true;
    }
    return false;
  }

  /**
   * Generates a TestPlan based on user input.
   * Calls GPT-4o with a structured prompt. Falls back to a hardcoded plan if OpenAI is unavailable.
   * 
   * @param userInput Natural language description of the test goal.
   * @returns A Promise resolving to a structured TestPlan.
   */
  async generatePlan(userInput: string): Promise<TestPlan> {
    console.error(`Generating plan for: "${userInput}"`);

    const hasOpenAI = await this.initOpenAI();

    if (hasOpenAI && this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert test automation engineer. Your task is to convert a natural language test goal into a structured JSON TestPlan.
              
The TestPlan consists of a goal and an array of steps. Each step must have:
- id: A unique string identifier.
- description: A clear description of what the step does.
- action: One of 'navigate', 'click', 'type', 'hover', 'assert'.
- params: A JSON object with action-specific parameters:
    - navigate: { url: string }
    - click: { selector: string }
    - type: { selector: string, value: string }
    - hover: { selector: string }
    - assert: { type: 'elementState' | 'text' | 'url', selector?: string, state?: 'visible' | 'hidden', text?: string, url?: string }
- expectedResult: (Optional) What should happen after the step.
- dependsOn: (Optional) An array of step IDs that must be completed before this step.

Ensure the plan follows a logical flow and prerequisite steps (like navigation or login) are correctly mapped in 'dependsOn'.
Output MUST be a valid JSON object matching the TestPlan schema.`
            },
            {
              role: 'user',
              content: `Test Goal: ${userInput}`
            }
          ],
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        if (content) {
          const plan = JSON.parse(content) as TestPlan;
          // Ensure it has an ID if the LLM missed it
          if (!plan.id) plan.id = `plan_${Date.now()}`;
          return plan;
        }
      } catch (error) {
        console.error('Error calling OpenAI API, falling back to hardcoded plan:', error);
      }
    } else {
      console.error('OPENAI_API_KEY not found, using hardcoded plan.');
    }

    // Fallback: Hardcoded "Login and Search" scenario
    return this.getFallbackPlan();
  }

  private getFallbackPlan(): TestPlan {
    return {
      id: `plan_${Date.now()}`,
      goal: "Login to the application and search for a product (Fallback)",
      steps: [
        {
          id: "step_1",
          description: "Navigate to the login page",
          action: "navigate",
          params: { url: "https://example.com/login" },
          expectedResult: "Login page is loaded"
        },
        {
          id: "step_2",
          description: "Enter username",
          action: "type",
          params: { selector: "#username", value: "testuser" },
          dependsOn: ["step_1"],
          expectedResult: "Username field is populated"
        },
        {
          id: "step_3",
          description: "Enter password",
          action: "type",
          params: { selector: "#password", value: "password123" },
          dependsOn: ["step_2"],
          expectedResult: "Password field is populated"
        },
        {
          id: "step_4",
          description: "Click the login button",
          action: "click",
          params: { selector: "button[type='submit']" },
          dependsOn: ["step_3"],
          expectedResult: "User is redirected to the dashboard"
        },
        {
          id: "step_5",
          description: "Verify login successful by checking for search bar",
          action: "assert",
          params: { type: "elementState", selector: "input[name='q']", state: "visible" },
          dependsOn: ["step_4"],
          expectedResult: "Search bar is visible on the dashboard"
        },
        {
          id: "step_6",
          description: "Search for 'laptop'",
          action: "type",
          params: { selector: "input[name='q']", value: "laptop" },
          dependsOn: ["step_5"],
          expectedResult: "Search term is entered"
        },
        {
          id: "step_7",
          description: "Click search button",
          action: "click",
          params: { selector: "button.search-submit" },
          dependsOn: ["step_6"],
          expectedResult: "Search results are displayed"
        },
        {
          id: "step_8",
          description: "Verify search results contain 'laptop'",
          action: "assert",
          params: { type: "text", selector: ".results-list", text: "laptop" },
          dependsOn: ["step_7"],
          expectedResult: "Search results page shows relevant items"
        }
      ]
    };
  }
}

