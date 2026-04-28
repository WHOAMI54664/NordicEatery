import dotenv from "dotenv";
import * as deepl from "deepl-node";
import fs from "fs";
import path from "path";

// 🔥 грузим .env.local
dotenv.config({ path: ".env.local" });

const authKey = process.env.DEEPL_API_KEY;

if (!authKey) {
  throw new Error("Missing DEEPL_API_KEY");
}

const translator = new deepl.Translator(authKey);

// 📂 исходный файл
const sourceFile = path.join(process.cwd(), "messages", "en.json");

// 🌍 языки (только нужные)
const targets = [
  { file: "sv.json", lang: "SV" },
  { file: "pl.json", lang: "PL" },
  { file: "ru.json", lang: "RU" },
];

// 🔧 flatten (чтобы DeepL понимал структуру)
function flatten(obj: any, prefix = ""): Record<string, string> {
  return Object.keys(obj).reduce((acc: Record<string, string>, key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      acc[newKey] = value;
    } else {
      Object.assign(acc, flatten(value, newKey));
    }

    return acc;
  }, {});
}

// 🔧 обратно в JSON
function unflatten(obj: Record<string, string>) {
  const result: any = {};

  for (const key in obj) {
    const parts = key.split(".");
    let current = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = obj[key];
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    });
  }

  return result;
}

async function main() {
  console.log("🚀 Translating...");

  const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const flat = flatten(source);

  const keys = Object.keys(flat);
  const texts = Object.values(flat);

  for (const target of targets) {
    console.log(`🌍 Translating to ${target.lang}...`);

    const translated = await translator.translateText(
      texts,
      "EN",
      target.lang as deepl.TargetLanguageCode
    );

    const result: Record<string, string> = {};

    keys.forEach((key, index) => {
      result[key] = Array.isArray(translated)
        ? translated[index].text
        : translated.text;
    });

    const outputPath = path.join(process.cwd(), "messages", target.file);

    fs.writeFileSync(
      outputPath,
      JSON.stringify(unflatten(result), null, 2)
    );

    console.log(`✅ Created ${target.file}`);
  }

  console.log("🎉 Done!");
}

main();