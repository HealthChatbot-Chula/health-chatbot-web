export type HealthMetric = {
  id?: string;
  label: string;
  value: string;
  unit?: string | null;
};

export type PatientProfileForm = {
  sex?: string | null;
  age?: number | null;
  underlyingDiseases: string[];
  currentMedications: string[];
  healthMetrics: HealthMetric[];
};
