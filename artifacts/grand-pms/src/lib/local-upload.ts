/**
 * Local image upload — converts file to data URL (base64) stored in memory.
 * No server required.
 */
export async function uploadImageLocal(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
