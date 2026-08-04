import fs from "fs";
import path from "path";
import sharp from "sharp";

const textureDir = "public/assest/assets3d/Textures";

async function convertTifs() {
  const files = fs.readdirSync(textureDir);
  for (const file of files) {
    if (
      file.toLowerCase().endsWith(".tif") ||
      file.toLowerCase().endsWith(".tiff")
    ) {
      const inputPath = path.join(textureDir, file);
      const outputPath = path.join(
        textureDir,
        file.replace(/\.tiff?$/i, ".png"),
      );
      console.log(`Converting ${file} to ${path.basename(outputPath)}...`);
      try {
        await sharp(inputPath).toFormat("png").toFile(outputPath);
        console.log(`Successfully converted ${file}`);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err);
      }
    }
  }
}

convertTifs();
