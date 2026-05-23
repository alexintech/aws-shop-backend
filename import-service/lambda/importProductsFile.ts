import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyHandler } from "aws-lambda";

const IMPORT_BUCKET_NAME = process.env.IMPORT_BUCKET_NAME || '';
const headers = {
  "Access-Control-Allow-Origin": "*",
};

const s3Client = new S3Client();

export const importProductsFile: APIGatewayProxyHandler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2));
  
  try {
    const filename = event.queryStringParameters?.name || '';
    
    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ code: 400, message: "No 'name' query parameter" }),
      }
    }

    const command = new PutObjectCommand({
      Bucket: IMPORT_BUCKET_NAME,
      Key: `uploaded/${filename}`,
    })

    const signedUrl = await getSignedUrl(s3Client, command);
    
    return {
      statusCode: 200,
      headers,
      body: signedUrl,
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
}
