import fs from "fs";

fs.readFile("./dist/index.d.ts", "utf8", (err, data) => {
  if (err) throw err;
  const code = data.replace(
    `import { ParrotConfig, PlaceholderKey } from "../Parrot.Types";`,
    `import { ParrotConfig, PlaceholderKey } from "../../../Parrot.Types";`
  );
  // write the new file
  fs.writeFile("./dist/index.d.ts", code, function (err) {
    if (err) throw err;
    console.log("index.d.ts updated");
  });
});
