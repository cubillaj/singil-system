export const  getFirstZodMessage = (error: unknown) => {
  const parsedError = error as { flatten?: () => { fieldErrors: Record<string, string[]> } };
  const fieldErrors = parsedError.flatten?.().fieldErrors;

  return Object.values(fieldErrors ?? {}).flat()[0] ?? "Invalid data";
}