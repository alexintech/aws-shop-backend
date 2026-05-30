import { SQSEvent, SQSRecord } from "aws-lambda";

const mockTransactWrite = jest.fn().mockResolvedValue({});
const mockSnsSend = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocument: {
    from: jest.fn(() => ({
      transactWrite: mockTransactWrite,
    })),
  },
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDB: jest.fn(),
}));

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: mockSnsSend })),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const { PublishCommand } = jest.requireMock("@aws-sdk/client-sns") as {
  PublishCommand: jest.Mock;
};

import { catalogBatchProcess } from "../lambda/catalogBatchProcess";

const makeSQSEvent = (bodies: object[]): SQSEvent => ({
  Records: bodies.map((body, i) => ({
    body: JSON.stringify(body),
  } as SQSRecord)),
});

beforeEach(() => {
  mockTransactWrite.mockClear();
  mockSnsSend.mockClear();
  PublishCommand.mockClear();
});

test("processes valid records and writes to DynamoDB", async () => {
  const event = makeSQSEvent([
    { title: "Product A", description: "Desc", price: 10, count: 5 },
    { title: "Product B", price: 20, count: 0 },
  ]);

  await catalogBatchProcess(event, {} as any, {} as any);

  expect(mockTransactWrite).toHaveBeenCalledTimes(2);

  const firstCall = mockTransactWrite.mock.calls[0][0];
  expect(firstCall.TransactItems).toHaveLength(2);
  expect(firstCall.TransactItems[0].Put.Item).toMatchObject({ title: "Product A", price: 10 });
  expect(firstCall.TransactItems[0].Put.Item.id).toBeDefined();
  expect(firstCall.TransactItems[1].Put.Item).toMatchObject({ product_id: firstCall.TransactItems[0].Put.Item.id, count: 5 });
});

test("publishes one SNS message per product with price MessageAttribute", async () => {
  const event = makeSQSEvent([
    { title: "Product A", description: "Desc", price: 10, count: 5 },
    { title: "Product B", price: 200, count: 3 },
  ]);

  await catalogBatchProcess(event, {} as any, {} as any);

  expect(mockSnsSend).toHaveBeenCalledTimes(2);
  expect(PublishCommand).toHaveBeenCalledWith(expect.objectContaining({
    MessageAttributes: { price: { DataType: 'Number', StringValue: '10' } },
  }));
  expect(PublishCommand).toHaveBeenCalledWith(expect.objectContaining({
    MessageAttributes: { price: { DataType: 'Number', StringValue: '200' } },
  }));
});

test("skips invalid records without throwing", async () => {
  const event = makeSQSEvent([
    { title: "Valid", price: 10, count: 1 },
    { price: -5 },
    { title: "Also Valid", price: 30, count: 2 },
  ]);

  await expect(catalogBatchProcess(event, {} as any, {} as any)).resolves.not.toThrow();

  expect(mockTransactWrite).toHaveBeenCalledTimes(2);
  expect(mockSnsSend).toHaveBeenCalledTimes(2);
});

test("skips records with malformed JSON body without throwing", async () => {
  const event: SQSEvent = {
    Records: [{ messageId: "bad", receiptHandle: "", body: "not-json", attributes: {} as any, messageAttributes: {}, md5OfBody: "", eventSource: "aws:sqs", eventSourceARN: "", awsRegion: "us-east-1" }],
  };

  await expect(catalogBatchProcess(event, {} as any, {} as any)).resolves.not.toThrow();

  expect(mockTransactWrite).not.toHaveBeenCalled();
  expect(mockSnsSend).not.toHaveBeenCalled();
});

