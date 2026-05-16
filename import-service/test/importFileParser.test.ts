process.env.IMPORT_BUCKET_NAME = "test-bucket";

import { S3Event } from "aws-lambda";
import { Readable } from "stream";
import { importFileParser } from "../lambda/importFileParser";

jest.mock("@aws-sdk/client-s3", () => {
  const send = jest.fn();
  return {
    __mockSend: send,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    CopyObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

const { __mockSend: mockSend, CopyObjectCommand, DeleteObjectCommand } =
  jest.requireMock("@aws-sdk/client-s3") as {
    __mockSend: jest.Mock;
    CopyObjectCommand: jest.Mock;
    DeleteObjectCommand: jest.Mock;
  };

const makeEvent = (bucket: string, key: string): S3Event =>
  ({
    Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
  } as unknown as S3Event);

const makeReadable = (content: string): Readable => Readable.from([content]);

describe("importFileParser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses CSV records and logs each row", async () => {
    const csv = "name,price\nProduct A,10\nProduct B,20";
    mockSend.mockResolvedValueOnce({ Body: makeReadable(csv) });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await importFileParser(makeEvent("test-bucket", "uploaded/products.csv"), {} as any, {} as any);

    expect(consoleSpy).toHaveBeenCalledWith("Parsed record:", JSON.stringify({ name: "Product A", price: "10" }));
    expect(consoleSpy).toHaveBeenCalledWith("Parsed record:", JSON.stringify({ name: "Product B", price: "20" }));

    consoleSpy.mockRestore();
  });

  it("moves the file to parsed/ folder", async () => {
    mockSend.mockResolvedValueOnce({ Body: makeReadable("name\nA") });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    await importFileParser(makeEvent("test-bucket", "uploaded/products.csv"), {} as any, {} as any);

    expect(CopyObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      CopySource: "test-bucket/uploaded/products.csv",
      Key: "parsed/products.csv",
    });
    
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "uploaded/products.csv",
    });
  });

  it("throws when GetObjectCommand fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("S3 read error"));

    await expect(
      importFileParser(makeEvent("test-bucket", "uploaded/products.csv"), {} as any, {} as any)
    ).rejects.toThrow("S3 read error");
  });
});
