import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export async function basicAuthorizer(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  if (!event.authorizationToken) {
    throw new Error('Unauthorized');
  }

  const [, encoded] = event.authorizationToken.split(' ');
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [login, password] = decoded.split(':');

  const storedPassword = process.env[login];
  const effect = storedPassword && storedPassword === password ? 'Allow' : 'Deny';

  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: event.methodArn }],
    },
  };
}
