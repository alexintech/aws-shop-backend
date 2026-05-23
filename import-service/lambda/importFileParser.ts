import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Handler } from "aws-lambda";
import { Readable } from "stream";
import csvParser from "csv-parser";

const s3Client = new S3Client();

export const importFileParser: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    // the Body property returned by the GetObjectCommand is a readable stream in aws-sdk v3
    const { Body } = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    await new Promise<void>((resolve, reject) => {
      (Body as Readable)
        .pipe(csvParser())
        .on("data", (row: Record<string, string>) => console.log("Parsed record:", JSON.stringify(row)))
        .on("end", resolve)
        .on("error", reject);
    });

    const parsedKey = key.replace("uploaded/", "parsed/");

    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: parsedKey,
      })
    );

    await s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );

    console.log(`Moved ${key} to ${parsedKey}`);
  }
};
