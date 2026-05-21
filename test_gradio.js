import { Client } from "@gradio/client";

async function run() {
  try {
    const app = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On");
    const info = await app.view_api();
    console.log("API Info:", info);
  } catch(e) {
    console.error(e);
  }
}
run();
