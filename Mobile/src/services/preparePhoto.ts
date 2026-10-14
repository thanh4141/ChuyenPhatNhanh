import type { ImagePickerAsset } from "expo-image-picker";
export interface PreparedPhoto {
  form: FormData;
  dispose: () => void;
}
export async function preparePhoto(
  asset: ImagePickerAsset,
): Promise<PreparedPhoto> {
  const blob = asset.file || (await (await fetch(asset.uri)).blob());
  if (blob.size > 15 * 1024 * 1024) throw new Error("Ảnh tối đa 15 MB.");
  const form = new FormData();
  form.append("image", blob, asset.fileName || "photo.jpg");
  return { form, dispose: () => {} };
}
