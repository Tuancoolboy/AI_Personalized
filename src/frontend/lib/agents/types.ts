export type AgentName =
  | "tutor"
  | "grader"
  | "recommender"
  | "manager-analytics";

export type AgentContext = {
  organizationId: string | null;
  userId: string;
  requestId?: string;
};

export type AgentCapability<I, O> = {
  name: AgentName;
  execute(input: I, context: AgentContext): Promise<O>;
};
