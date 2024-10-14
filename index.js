const axios = require("axios");
const fs = require("fs");
const tar = require("tar");
const path = require("path");

const entries = require("./entries.json");
const tempLocation = path.join("temp.tar.gz");
const audioSaveFolder = "./audio";

if (!fs.existsSync(audioSaveFolder)) {
  fs.mkdirSync(audioSaveFolder); // Create the folder if it doesn't exist
}

async function processEntry(entry, index) {
  try {
    console.log(`Processing entry ${index + 1}: ${entry}`);

    // Download the .tar.gz file
    const response = await axios({
      method: "GET",
      url: entry, // Replace with the correct field for the URL in your JSON
      responseType: "stream",
    });

    // Save the downloaded file
    const writer = fs.createWriteStream(tempLocation);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Extract audio files (e.g., .wav) from the tarball
    await tar.x({
      file: tempLocation,
      cwd: audioSaveFolder, // Extract to the audio folder
      filter: (path) => path.endsWith(".wav"), // Only extract audio files
    });

    console.log(`Extracted audio for entry ${index + 1}`);
  } catch (err) {
    console.error(`Error processing entry ${index + 1}:`, err.toString());
  } finally {
    // Delete the temporary file
    fs.rm(tempLocation, (err) => {
      if (err) {
        console.error(`Error deleting temp file for entry ${index + 1}:`, err);
      } else {
        console.log(`Temp file for entry ${index + 1} deleted`);
      }
    });
  }
}

async function processAllEntries() {
  for (let i = 0; i < entries.length; i++) {
    await processEntry(entries[i], i); // Process each entry
  }
}

processAllEntries().then(() => {
  process.exit(0);
});
