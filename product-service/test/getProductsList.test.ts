import { APIGatewayProxyEvent } from "aws-lambda";
import { getProductsList } from "../lambda/getProductsList";
import { availableProducts } from "../lambda/mocks/data";

const mockEvent = {} as APIGatewayProxyEvent;

test("returns 200 with all available products", async () => {
  const result = await getProductsList(mockEvent, {} as any, {} as any);
  expect(result).toMatchObject({
    statusCode: 200,
    headers: expect.objectContaining({ "Content-Type": "application/json" }),
  });
  expect(JSON.parse((result as any).body)).toEqual(availableProducts);
});
