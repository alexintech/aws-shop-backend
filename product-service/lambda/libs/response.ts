export const success = (body: any) => {
  return buildResponse(200, body);
};

export const failure = (body: any) => {
  return buildResponse(500, body);
};

const buildResponse = (statusCode: number, body: any) => ({
  statusCode: statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});
