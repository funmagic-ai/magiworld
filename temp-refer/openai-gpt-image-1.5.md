With the Responses API, you can provide input images in 3 different ways:

By providing a fully qualified URL
By providing an image as a Base64-encoded data URL
By providing a file ID (created with the Files API)
Create a File
Create a base64 encoded image
Edit an image
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

const prompt = `Generate a photorealistic image of a gift basket on a white background 
labeled 'Relax & Unwind' with a ribbon and handwriting-like font, 
containing all the items in the reference pictures.`;

const base64Image1 = encodeImage("body-lotion.png");
const base64Image2 = encodeImage("soap.png");
const fileId1 = await createFile("body-lotion.png");
const fileId2 = await createFile("incense-kit.png");


const response = await openai.responses.create({
  model: "gpt-4.1",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${base64Image1}`,
        },
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${base64Image2}`,
        },
        {
          type: "input_image",
          file_id: fileId1,
        },
        {
          type: "input_image",
          file_id: fileId2,
        },
      ],
    },
  ],
  tools: [{type: "image_generation"}],
});

const imageData = response.output
  .filter((output) => output.type === "image_generation_call")
  .map((output) => output.result);

if (imageData.length > 0) {
  const imageBase64 = imageData[0];
  const fs = await import("fs");
  fs.writeFileSync("gift-basket.png", Buffer.from(imageBase64, "base64"));
} else {
  console.log(response.output.content);
}