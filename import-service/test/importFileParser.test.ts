process.env.IMPORT_BUCKET_NAME = "test-bucket";
process.env.CATALOG_ITEMS_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789/catalogItemsQueue";

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

jest.mock("@aws-sdk/client-sqs", () => {
  const send = jest.fn();
  return {
    __mockSqsSend: send,
    SQSClient: jest.fn().mockImplementation(() => ({ send })),
    SendMessageCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

const { __mockSend: mockSend, CopyObjectCommand, DeleteObjectCommand } =
  jest.requireMock("@aws-sdk/client-s3") as {
    __mockSend: jest.Mock;
    CopyObjectCommand: jest.Mock;
    DeleteObjectCommand: jest.Mock;
  };

const { __mockSqsSend: mockSqsSend, SendMessageCommand } =
  jest.requireMock("@aws-sdk/client-sqs") as {
    __mockSqsSend: jest.Mock;
    SendMessageCommand: jest.Mock;
  };

const makeEvent = (bucket: string, key: string): S3Event =>
  ({
    Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
  } as unknown as S3Event);

const makeReadable = (content: string): Readable => Readable.from([content]);

describe("importFileParser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSqsSend.mockResolvedValue({});
  });

  it("sends each CSV row to SQS", async () => {
    const csv = "title,description,price,count\nProduct A,desc,10,5\nProduct B,other,20,3";
    mockSend.mockResolvedValueOnce({ Body: makeReadable(csv) });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    await importFileParser(makeEvent("test-bucket", "uploaded/products.csv"), {} as any, {} as any);

    expect(mockSqsSend).toHaveBeenCalledTimes(2);
    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789/catalogItemsQueue",
      MessageBody: JSON.stringify({ title: "Product A", description: "desc", price: 10, count: 5 }),
    });
    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789/catalogItemsQueue",
      MessageBody: JSON.stringify({ title: "Product B", description: "other", price: 20, count: 3 }),
    });
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

  it("throws when SendMessageCommand fails", async () => {
    const csv = "title\nProduct A";
    mockSend.mockResolvedValueOnce({ Body: makeReadable(csv) });
    mockSqsSend.mockRejectedValueOnce(new Error("SQS send error"));

    await expect(
      importFileParser(makeEvent("test-bucket", "uploaded/products.csv"), {} as any, {} as any)
    ).rejects.toThrow("SQS send error");
  });
});
