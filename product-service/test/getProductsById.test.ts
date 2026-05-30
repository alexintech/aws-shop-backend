import { APIGatewayProxyEvent } from "aws-lambda";

const mockGet = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocument: { from: jest.fn(() => ({ get: mockGet })) },
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({ DynamoDB: jest.fn() }));

import { getProductsById } from "../lambda/getProductsById";

const makeEvent = (id?: string) =>
  ({ pathParameters: id ? { id } : null } as unknown as APIGatewayProxyEvent);

beforeEach(() => {
  mockGet.mockClear();
});

test("returns 200 with merged product and stock when product exists", async () => {
  mockGet
    .mockResolvedValueOnce({ Item: { id: "1", title: "Product A", price: 10 } })
    .mockResolvedValueOnce({ Item: { product_id: "1", count: 5 } });

  const result = await getProductsById(makeEvent("1"), {} as any, {} as any);

  expect(result).toMatchObject({
    statusCode: 200,
    headers: expect.objectContaining({ "Content-Type": "application/json" }),
  });
  expect(JSON.parse((result as any).body)).toEqual({
    id: "1", title: "Product A", price: 10, count: 5,
  });
});

test("returns 404 when product is not found", async () => {
  mockGet
    .mockResolvedValueOnce({ Item: undefined })
    .mockResolvedValueOnce({ Item: undefined });

  const result = await getProductsById(makeEvent("non-existent"), {} as any, {} as any);

  expect(result).toMatchObject({ statusCode: 404 });
});

test("returns 400 when pathParameters is null", async () => {
  const result = await getProductsById(makeEvent(), {} as any, {} as any);

  expect(result).toMatchObject({ statusCode: 400 });
});

test("returns 500 when DynamoDB throws", async () => {
  mockGet
    .mockRejectedValueOnce(new Error("DynamoDB error"))
    .mockResolvedValueOnce({ Item: undefined });

  const result = await getProductsById(makeEvent("1"), {} as any, {} as any);

  expect(result).toMatchObject({ statusCode: 500 });
});
