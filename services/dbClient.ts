/**
 * Legacy browser DB / Cloudinary direct-client module neutralized for security (P0).
 * Direct database URLs and third-party API secrets must never exist in client bundles.
 * All data operations communicate strictly via server endpoints under /api/*.
 */
export const dbClient: any = null;
export const db: any = null;

export const uploadToCloudinary = async (): Promise<string | null> => {
  throw new Error('העלאה ישירה מהדפדפן הוסרה מטעמי אבטחה. יש להעלות דרך השרת.');
};
