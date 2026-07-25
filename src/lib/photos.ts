import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// Mirrors fileToCompressedDataURL() in CampTrack/js/ui.js — downscale +
// compress so several photos stay well under upload limits.
export async function pickAndCompressPhotos(maxDim = 900, quality = 0.75): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];

  const out: string[] = [];
  for (const asset of result.assets) {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: maxDim } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (manipulated.base64) out.push(`data:image/jpeg;base64,${manipulated.base64}`);
  }
  return out;
}
