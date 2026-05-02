import { APIGatewayProxyEvent } from "aws-lambda";
import { getProductsById } from "../lambda/getProductsById";
import { availableProducts } from "../lambda/mocks/data";

const makeEvent = (id?: string) =>
  ({
    pathParameters: id ? { id } : null,
  } as unknown as APIGatewayProxyEvent);

const existingProduct = availableProducts[0];

test("returns 200 with the product when a valid ID is given", async () => {
  const result = await getProductsById(makeEvent(existingProduct.id), {} as any, {} as any);
  expect(result).toMatchObject({
    statusCode: 200,
    headers: expect.objectContaining({ "Content-Type": "application/json" }),
  });
  expect(JSON.parse((result as any).body)).toEqual(existingProduct);
});

test("returns 404 with error message when ID does not match any product", async () => {
  const result = await getProductsById(makeEvent("non-existent-id"), {} as any, {} as any);
  expect(result).toMatchObject({ statusCode: 404 });
});

test("returns 404 with error message when pathParameters is null", async () => {
  const result = await getProductsById(makeEvent(), {} as any, {} as any);
  expect(result).toMatchObject({ statusCode: 404 });
});
