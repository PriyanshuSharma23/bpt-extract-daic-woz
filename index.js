const axios = require("axios");
const fs = require("fs");
const { rm: rmPromise } = require("fs/promises");
const tar = require("tar");
const path = require("path");

const entries = require("./entries.json");
const tempLocation = path.join("temp.tar.gz");
const audioSaveFolder = "./audio";

if (!fs.existsSync(audioSaveFolder)) {
  fs.mkdirSync(audioSaveFolder); // Create the folder if it doesn't exist
}

async function processTar(filePath) {
  await tar.x({
    file: filePath,
    cwd: audioSaveFolder, // Extract to the audio folder
    filter: (path) => {
      return (
        path.endsWith("_AUDIO.wav") ||
        path.endsWith("_Transcript.csv") ||
        path.includes("openSMILE") ||
        path.includes("densenet201") ||
        path.includes("vgg16")
      );
    },
  });
}

async function processEntry(entry, index) {
  try {
    console.log(`Processing entry ${index + 1}: ${entry}`);

    const entryNo = entry.split("/").at(-1).split("_").at(0);

    // Check if the extraction folder already exists
    if (fs.existsSync(`./audio/${entryNo}_P`)) {
      console.log(`Folder for Entry ${index + 1} already exists, skipping...`);
      return; // Return early and skip the entry
    }

    // Download the .tar.gz file
    const response = await axios({
      method: "GET",
      url: entry, // Replace with the correct field for the URL in your JSON
      responseType: "stream",
    });

    // Get the total length of the file for progress calculation
    const totalLength = response.headers["content-length"];

    let downloadedLength = 0;

    // Save the downloaded file
    const writer = fs.createWriteStream(tempLocation);
    response.data.pipe(writer);

    response.data.on("data", (chunk) => {
      downloadedLength += chunk.length;

      // Calculate and print progress
      const percentage = ((downloadedLength / totalLength) * 100).toFixed(2);
      process.stdout.write(`Downloading Entry ${index + 1}: ${percentage}%\r`);
    });
    // Save the downloaded file

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await processTar(tempLocation);

    // Extract audio files (e.g., .wav) from the tarball
    console.log(`Extracted audio for entry ${index + 1}`);
  } catch (err) {
    console.error(`Error processing entry ${index + 1}:`, err.toString());
  } finally {
    // Delete the temporary file
    try {
      await rmPromise(tempLocation);
      console.log(`Temp file for entry ${index + 1} deleted`);
    } catch (err) {
      if (err) {
        console.error(`Error deleting temp file for entry ${index + 1}:`, err);
      }
    }
  }
}

// const pathToTar = "./300_P.tar.gz";
//
// processTar(pathToTar).then(() => {
//   process.exit(0);
// });
//

async function processAllEntries() {
  for (let i = 0; i < entries.length; i++) {
    await processEntry(entries[i], i); // Process each entry
  }
}

processAllEntries().then(() => {
  process.exit(0);
});
