require("ts-node/register");

const fs = require("fs");
const path = require("path");

function collectSpecFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSpecFiles(fullPath);
    }

    return entry.name.endsWith(".spec.ts") ? [fullPath] : [];
  });
}

for (const file of collectSpecFiles(path.resolve(__dirname, "../src"))) {
  require(file);
}
