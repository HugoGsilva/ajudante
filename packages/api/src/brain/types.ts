export type CategoryMapInput = {
  index: number;
  description: string;
  amountCents: number;
  kind: "expense" | "income";
};

export type BrainServices = {
  mapCategories: (rows: CategoryMapInput[]) => Promise<{ index: number; categoryId: string }[]>;
};
