import { APIGatewayProxyEvent } from "aws-lambda";

const mockScan = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocument: { from: jest.fn(() => ({ scan: mockScan })) },
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({ DynamoDB: jest.fn() }));

import { getProductsList } from "../lambda/getProductsList";

const mockEvent = {} as APIGatewayProxyEvent;

beforeEach(() => {
  mockScan.mockClear();
});

test("returns 200 with merged products and stocks", async () => {
  mockScan
    .mockResolvedValueOnce({ Items: [{ id: "1", title: "Product A", description: "Desc", price: 10 }] })
    .mockResolvedValueOnce({ Items: [{ product_id: "1", count: 5 }] });

  const result = await getProductsList(mockEvent, {} as any, {} as any);

  expect(result).toMatchObject({
    statusCode: 200,
    headers: expect.objectContaining({ "Content-Type": "application/json" }),
  });
  expect(JSON.parse((result as any).body)).toEqual([
    { id: "1", title: "Product A", description: "Desc", price: 10, count: 5 },
  ]);
});

test("returns count 0 when no matching stock exists", async () => {
  mockScan
    .mockResolvedValueOnce({ Items: [{ id: "1", title: "Product A", price: 10 }] })
    .mockResolvedValueOnce({ Items: [] });

  const result = await getProductsList(mockEvent, {} as any, {} as any);

  expect(result).toMatchObject({ statusCode: 200 });
  expect(JSON.parse((result as any).body)).toEqual([
    { id: "1", title: "Product A", price: 10, count: 0 },
  ]);
});

test("returns 500 when DynamoDB throws", async () => {
  // Both scan calls run in Promise.all — provide resolved value for the second
  // to avoid an unhandled rejection crashing the worker
  mockScan
    .mockRejectedValueOnce(new Error("DynamoDB error"))
    .mockResolvedValueOnce({ Items: [] });

  const result = await getProductsList(mockEvent, {} as any, {} as any);

  expect(result).toMatchObject({ statusCode: 500 });
});
