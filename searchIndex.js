import chalk from "chalk";
import * as fs from "fs";
import { dirname, extname } from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { defineArgs, print, printProgress } from "./helper.js";

process.stdout.write("\x1Bc");

defineArgs("key", "path", "allowExt", "output");

const search = key;

if (search == "" || !search) {
  throw new Error("Parameter search tidak boleh kosong!");
}

if (path == "" || !path) {
  throw new Error("Parameter path tidak boleh kosong!");
}

if (allowExt == "" || !allowExt) {
  throw new Error("Parameter allowExt tidak boleh kosong!");
}

const init = async (path, allowExt, search) => {
  const data = [];

  // Ambil file include
  await walkRead(path, allowExt, search, data);

  if (data.length > 0) {
    const localPath = dirname(fileURLToPath(import.meta.url));
    let exportedPath = localPath + "/exported";
    let isDirExist = fs.existsSync(exportedPath);

    // jika belum ada buat direktori baru
    if (!isDirExist) {
      fs.mkdirSync(exportedPath);
    }

    // Hanya mapping path
    const paths = data
      .map((v) => {
        return v.path;
      })
      .join("\n");

    if (output) {
      exportedPath = exportedPath + "/" + output;
    } else {
      exportedPath =
        exportedPath +
        `/${search}_${(Math.random() + 1).toString(36).substring(7)}`;
    }

    isDirExist = fs.existsSync(exportedPath);

    if (!isDirExist) {
      await fs.promises.mkdir(exportedPath);
      fs.writeFileSync(
        exportedPath + "/detail.json",
        JSON.stringify(data, null, 2)
      );
      fs.writeFileSync(exportedPath + "/path.txt", paths);
    }

    print.success(
      "\n\nSuccessfully exported " + data.length + " line to " + exportedPath
    );
  } else {
    print.warn("\nKey didn't match!");
  }
};

const walkRead = async (path, allowExt, search, exported) => {
  const filePaths = fs.readdirSync(path);
  for await (let filePath of filePaths) {
    const originalPath = filePath;
    filePath = path + "/" + filePath;
    const isDirectory = fs.lstatSync(filePath).isDirectory();
    // Jika directory maka panggil recursive
    if (isDirectory) {
      await walkRead(filePath, allowExt, search, exported);
      continue;
    } else {
      const extName = extname(originalPath);
      // Jika file extension sesuai
      if (extName.includes(allowExt) && extName !== "") {
        printProgress(
          chalk.blue("Analyze file " + filePath.replace("../", ""))
        );

        const fileStream = fs.createReadStream(filePath);
        const lines = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        const data = {
          path: filePath.replace("../", ""),
          original: originalPath,
          details: [],
        };

        let index = 1;

        for await (const line of lines) {
          // Hanya ambil yang sesuai pencarian
          if (line.toLowerCase().includes(search.toLowerCase())) {
            const detail = {};
            detail.line = index;
            detail.search = search;
            detail.content = `Line ${index}: ${line.trim()}`;
            data.details.push(detail);
          }

          index++;
        }

        if (data.details.length > 0) {
          exported.push(data);
        }
        continue;
      }
    }
  }
};

init(path, allowExt, search);