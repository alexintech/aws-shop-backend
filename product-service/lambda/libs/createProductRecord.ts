import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Product, Stock, AvailableProduct, AvailableProductSchema } from "../models/Product";

export const createProductRecord = async (
  db: DynamoDBDocument,
  productsTableName: string,
  stocksTableName: string,
  data: unknown
): Promise<AvailableProduct & { id: string }> => {
  const validated = await AvailableProductSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  const { count, ...productData } = validated;
  const id = uuidv4();

  const product: Product = { ...productData, id };
  const stock: Stock = { product_id: id, count };

  await db.transactWrite({
    TransactItems: [
      { Put: { TableName: productsTableName, Item: product } },
      { Put: { TableName: stocksTableName, Item: stock } },
    ],
  });

  return { ...validated, id };
};
