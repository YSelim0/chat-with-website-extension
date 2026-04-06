export type ProviderModelSummary = {
  description: string;
  id: string;
  isFree?: boolean;
  label: string;
  providerName?: string;
};

export type ListOpenRouterModelsResponse =
  | {
      models: ProviderModelSummary[];
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };
