import { TestPlan } from '../types';

/**
 * TestPlanner is responsible for converting natural language test descriptions
 * into a structured, executable TestPlan (Directed Acyclic Graph).
 * 
 * ### LLM Prompt Engineering Strategy:
 * To generate this JSON reliably, the LLM prompt should include:
 * 1. **System Instruction**: Explicitly define the role (e.g., "You are a test automation engineer").
 * 2. **Schema Enforcement**: Provide the JSON schema of `TestPlan` and `TestStep` and use techniques like 
 *    JSON-mode or constrained decoding to ensure the output strictly adheres to the TypeScript interfaces.
 * 3. **Step Decomposition**: Instruct the LLM to break down the user goal into atomic actions (navigate, click, type, etc.).
 * 4. **Dependency Mapping**: Require the LLM to populate `dependsOn` arrays to create a valid execution DAG, 
 *    ensuring that prerequisites (like logging in) are completed before subsequent actions.
 * 5. **Spatial/Functional Reasoning**: If visual context (DOM snapshots) is provided, instruct the LLM to 
 *    identify interactive elements and their likely selectors, though initial planning might rely on 
 *    logical descriptions that are later refined.
 * 6. **Few-Shot Examples**: Include examples of natural language inputs and their corresponding JSON TestPlans 
 *    to guide the LLM's understanding of complexity and structure.
 */
export class TestPlanner {
  /**
   * Generates a TestPlan based on user input.
   * Currently returns a placeholder plan for a "Login and Search" scenario.
   * 
   * @param userInput Natural language description of the test goal.
   * @returns A Promise resolving to a structured TestPlan.
   */
  async generatePlan(userInput: string): Promise<TestPlan> {
    console.log(`Generating plan for: "${userInput}"`);

    // Placeholder: Hardcoded "Login and Search" scenario
    const plan: TestPlan = {
      id: `plan_${Date.now()}`,
      goal: "Login to the application and search for a product",
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

    return plan;
  }
}
