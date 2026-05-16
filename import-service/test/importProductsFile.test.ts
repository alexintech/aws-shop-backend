process.env.IMPORT_BUCKET_NAME = "test-bucket";

import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { importProductsFile } from "../lambda/importProductsFile";

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

const makeEvent = (params?: Record<string, string>): APIGatewayProxyEvent =>
  ({ queryStringParameters: params ?? null } as unknown as APIGatewayProxyEvent);

describe("importProductsFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when name query parameter is missing", async () => {
    const result = await importProductsFile(makeEvent(), {} as any, {} as any);

    expect(result).toMatchObject({ statusCode: 400 });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when queryStringParameters is null", async () => {
    const result = await importProductsFile(makeEvent(), {} as any, {} as any);

    expect(result).toMatchObject({ statusCode: 400 });
  });

  it("returns 200 with signed URL when name is provided", async () => {
    const fakeUrl = "https://s3.amazonaws.com/test-bucket/uploaded/products.csv?signed=1";
    mockGetSignedUrl.mockResolvedValue(fakeUrl);

    const result = await importProductsFile(
      makeEvent({ name: "products.csv" }),
      {} as any,
      {} as any
    );

    expect(result).toMatchObject({ statusCode: 200, body: fakeUrl });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("uses uploaded/ prefix in the S3 key", async () => {
    const { PutObjectCommand } = jest.requireMock("@aws-sdk/client-s3");
    mockGetSignedUrl.mockResolvedValue("https://signed-url");

    await importProductsFile(makeEvent({ name: "products.csv" }), {} as any, {} as any);

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "uploaded/products.csv",
    });
  });

  it("returns 500 when getSignedUrl throws", async () => {
    mockGetSignedUrl.mockRejectedValue(new Error("S3 error"));

    const result = await importProductsFile(
      makeEvent({ name: "products.csv" }),
      {} as any,
      {} as any
    );

    expect(result).toMatchObject({ statusCode: 500 });
  });
});
