export const success = (body: any) => {
  return buildResponse(200, body);
};

export const created = (body: any = {}) => {
  return buildResponse(201, body);
};

export const bad = (body: any) => {
  return buildResponse(400, body);
};

export const notfound = (body: any) => {
  return buildResponse(404, body);
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
